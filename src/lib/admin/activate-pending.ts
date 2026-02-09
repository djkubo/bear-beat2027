import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { activatePurchase } from '@/lib/purchase-activation'
import { HttpError } from '@/lib/http-error'

type PendingPurchaseRow = {
  id: number
  stripe_session_id: string | null
  customer_email: string | null
  customer_name: string | null
  customer_phone: string | null
  pack_id: number | null
  amount_paid: number | null
  currency: string | null
  payment_provider: string | null
}

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

export type ActivatePendingInput = {
  sessionId?: string
  pendingId?: number
}

export type ActivatePendingOk = {
  ok: true
  userId: string
  email: string
  message: string
}

/**
 * Activa una compra pendiente usando solo Supabase Admin + Stripe + la logica de activacion.
 *
 * Importante: NO hace check de admin. Los endpoints deben validar permisos antes de llamarla.
 */
export async function activatePendingPurchase(input: ActivatePendingInput): Promise<ActivatePendingOk> {
  const sessionId = input.sessionId
  const pendingId = input.pendingId
  if (!sessionId && pendingId == null) {
    throw new HttpError(400, 'Indica sessionId o pendingId')
  }

  const admin = createAdminClient()

  let pending: PendingPurchaseRow | null = null

  if (sessionId) {
    const { data } = await (admin as any)
      .from('pending_purchases')
      .select(
        'id, stripe_session_id, customer_email, customer_name, customer_phone, pack_id, amount_paid, currency, payment_provider'
      )
      .eq('stripe_session_id', sessionId)
      .eq('payment_status', 'paid')
      .maybeSingle()
    pending = data

    // Si no hay fila (webhook no llegó o falló), obtener datos desde Stripe y activar igual
    if (!pending && (sessionId.startsWith('cs_') || sessionId.startsWith('pi_'))) {
      if (sessionId.startsWith('cs_')) {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['payment_intent', 'line_items'],
        })
        if (session.payment_status !== 'paid') {
          throw new HttpError(400, 'La sesión de Stripe no está pagada')
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
          throw new HttpError(400, 'El pago en Stripe no está completado')
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
          throw new HttpError(
            400,
            'El pago en Stripe no tiene email. Usa el Session ID (cs_...) del evento "Se completó una sesión de Checkout" en Stripe.'
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
          customer_name:
            (sessionFromPi?.customer_details?.name as string) ||
            (pi.metadata?.customer_name as string) ||
            null,
          customer_phone:
            (sessionFromPi?.customer_details?.phone as string) ||
            (pi.metadata?.customer_phone as string) ||
            null,
          pack_id: packId,
          amount_paid: amountPaid,
          currency,
          payment_provider: 'stripe',
        }
      }
    }
  } else if (pendingId != null) {
    const { data } = await (admin as any)
      .from('pending_purchases')
      .select(
        'id, stripe_session_id, customer_email, customer_name, customer_phone, pack_id, amount_paid, currency, payment_provider'
      )
      .eq('id', pendingId)
      .eq('payment_status', 'paid')
      .maybeSingle()
    pending = data
  }

  if (!pending?.stripe_session_id) {
    throw new HttpError(
      404,
      'No se encontró pago pendiente con ese session_id o id. Si el pago está en Stripe, usa el Session ID (cs_...) o Payment Intent (pi_...) desde el panel de Stripe.'
    )
  }

  const email = (pending.customer_email || '').trim()
  if (!email || !email.includes('@')) {
    throw new HttpError(400, 'El pago pendiente no tiene email de cliente válido')
  }

  const emailLower = email.toLowerCase()
  let userId: string | null = null

  const { data: existingUser } = await (admin as any)
    .from('users')
    .select('id')
    .eq('email', emailLower)
    .maybeSingle()

  if (existingUser?.id) {
    userId = existingUser.id
  } else {
    // Si ya existe en auth pero NO existe en public.users (caso común: usuario creado pero row no insertada),
    // recuperarlo desde auth.users con service role y crear/actualizar la fila en public.users.
    try {
      const { data: authUser } = await (admin as any)
        .schema('auth')
        .from('users')
        .select('id')
        .eq('email', emailLower)
        .maybeSingle()
      if (authUser?.id) {
        userId = authUser.id
        await (admin as any).from('users').upsert(
          {
            id: userId,
            email: emailLower,
            name: pending.customer_name ?? null,
            phone: pending.customer_phone ?? null,
          },
          { onConflict: 'id' }
        )
      }
    } catch {
      // ignore
    }

    if (userId) {
      // ya resuelto desde auth.users
    } else {
    const { data: newAuth, error: createErr } = await (admin.auth as any).admin.createUser({
      email: emailLower,
      password: randomPassword(),
      email_confirm: true,
      user_metadata: {
        name: pending.customer_name || undefined,
        phone: pending.customer_phone || undefined,
      },
    })
    if (createErr) {
      const msg = (createErr.message || '').toLowerCase()
      if (
        msg.includes('already') ||
        msg.includes('registered') ||
        (createErr as any).status === 422
      ) {
        const { data: retry } = await (admin as any)
          .from('users')
          .select('id')
          .eq('email', emailLower)
          .maybeSingle()
        if (retry?.id) {
          userId = retry.id
        } else {
          throw new HttpError(409, 'El email ya está registrado; no se pudo obtener el usuario')
        }
      } else {
        console.error('activatePendingPurchase createUser:', createErr)
        throw new Error(createErr.message || 'Error al crear usuario')
      }
    } else if (newAuth?.user?.id) {
      userId = newAuth.user.id
      await (admin as any).from('users').upsert(
        {
          id: newAuth.user.id,
          email: emailLower,
          name: pending.customer_name ?? null,
          phone: pending.customer_phone ?? null,
        },
        { onConflict: 'id' }
      )
    } else {
      throw new Error('No se pudo crear el usuario')
    }
    }
  }

  if (!userId) throw new Error('userId no definido')

  await activatePurchase({
    sessionId: pending.stripe_session_id,
    userId,
    email: pending.customer_email ?? undefined,
    name: pending.customer_name ?? undefined,
    phone: pending.customer_phone ?? undefined,
    packId: pending.pack_id ?? undefined,
    amountPaid: pending.amount_paid ?? undefined,
    currency: pending.currency ?? undefined,
    paymentProvider: pending.payment_provider || 'stripe',
  })

  return {
    ok: true,
    userId,
    email: emailLower,
    message: 'Compra activada. El usuario ya tiene acceso al pack.',
  }
}
