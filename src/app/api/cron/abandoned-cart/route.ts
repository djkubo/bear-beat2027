/**
 * Cron: Recuperación de carrito abandonado ("El Cerrador").
 * Usuarios registrados hace > 1h y < 24h sin compras: email + SMS y se marca en DB para no spamear.
 *
 * Llamar por Cron (Render, Vercel Cron, etc.) o manualmente:
 *   GET/POST /api/cron/abandoned-cart
 * Opcional: ?secret=CRON_SECRET si defines CRON_SECRET en env.
 *
 * Requiere en Supabase la tabla:
 *   create table if not exists public.abandoned_cart_reminders (
 *     user_id uuid primary key references public.users(id) on delete cascade,
 *     sent_at timestamptz default now()
 *   );
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAbandonedCartEmail } from '@/lib/brevo-email'
import { sendSms } from '@/lib/brevo-sms'
import type { Database } from '@/types/database'

const CRON_SECRET = (process.env.CRON_SECRET || '').trim()
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
const CHECKOUT_LINK = APP_URL ? `${APP_URL}/checkout?pack=enero-2026` : ''

export async function GET(req: NextRequest) {
  return runAbandonedCart(req)
}

export async function POST(req: NextRequest) {
  return runAbandonedCart(req)
}

async function runAbandonedCart(req: NextRequest) {
  // En producción, SIEMPRE requerir secret para evitar abuso/costos (SMS/email masivo).
  if (process.env.NODE_ENV === 'production' && !CRON_SECRET) {
    return NextResponse.json(
      { error: 'CRON_SECRET no configurado en el servidor' },
      { status: 503 }
    )
  }
  if (CRON_SECRET) {
    const authHeader = req.headers.get('authorization')
    const secret = authHeader?.replace(/^Bearer\s+/i, '') || req.nextUrl.searchParams.get('secret')
    if (secret !== CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Usuarios creados entre 1h y 24h atrás
  const { data: users, error: usersErr } = await (admin as any)
    .from('users')
    .select('id, email, name, phone')
    .lt('created_at', oneHourAgo)
    .gt('created_at', twentyFourHoursAgo)

  if (usersErr) {
    console.error('[abandoned-cart] users query error:', usersErr)
    return NextResponse.json({ error: usersErr.message, ok: false }, { status: 500 })
  }

  if (!users?.length) {
    return NextResponse.json({ ok: true, processed: 0, message: 'No users in window' })
  }

  // user_ids que ya tienen al menos una compra
  const { data: purchases } = await (admin as any).from('purchases').select('user_id')
  const hasPurchase = new Set((purchases || []).map((p: { user_id: string }) => p.user_id))

  // user_ids a los que ya les enviamos recordatorio
  const { data: sent } = await (admin as any).from('abandoned_cart_reminders').select('user_id')
  const alreadySent = new Set((sent || []).map((s: { user_id: string }) => s.user_id))

  const toProcess = users.filter(
    (u: { id: string }) => !hasPurchase.has(u.id) && !alreadySent.has(u.id)
  )

  if (toProcess.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'No users to remind' })
  }

  const results: { userId: string; email: boolean; sms: boolean; error?: string }[] = []

  for (const user of toProcess) {
    const email = (user.email || '').trim()
    const name = (user.name || '').trim() || undefined
    const phone = (user.phone || '').trim()
    let emailOk = false
    let smsOk = false

    if (CHECKOUT_LINK && email) {
      const emailRes = await sendAbandonedCartEmail({
        to: email,
        name,
        checkoutUrl: CHECKOUT_LINK,
      })
      emailOk = emailRes.success
      if (!emailRes.success) {
        results.push({ userId: user.id, email: false, sms: false, error: emailRes.error })
        continue
      }
    }

    const smsBody = `BearBeat: 🐺 ¿Te vas a quedar fuera? Tu cuenta está creada pero vacía. Tu competencia ya está descargando. Activa tu arsenal aquí: ${CHECKOUT_LINK || '[checkout]'}`
    if (phone) {
      const smsRes = await sendSms(phone, smsBody, undefined, { tag: 'abandoned_cart' })
      smsOk = smsRes.success
    }

    results.push({ userId: user.id, email: emailOk, sms: smsOk })

    // Marcar como enviado para no spamear
    await (admin as any).from('abandoned_cart_reminders').upsert(
      { user_id: user.id, sent_at: new Date().toISOString() } as Database['public']['Tables']['abandoned_cart_reminders']['Insert'],
      { onConflict: 'user_id' }
    )
  }

  return NextResponse.json({
    ok: true,
    processed: toProcess.length,
    results,
  })
}
