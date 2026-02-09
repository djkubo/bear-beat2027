import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createStorageBoxSubaccount,
  isHetznerFtpConfigured,
} from '@/lib/hetzner-robot'
import { isFtpConfigured } from '@/lib/ftp-stream'
import { sendPaymentConfirmationEmail } from '@/lib/brevo-email'
import { HttpError } from '@/lib/http-error'

export type ActivatePurchaseInput = {
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

export type ActivatePurchaseOk = {
  ok: true
  ftp_username: string
  ftp_password: string
  ftp_host?: string
}

function generatePassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 14; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

function getPayPalBaseUrl(): string {
  const useSandbox =
    process.env.PAYPAL_USE_SANDBOX === 'true' ||
    process.env.PAYPAL_USE_SANDBOX === '1' ||
    process.env.NEXT_PUBLIC_PAYPAL_USE_SANDBOX === 'true' ||
    process.env.NEXT_PUBLIC_PAYPAL_USE_SANDBOX === '1'
  const isProd = process.env.NODE_ENV === 'production'
  if (useSandbox || !isProd) return 'https://api-m.sandbox.paypal.com'
  return 'https://api-m.paypal.com'
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId =
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !secret) throw new Error('PayPal credentials not configured')
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64')
  const baseUrl = getPayPalBaseUrl()
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error('PayPal auth failed')
  const data = await res.json()
  return data.access_token
}

/**
 * Activar compra (Stripe o PayPal): crea FTP si aplica, inserta purchase y marca pending_purchases como completed.
 *
 * Nota: Esta funcion NO autentica. Los endpoints que la llamen deben validar permisos/inputs.
 * Lanza HttpError para errores "esperados" (400/403/404), y Error normal para fallos internos (500).
 */
export async function activatePurchase(input: ActivatePurchaseInput): Promise<ActivatePurchaseOk> {
  const {
    sessionId,
    userId,
    email,
    name,
    phone,
    currency: bodyCurrency,
  } = input

  if (!sessionId || !userId) {
    throw new HttpError(400, 'sessionId y userId son requeridos')
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
    // Verificar orden PayPal (NO confiar en valores del body; evita activar sin pago)
    const orderID = sessionId.replace(/^PAYPAL_/, '')
    if (!orderID) throw new HttpError(400, 'PayPal orderID inválido')

    const token = await getPayPalAccessToken()
    const baseUrl = getPayPalBaseUrl()
    const getRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderID}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!getRes.ok) throw new HttpError(404, 'PayPal order not found')
    const order = await getRes.json()

    let finalOrder = order
    if (order.status === 'CREATED' || order.status === 'APPROVED') {
      const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderID}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: '{}',
      })
      if (!captureRes.ok) {
        const errData = await captureRes.json().catch(() => ({}))
        if (
          errData.name === 'ORDER_ALREADY_CAPTURED' ||
          errData.message?.includes('already been captured')
        ) {
          finalOrder = await (
            await fetch(`${baseUrl}/v2/checkout/orders/${orderID}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          ).json()
        } else {
          throw new HttpError(400, 'PayPal capture failed')
        }
      } else {
        finalOrder = await captureRes.json()
      }
    } else if (order.status !== 'COMPLETED') {
      finalOrder = await (
        await fetch(`${baseUrl}/v2/checkout/orders/${orderID}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).json()
    }

    if (finalOrder?.status !== 'COMPLETED') throw new HttpError(400, 'Pago de PayPal no completado')

    const pu = finalOrder.purchase_units?.[0]
    const amountStr = pu?.amount?.value ? String(pu.amount.value) : '0'
    const currencyCode = (pu?.amount?.currency_code || bodyCurrency || 'MXN').toUpperCase()
    const customId = pu?.custom_id || ''
    const packIdFromCustom = customId.startsWith('pack_id:')
      ? parseInt(customId.replace('pack_id:', ''), 10)
      : 1
    packId = Number.isNaN(packIdFromCustom) ? 1 : packIdFromCustom
    amountPaid = parseFloat(amountStr) || 0
    currency = currencyCode
    paymentIntent = sessionId
    customerEmail = (finalOrder.payer?.email_address as string) || email || ''
  } else if (isStripePaymentIntent) {
    const pi = await stripe.paymentIntents.retrieve(sessionId)
    if (pi.status !== 'succeeded') throw new HttpError(400, 'Pago no completado o sesión inválida')
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
      throw new HttpError(400, 'Pago no completado o sesión inválida')
    }
    packId = parseInt(session.metadata?.pack_id || '1', 10)
    amountPaid = (session.amount_total || 0) / 100
    currency = (session.currency || 'MXN').toUpperCase()
    paymentIntent =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || sessionId
    customerEmail = session.customer_details?.email || session.customer_email || email || ''
    utm_source = (session.metadata?.utm_source as string) || null
    utm_medium = (session.metadata?.utm_medium as string) || null
    utm_campaign = (session.metadata?.utm_campaign as string) || null
  }

  const admin = createAdminClient()

  // Evita activar compras para un userId que no corresponde al email del pago.
  // (Protege contra abuso con userId arbitrario desde el cliente.)
  try {
    const { data: userRow } = await (admin as any)
      .from('users')
      .select('email')
      .eq('id', userId)
      .maybeSingle()
    const storedEmail = String((userRow as { email?: string } | null)?.email || '')
      .trim()
      .toLowerCase()
    const paidEmail = String(customerEmail || '').trim().toLowerCase()
    if (storedEmail && paidEmail && storedEmail !== paidEmail) {
      throw new HttpError(403, 'El usuario no coincide con el email del pago')
    }
  } catch (e) {
    if (e instanceof HttpError) throw e
    // ignore otros errores (no bloquear activacion por lectura fallida)
  }

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
    return {
      ok: true,
      ftp_username: ftp_user,
      ftp_password: existingPurchase.ftp_password || '',
      ftp_host: host,
    }
  }

  let ftp_username: string
  let ftp_password: string

  if (isHetznerFtpConfigured()) {
    const storageboxId = process.env.HETZNER_STORAGEBOX_ID!
    const subUsername = `u${storageboxId}-sub-${userId.slice(0, 8)}`
    const subPassword = generatePassword()
    const result = await createStorageBoxSubaccount(storageboxId, subUsername, subPassword, true)
    if (result.ok) {
      ftp_username = result.username
      ftp_password = result.password
      console.log('[activate] FTP real creado en Hetzner:', ftp_username, 'host:', result.host)
    } else {
      console.error(
        '[activate] Hetzner subaccount failed, fallback dj_xxx (FTP no funcionará):',
        result.error
      )
      ftp_username = `dj_${userId.slice(0, 8)}`
      ftp_password = generatePassword()
    }
  } else if (isFtpConfigured()) {
    // Fallback: cuenta FTP compartida (misma para todos los compradores). Funciona si en Render hay FTP_HOST, FTP_USER, FTP_PASSWORD.
    ftp_username = process.env.FTP_USER || process.env.HETZNER_FTP_USER!
    ftp_password = process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD!
    console.log(
      '[activate] FTP compartido asignado (misma cuenta para todos). Host:',
      process.env.NEXT_PUBLIC_FTP_HOST || process.env.FTP_HOST
    )
  } else {
    console.warn(
      '[activate] Sin Hetzner Robot ni FTP_*: credenciales dj_xxx no conectan a ningún servidor. Añade HETZNER_* o FTP_HOST/FTP_USER/FTP_PASSWORD en Render.'
    )
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
      const host = fu.includes('-sub')
        ? `${fu}.your-storagebox.de`
        : (process.env.NEXT_PUBLIC_FTP_HOST || process.env.FTP_HOST || undefined)
      return {
        ok: true,
        ftp_username: fu,
        ftp_password: existing?.ftp_password || ftp_password,
        ftp_host: host,
      }
    }
    console.error('Purchase insert error:', insertError)
    throw new Error(insertError.message || 'Error al guardar la compra')
  }

  const ftp_host = ftp_username.includes('-sub')
    ? `${ftp_username}.your-storagebox.de`
    : (process.env.NEXT_PUBLIC_FTP_HOST || process.env.FTP_HOST || undefined)

  return {
    ok: true,
    ftp_username,
    ftp_password,
    ftp_host,
  }
}

