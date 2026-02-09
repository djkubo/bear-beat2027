/**
 * POST: Activar una compra pendiente (cobrada en Stripe pero sin completar /complete-purchase).
 * Body: { sessionId?: string, pendingId?: number }
 * Solo admin. Busca en pending_purchases; si no hay fila (webhook no corrió), obtiene datos desde Stripe
 * (Checkout Session cs_xxx o Payment Intent pi_xxx) y activa igual.
 * @build-id activate-pending-20260203 (si Render falla en L112, este commit no está en la rama desplegada)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'
import { stripe } from '@/lib/stripe'

type StripeSessionLike = {
  id: string
  customer_details?: { email?: string; name?: string; phone?: string }
  metadata?: { pack_id?: string }
  amount_total?: number
  currency?: string
}

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
    if (!sessionId && pendingId == null) {
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

      // Si no hay fila (webhook no llegó o falló), obtener datos desde Stripe y activar igual
      if (!pending && (sessionId.startsWith('cs_') || sessionId.startsWith('pi_'))) {
        try {
          if (sessionId.startsWith('cs_')) {
            const session = await stripe.checkout.sessions.retrieve(sessionId, {
              expand: ['payment_intent', 'line_items'],
            })
            if (session.payment_status !== 'paid') {
              return NextResponse.json(
                { error: 'La sesión de Stripe no está pagada' },
                { status: 400 }
              )
            }
            const packId = Math.max(1, parseInt((session.metadata?.pack_id as string) || '1', 10))
            pending = {
              id: 0,
              stripe_session_id: session.id,
              customer_email: session.customer_details?.email ?? session.customer_email ?? null,
              customer_name: session.customer_details?.name ?? null,
              customer_phone: session.customer_details?.phone ?? null,
              pack_id: packId,
              amount_paid: (session.amount_total ?? 0) / 100,
              currency: (session.currency ?? 'MXN').toUpperCase(),
              payment_provider: 'stripe',
            }
          } else {
            const pi = await stripe.paymentIntents.retrieve(sessionId)
            if (pi.status !== 'succeeded') {
              return NextResponse.json(
                { error: 'El pago en Stripe no está completado' },
                { status: 400 }
              )
            }
            let email = (pi.receipt_email || (pi.metadata?.customer_email as string) || '').trim()
            let sessionFromPi: StripeSessionLike | null = null

            if (!email || !email.includes('@')) {
              const list = await stripe.checkout.sessions.list({
                payment_intent: sessionId,
                limit: 1,
              })
              sessionFromPi = list.data[0]
                ? (list.data[0] as unknown as StripeSessionLike)
                : null
              if (sessionFromPi?.customer_details?.email) {
                email = (sessionFromPi.customer_details.email || '').trim()
              }
            }
            if (!email || !email.includes('@')) {
              return NextResponse.json(
                { error: 'El pago en Stripe no tiene email. Usa el Session ID (cs_...) del evento "Se completó una sesión de Checkout" en Stripe.' },
                { status: 400 }
              )
            }
            const packId = sessionFromPi
              ? Math.max(1, parseInt((sessionFromPi.metadata?.pack_id as string) || '1', 10))
              : Math.max(1, parseInt((pi.metadata?.pack_id as string) || '1', 10))
            const amountPaid = sessionFromPi
              ? (sessionFromPi.amount_total ?? 0) / 100
              : (pi.amount ?? 0) / 100
            const currency = (sessionFromPi?.currency ?? pi.currency ?? 'MXN').toUpperCase()
            pending = {
              id: 0,
              stripe_session_id: sessionFromPi?.id ?? sessionId,
              customer_email: email,
              customer_name: (sessionFromPi?.customer_details?.name as string) || (pi.metadata?.customer_name as string) || null,
              customer_phone: (sessionFromPi?.customer_details?.phone as string) || (pi.metadata?.customer_phone as string) || null,
              pack_id: packId,
              amount_paid: amountPaid,
              currency,
              payment_provider: 'stripe',
            }
          }
        } catch (stripeErr: unknown) {
          const msg = stripeErr instanceof Error ? stripeErr.message : 'Stripe error'
          console.error('activate-pending Stripe fetch:', msg)
          return NextResponse.json(
            { error: `No se pudo obtener el pago en Stripe: ${msg}. Comprueba que el ID sea correcto (cs_xxx o pi_xxx).` },
            { status: 400 }
          )
        }
      }
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
        { error: 'No se encontró pago pendiente con ese session_id o id. Si el pago está en Stripe, usa el Session ID (cs_...) o Payment Intent (pi_...) desde el panel de Stripe.' },
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

    // Usar el origin real del request para evitar depender de NEXT_PUBLIC_APP_URL mal configurada.
    const baseUrl = req.nextUrl.origin
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
