/**
 * POST: Crear usuario Auth con email_confirm: true (para flujo complete-purchase / registro).
 * Body: { email: string, password: string, name?: string, phone?: string }
 * Solo para uso desde complete-purchase; evita que el usuario quede con email no confirmado.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWelcomeRegistroEmail } from '@/lib/brevo-email'
import { sendSms } from '@/lib/brevo-sms'
import type { Database } from '@/types/database'
import { stripe } from '@/lib/stripe'

type UserInsert = Database['public']['Tables']['users']['Insert']

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
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !secret) throw new Error('PayPal credentials not configured')
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64')
  const baseUrl = getPayPalBaseUrl()
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${auth}` },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error('PayPal auth failed')
  const data = await res.json()
  return data.access_token
}

async function getPaidEmailFromPaymentRef(paymentRef: string, provider?: string): Promise<string> {
  const ref = (paymentRef || '').trim()
  if (!ref) return ''

  const isPayPal = provider === 'paypal' || ref.startsWith('PAYPAL_')
  if (isPayPal) {
    const orderID = ref.replace(/^PAYPAL_/, '')
    if (!orderID) return ''

    const token = await getPayPalAccessToken()
    const baseUrl = getPayPalBaseUrl()
    const getRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderID}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!getRes.ok) return ''
    const order = await getRes.json()
    if (order?.status !== 'COMPLETED') return ''
    return String(order?.payer?.email_address || '').trim()
  }

  if (ref.startsWith('pi_')) {
    const pi = await stripe.paymentIntents.retrieve(ref)
    if (pi.status !== 'succeeded') return ''
    const emailFromMeta = (pi.metadata?.customer_email as string) || ''
    const emailFromReceipt = (pi.receipt_email as string) || ''
    return String(emailFromMeta || emailFromReceipt).trim()
  }

  // Stripe Checkout Session (cs_...)
  const session = await stripe.checkout.sessions.retrieve(ref, {
    expand: ['payment_intent'],
  })
  if (!session || session.payment_status !== 'paid') return ''
  const emailFromDetails = (session.customer_details?.email as string) || ''
  const emailFromCustomerEmail = (session.customer_email as string) || ''
  const emailFromMeta = (session.metadata?.customer_email as string) || ''
  return String(emailFromDetails || emailFromCustomerEmail || emailFromMeta).trim()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name, phone, paymentRef, provider } = body as {
      email?: string
      password?: string
      name?: string
      phone?: string
      paymentRef?: string
      provider?: string
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Email válido requerido' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    // Este endpoint crea usuarios con email_confirm=true; debe estar atado a un pago confirmado.
    if (!paymentRef || typeof paymentRef !== 'string' || paymentRef.trim().length < 6) {
      return NextResponse.json({ error: 'paymentRef (session_id / payment_intent) requerido' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const paidEmail = await getPaidEmailFromPaymentRef(paymentRef, provider)
    if (!paidEmail || !paidEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Pago no verificado todavía. Si acabas de pagar, espera 30s y reintenta.' },
        { status: 402 }
      )
    }
    if (paidEmail.trim().toLowerCase() !== normalizedEmail) {
      return NextResponse.json(
        { error: 'El email no coincide con el email del pago. Usa el mismo email con el que pagaste.' },
        { status: 403 }
      )
    }

    const admin = createAdminClient()

    const { data: newAuth, error: createErr } = await (admin.auth as any).admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name: name || undefined, phone: phone || undefined },
    })

    if (createErr) {
      const msg = (createErr.message || '').toLowerCase()
      if (msg.includes('already') || msg.includes('registered') || createErr.status === 422) {
        return NextResponse.json(
          { error: 'already_exists', message: 'Este email ya tiene cuenta. Inicia sesión o usa "Establecer contraseña".' },
          { status: 409 }
        )
      }
      console.error('create-user createUser error:', createErr)
      return NextResponse.json({ error: createErr.message || 'Error al crear cuenta' }, { status: 500 })
    }

    if (!newAuth?.user?.id) {
      return NextResponse.json({ error: 'No se devolvió el usuario' }, { status: 500 })
    }

    await (admin.from('users') as any).upsert(
      {
        id: newAuth.user.id,
        email: normalizedEmail,
        name: name ?? null,
        phone: phone ?? null,
      } as UserInsert,
      { onConflict: 'id' }
    )

    // --- EMAIL BIENVENIDA REGISTRO (plantilla "Modo Bestia") ---
    try {
      await sendWelcomeRegistroEmail({ to: email.trim(), name: name || undefined })
    } catch (mailErr) {
      console.error('create-user: welcome email failed', mailErr)
      // No fallar el registro si el email falla
    }

    // --- SMS BIENVENIDA (justo después de crear usuario) ---
    const phoneClean = typeof phone === 'string' ? phone.trim() : ''
    const hasValidPhone = phoneClean && phoneClean.replace(/\D/g, '').length >= 10
    if (hasValidPhone) {
      try {
        const smsBody =
          'BearBeat: Bienvenido a la Élite 🐺. Tus accesos están en tu email. Revísalo ya (incluso Spam). Vamos a romperla. 🔥'
        await sendSms(phoneClean, smsBody, undefined, { tag: 'welcome' })
        console.log('📱 SMS de bienvenida enviado a:', phoneClean)
      } catch (smsError) {
        console.error('❌ Error enviando SMS:', smsError)
        // No bloqueamos el flujo, solo reportamos
      }
    }

    return NextResponse.json({
      ok: true,
      userId: newAuth.user.id,
      email: newAuth.user.email,
    })
  } catch (e: any) {
    console.error('create-user error:', e)
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 })
  }
}
