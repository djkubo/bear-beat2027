/**
 * POST: Activar una compra pendiente (cobrada en Stripe pero sin completar /complete-purchase).
 * Body: { sessionId?: string, pendingId?: number }
 * Solo admin. Busca o crea usuario por customer_email y llama a la lógica de activación.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'

function randomPassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 14; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    const isAdmin = userRow?.role === 'admin' || isAdminEmailWhitelist(user.email)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const sessionId = body.sessionId as string | undefined
    const pendingId = body.pendingId as number | undefined
    if (!sessionId && (pendingId == null || pendingId === '')) {
      return NextResponse.json(
        { error: 'Indica sessionId o pendingId' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    let pending: {
      id: number
      stripe_session_id: string | null
      customer_email: string | null
      customer_name: string | null
      customer_phone: string | null
      pack_id: number | null
      amount_paid: number | null
      currency: string | null
      payment_provider: string | null
    } | null = null

    if (sessionId) {
      const { data } = await (admin as any)
        .from('pending_purchases')
        .select('id, stripe_session_id, customer_email, customer_name, customer_phone, pack_id, amount_paid, currency, payment_provider')
        .eq('stripe_session_id', sessionId)
        .eq('payment_status', 'paid')
        .maybeSingle()
      pending = data
    } else if (pendingId != null) {
      const { data } = await (admin as any)
        .from('pending_purchases')
        .select('id, stripe_session_id, customer_email, customer_name, customer_phone, pack_id, amount_paid, currency, payment_provider')
        .eq('id', pendingId)
        .eq('payment_status', 'paid')
        .maybeSingle()
      pending = data
    }

    if (!pending?.stripe_session_id) {
      return NextResponse.json(
        { error: 'No se encontró pago pendiente con ese session_id o id' },
        { status: 404 }
      )
    }

    const email = (pending.customer_email || '').trim()
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'El pago pendiente no tiene email de cliente válido' },
        { status: 400 }
      )
    }

    let userId: string

    const { data: existingUser } = await (admin as any)
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existingUser?.id) {
      userId = existingUser.id
    } else {
      const { data: newAuth, error: createErr } = await (admin.auth as any).admin.createUser({
        email: email.toLowerCase(),
        password: randomPassword(),
        email_confirm: true,
        user_metadata: { name: pending.customer_name || undefined, phone: pending.customer_phone || undefined },
      })
      if (createErr) {
        const msg = (createErr.message || '').toLowerCase()
        if (msg.includes('already') || msg.includes('registered') || createErr.status === 422) {
          const { data: retry } = await (admin as any).from('users').select('id').eq('email', email.toLowerCase()).maybeSingle()
          if (retry?.id) {
            userId = retry.id
          } else {
            return NextResponse.json({ error: 'El email ya está registrado; no se pudo obtener el usuario' }, { status: 409 })
          }
        } else {
          console.error('activate-pending createUser:', createErr)
          return NextResponse.json({ error: createErr.message || 'Error al crear usuario' }, { status: 500 })
        }
      } else if (newAuth?.user?.id) {
        userId = newAuth.user.id
        await (admin as any).from('users').upsert(
          {
            id: newAuth.user.id,
            email: email.toLowerCase(),
            name: pending.customer_name ?? null,
            phone: pending.customer_phone ?? null,
          },
          { onConflict: 'id' }
        )
      } else {
        return NextResponse.json({ error: 'No se pudo crear el usuario' }, { status: 500 })
      }
    }

    if (!userId) return NextResponse.json({ error: 'userId no definido' }, { status: 500 })

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') || 'http://localhost:3000'
    const activateRes = await fetch(`${baseUrl}/api/complete-purchase/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: pending.stripe_session_id,
        userId,
        email: pending.customer_email,
        name: pending.customer_name,
        phone: pending.customer_phone,
        packId: pending.pack_id,
        amountPaid: pending.amount_paid,
        currency: pending.currency,
        paymentProvider: pending.payment_provider || 'stripe',
      }),
    })
    const activateData = await activateRes.json().catch(() => ({}))

    if (!activateRes.ok) {
      return NextResponse.json(
        { error: activateData?.error || 'Error al activar la compra' },
        { status: activateRes.status >= 400 ? activateRes.status : 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      userId,
      email,
      message: 'Compra activada. El usuario ya tiene acceso al pack.',
    })
  } catch (e: any) {
    console.error('activate-pending error:', e)
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    )
  }
}
