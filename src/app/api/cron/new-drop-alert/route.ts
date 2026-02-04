/**
 * Cron: "La Alerta de Nuevo Drop" (mensual).
 * Envía SMS a usuarios con al menos una compra y teléfono, avisando del nuevo pack.
 * FOMO / recurrencia. No se envía dos veces el mismo drop por usuario (drop_alerts_sent).
 *
 * Llamar 1 vez al mes (manual o Cron):
 *   GET/POST /api/cron/new-drop-alert?month=FEBRERO&pack=febrero-2026&videoCount=150+
 * Opcional: ?secret=CRON_SECRET si defines CRON_SECRET en env.
 *
 * Parámetros (query o body en POST):
 *   month    – Ej. FEBRERO (para el texto "DROP FEBRERO CONFIRMADO")
 *   pack     – Slug del pack, ej. febrero-2026 (para el link y como drop_key idempotencia)
 *   videoCount – Ej. 150+ (opcional, default 150+)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/brevo-sms'
import type { Database } from '@/types/database'

const CRON_SECRET = (process.env.CRON_SECRET || '').trim()
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')

export async function GET(req: NextRequest) {
  return runNewDropAlert(req)
}

export async function POST(req: NextRequest) {
  return runNewDropAlert(req)
}

async function runNewDropAlert(req: NextRequest) {
  if (CRON_SECRET) {
    const authHeader = req.headers.get('authorization')
    const secret =
      authHeader?.replace(/^Bearer\s+/i, '') ||
      req.nextUrl.searchParams.get('secret')
    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { searchParams } = req.nextUrl
  let month = searchParams.get('month') || 'FEBRERO'
  let pack = searchParams.get('pack') || 'febrero-2026'
  let videoCount = searchParams.get('videoCount') || '150+'

  if (req.method === 'POST') {
    try {
      const body = await req.json().catch(() => ({}))
      if (body.month) month = String(body.month).trim()
      if (body.pack) pack = String(body.pack).trim()
      if (body.videoCount) videoCount = String(body.videoCount).trim()
    } catch {
      // keep query params
    }
  }

  const dropKey = pack
  const link = APP_URL ? `${APP_URL}/checkout?pack=${encodeURIComponent(pack)}` : ''
  const smsBody = `BearBeat: 💿 DROP ${month.toUpperCase()} CONFIRMADO. ${videoCount} Nuevos Videos ya disponibles. Entra antes de que se sature el servidor: ${link}`

  const admin = createAdminClient()

  // user_ids con al menos una compra
  const { data: purchases } = await (admin as any)
    .from('purchases')
    .select('user_id')
  const buyerIds = [...new Set((purchases || []).map((p: { user_id: string }) => p.user_id))]

  if (buyerIds.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      message: 'No hay compradores',
      dropKey,
    })
  }

  // Usuarios compradores con teléfono
  const { data: users, error: usersErr } = await (admin as any)
    .from('users')
    .select('id, phone')
    .in('id', buyerIds)
    .not('phone', 'is', null)

  if (usersErr) {
    console.error('[new-drop-alert] users query error:', usersErr)
    return NextResponse.json(
      { error: usersErr.message, ok: false },
      { status: 500 }
    )
  }

  const withPhone = (users || []).filter(
    (u: { phone: string | null }) => u.phone && String(u.phone).trim().length > 0
  )

  if (withPhone.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      message: 'Ningún comprador con teléfono',
      dropKey,
    })
  }

  // Quién ya recibió este drop
  const { data: alreadySent } = await (admin as any)
    .from('drop_alerts_sent')
    .select('user_id')
    .eq('drop_key', dropKey)
  const sentSet = new Set((alreadySent || []).map((s: { user_id: string }) => s.user_id))

  const toProcess = withPhone.filter((u: { id: string }) => !sentSet.has(u.id))

  if (toProcess.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      message: 'Todos los compradores con teléfono ya recibieron esta alerta',
      dropKey,
    })
  }

  const results: { userId: string; ok: boolean; error?: string }[] = []

  for (const user of toProcess) {
    const phone = String(user.phone).trim()
    const res = await sendSms(phone, smsBody, undefined, {
      tag: 'new_drop',
    })
    results.push({
      userId: user.id,
      ok: res.success,
      error: res.error,
    })
    if (res.success) {
      await (admin as any).from('drop_alerts_sent').upsert(
        {
          user_id: user.id,
          drop_key: dropKey,
          sent_at: new Date().toISOString(),
        } as Database['public']['Tables']['drop_alerts_sent']['Insert'],
        { onConflict: 'user_id,drop_key' }
      )
    }
  }

  return NextResponse.json({
    ok: true,
    processed: toProcess.length,
    dropKey,
    month,
    pack,
    results,
  })
}
