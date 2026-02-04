import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createStorageBoxSubaccount,
  isHetznerFtpConfigured,
} from '@/lib/hetzner-robot'
import { isFtpConfigured } from '@/lib/ftp-stream'
import { sendPaymentConfirmationEmail } from '@/lib/brevo-email'

function generatePassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 14; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

/**
 * POST: Activar compra (Stripe o PayPal: crear FTP si aplica, insertar purchase).
 * Body: { sessionId, userId, email?, name?, phone?, packId?, amountPaid?, currency?, paymentProvider? }
 * Para PayPal: sessionId = PAYPAL_<orderID>, y se deben enviar packId, amountPaid, currency, paymentProvider: 'paypal'.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      sessionId,
      userId,
      email,
      name,
      phone,
      packId: bodyPackId,
      amountPaid: bodyAmountPaid,
      currency: bodyCurrency,
      paymentProvider = 'stripe',
    } = body as {
      sessionId?: string
      userId?: string
      email?: string
      name?: string
      phone?: string
      packId?: number
      amountPaid?: number
      currency?: string
      paymentProvider?: string
    }

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'sessionId y userId son requeridos' },
        { status: 400 }
      )
    }

    const isPayPal = sessionId.startsWith('PAYPAL_')
    const isStripePaymentIntent = sessionId.startsWith('pi_')
    let packId: number
    let amountPaid: number
    let currency: string
    let paymentIntent: string
    let customerEmail: string
    let utm_source: string | null = null
    let utm_medium: string | null = null
    let utm_campaign: string | null = null

    if (isPayPal) {
      if (bodyPackId == null || bodyAmountPaid == null) {
        return NextResponse.json(
          { error: 'Para PayPal se requieren packId y amountPaid en el body' },
          { status: 400 }
        )
      }
      packId = Number(bodyPackId)
      amountPaid = Number(bodyAmountPaid)
      currency = (bodyCurrency || 'MXN').toUpperCase()
      paymentIntent = sessionId
      customerEmail = email || ''
    } else if (isStripePaymentIntent) {
      const pi = await stripe.paymentIntents.retrieve(sessionId)
      if (pi.status !== 'succeeded') {
        return NextResponse.json(
          { error: 'Pago no completado o sesión inválida' },
          { status: 400 }
        )
      }
      packId = parseInt(pi.metadata?.pack_id || '1', 10)
      amountPaid = (pi.amount || 0) / 100
      currency = (pi.currency || 'mxn').toUpperCase()
      paymentIntent = sessionId
      customerEmail = email || (pi.receipt_email as string) || ''
      utm_source = (pi.metadata?.utm_source as string) || null
      utm_medium = (pi.metadata?.utm_medium as string) || null
      utm_campaign = (pi.metadata?.utm_campaign as string) || null
    } else {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent', 'line_items'],
      })
      if (!session || session.payment_status !== 'paid') {
        return NextResponse.json(
          { error: 'Pago no completado o sesión inválida' },
          { status: 400 }
        )
      }
      packId = parseInt(session.metadata?.pack_id || '1', 10)
      amountPaid = (session.amount_total || 0) / 100
      currency = (session.currency || 'MXN').toUpperCase()
      paymentIntent =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || sessionId
      customerEmail =
        session.customer_details?.email || session.customer_email || email || ''
      utm_source = (session.metadata?.utm_source as string) || null
      utm_medium = (session.metadata?.utm_medium as string) || null
      utm_campaign = (session.metadata?.utm_campaign as string) || null
    }

    const admin = createAdminClient()

    // Idempotencia: si ya existe purchase para este user+pack, devolver éxito sin duplicar
    const { data: existingPurchase } = await (admin as any)
      .from('purchases')
      .select('ftp_username, ftp_password')
      .eq('user_id', userId)
      .eq('pack_id', packId)
      .maybeSingle()

    if (existingPurchase) {
      const ftp_user = existingPurchase.ftp_username || `dj_${userId.slice(0, 8)}`
      const host = ftp_user.includes('-sub')
        ? `${ftp_user}.your-storagebox.de`
        : (process.env.NEXT_PUBLIC_FTP_HOST || process.env.FTP_HOST || undefined)
      return NextResponse.json({
        ok: true,
        ftp_username: ftp_user,
        ftp_password: existingPurchase.ftp_password || '',
        ftp_host: host,
      })
    }

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
        console.log('[activate] FTP real creado en Hetzner:', ftp_username, 'host:', result.host)
      } else {
        console.error('[activate] Hetzner subaccount failed, fallback dj_xxx (FTP no funcionará):', result.error)
        ftp_username = `dj_${userId.slice(0, 8)}`
        ftp_password = generatePassword()
      }
    } else if (isFtpConfigured()) {
      // Fallback: cuenta FTP compartida (misma para todos los compradores). Funciona si en Render hay FTP_HOST, FTP_USER, FTP_PASSWORD.
      ftp_username = process.env.FTP_USER || process.env.HETZNER_FTP_USER!
      ftp_password = process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD!
      console.log('[activate] FTP compartido asignado (misma cuenta para todos). Host:', process.env.NEXT_PUBLIC_FTP_HOST || process.env.FTP_HOST)
    } else {
      console.warn('[activate] Sin Hetzner Robot ni FTP_*: credenciales dj_xxx no conectan a ningún servidor. Añade HETZNER_* o FTP_HOST/FTP_USER/FTP_PASSWORD en Render.')
      ftp_username = `dj_${userId.slice(0, 8)}`
      ftp_password = generatePassword()
    }

    // Marcar pending_purchases como completada solo para Stripe Checkout (PayPal y PaymentIntent no usan esta tabla)
    if (!isPayPal && !isStripePaymentIntent) {
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
    }

    const { error: insertError } = await (admin as any).from('purchases').insert({
      user_id: userId,
      pack_id: packId,
      amount_paid: amountPaid,
      currency,
      payment_provider: isPayPal ? 'paypal' : 'stripe',
      payment_id: paymentIntent,
      ftp_username,
      ftp_password,
      ...(utm_source && { utm_source }),
      ...(utm_medium && { utm_medium }),
      ...(utm_campaign && { utm_campaign }),
      ...(utm_source && { traffic_source: utm_source }),
    })

    if (!insertError && customerEmail && customerEmail.includes('@')) {
      try {
        await sendPaymentConfirmationEmail({
          to: customerEmail,
          userName: name || undefined,
          amount: amountPaid,
          orderId: paymentIntent || sessionId,
        })
        console.log('Email confirmación de pago (Modo Élite) enviado a', customerEmail)
      } catch (e) {
        console.warn('sendPaymentConfirmationEmail (non-critical):', e)
      }
    }

    if (insertError) {
      // Idempotencia: unique violation (user_id, pack_id) = ya activado
      const code = (insertError as { code?: string }).code
      if (code === '23505') {
        const { data: existing } = await (admin as any)
          .from('purchases')
          .select('ftp_username, ftp_password')
          .eq('user_id', userId)
          .eq('pack_id', packId)
          .maybeSingle()
        const fu = existing?.ftp_username || ftp_username
        const host = fu.includes('-sub') ? `${fu}.your-storagebox.de` : (process.env.NEXT_PUBLIC_FTP_HOST || process.env.FTP_HOST || undefined)
        return NextResponse.json({
          ok: true,
          ftp_username: fu,
          ftp_password: existing?.ftp_password || ftp_password,
          ftp_host: host,
        })
      }
      console.error('Purchase insert error:', insertError)
      return NextResponse.json(
        { error: insertError.message || 'Error al guardar la compra' },
        { status: 500 }
      )
    }

    const ftp_host = ftp_username.includes('-sub')
      ? `${ftp_username}.your-storagebox.de`
      : (process.env.NEXT_PUBLIC_FTP_HOST || process.env.FTP_HOST || undefined)
    return NextResponse.json({
      ok: true,
      ftp_username,
      ftp_password,
      ftp_host,
    });
  } catch (e: any) {
    console.error('Activate purchase error:', e)
    return NextResponse.json(
      { error: e?.message || 'Error al activar la compra' },
      { status: 500 }
    )
  }
}
