import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createStorageBoxSubaccount,
  isHetznerFtpConfigured,
} from '@/lib/hetzner-robot'

function generatePassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 14; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

/**
 * POST: Activar compra (verificar Stripe, crear FTP en Hetzner si aplica, insertar purchase).
 * Body: { sessionId, userId, email?, name?, phone? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, userId, email, name, phone } = body as {
      sessionId?: string
      userId?: string
      email?: string
      name?: string
      phone?: string
    }

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'sessionId y userId son requeridos' },
        { status: 400 }
      )
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'line_items'],
    })

    if (!session || session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Pago no completado o sesión inválida' },
        { status: 400 }
      )
    }

    const packId = parseInt(session.metadata?.pack_id || '1', 10)
    const amountPaid = (session.amount_total || 0) / 100
    const currency = (session.currency || 'MXN').toUpperCase()
    const paymentIntent =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || sessionId
    const customerEmail =
      session.customer_details?.email || session.customer_email || email || ''

    let ftp_username: string
    let ftp_password: string

    if (isHetznerFtpConfigured()) {
      const storageboxId = process.env.HETZNER_STORAGEBOX_ID!
      const subUsername = `u${storageboxId}-sub-${userId.slice(0, 8)}`
      const subPassword = generatePassword()
      const result = await createStorageBoxSubaccount(
        storageboxId,
        subUsername,
        subPassword,
        true
      )
      if (result.ok) {
        ftp_username = result.username
        ftp_password = result.password
      } else {
        console.error('Hetzner subaccount failed, using generated credentials:', result.error)
        ftp_username = `dj_${userId.slice(0, 8)}`
        ftp_password = generatePassword()
      }
    } else {
      ftp_username = `dj_${userId.slice(0, 8)}`
      ftp_password = generatePassword()
    }

    const admin = createAdminClient()

    // Cast a any: el cliente tipado con Database infiere never para pending_purchases/purchases en build
    await (admin as any)
      .from('pending_purchases')
      .update({
        user_id: userId,
        status: 'completed',
        customer_email: customerEmail,
        customer_name: name ?? null,
        customer_phone: phone ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq('stripe_session_id', sessionId)

    const { error: insertError } = await (admin as any).from('purchases').insert({
      user_id: userId,
      pack_id: packId,
      amount_paid: amountPaid,
      currency,
      payment_provider: 'stripe',
      payment_id: paymentIntent,
      ftp_username,
      ftp_password,
    })

    if (insertError) {
      console.error('Purchase insert error:', insertError)
      return NextResponse.json(
        { error: insertError.message || 'Error al guardar la compra' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      ftp_username,
      ftp_password,
      ftp_host: ftp_username.includes('-sub')
        ? `${ftp_username}.your-storagebox.de`
        : undefined,
    })
  } catch (e: any) {
    console.error('Activate purchase error:', e)
    return NextResponse.json(
      { error: e?.message || 'Error al activar la compra' },
      { status: 500 }
    )
  }
}
