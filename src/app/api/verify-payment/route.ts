import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase/server'

async function getPackBySlug(supabase: Awaited<ReturnType<typeof createServerClient>>, packSlug: string) {
  const pack: { id: number; slug: string; name: string; total_videos: number } = {
    id: 1,
    slug: packSlug,
    name: 'Pack Enero 2026',
    total_videos: 0,
  }
  try {
    const { data: packRow } = await supabase.from('packs').select('id, slug, name').eq('slug', packSlug).single()
    if (packRow) {
      pack.id = packRow.id
      pack.slug = packRow.slug
      pack.name = packRow.name
      const { count } = await supabase.from('videos').select('*', { count: 'exact', head: true }).eq('pack_id', packRow.id)
      pack.total_videos = count ?? 0
    }
  } catch (_) {}
  return pack
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

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id')
    const paymentIntentId = req.nextUrl.searchParams.get('payment_intent')
    const provider = req.nextUrl.searchParams.get('provider')

    // —— PayPal: session_id=PAYPAL_<orderID> & provider=paypal ——
    if (provider === 'paypal' && sessionId?.startsWith('PAYPAL_')) {
      const orderID = sessionId.replace(/^PAYPAL_/, '')
      if (!orderID) return NextResponse.json({ error: 'Invalid PayPal session' }, { status: 400 })

      const token = await getPayPalAccessToken()
      const baseUrl = getPayPalBaseUrl()

      const getRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderID}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!getRes.ok) return NextResponse.json({ error: 'PayPal order not found' }, { status: 404 })
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
          if (errData.name === 'ORDER_ALREADY_CAPTURED' || errData.message?.includes('already been captured')) {
            finalOrder = await (await fetch(`${baseUrl}/v2/checkout/orders/${orderID}`, { headers: { Authorization: `Bearer ${token}` } })).json()
          } else {
            return NextResponse.json({ error: 'PayPal capture failed' }, { status: 400 })
          }
        } else {
          const captureData = await captureRes.json()
          finalOrder = captureData
        }
      } else if (order.status !== 'COMPLETED') {
        finalOrder = await (await fetch(`${baseUrl}/v2/checkout/orders/${orderID}`, { headers: { Authorization: `Bearer ${token}` } })).json()
      }
      const pu = finalOrder.purchase_units?.[0]
      const amount = pu?.amount?.value ? parseFloat(pu.amount.value) : 0
      const currency = (pu?.amount?.currency_code || 'MXN').toUpperCase()
      const customId = pu?.custom_id || ''
      const packIdFromCustom = customId.startsWith('pack_id:') ? parseInt(customId.replace('pack_id:', ''), 10) : 1
      const referenceId = pu?.reference_id || 'enero-2026'
      const payerEmail = finalOrder.payer?.email_address || ''
      const payerName = finalOrder.payer?.name ? `${finalOrder.payer.name.given_name || ''} ${finalOrder.payer.name.surname || ''}`.trim() : ''

      const supabase = await createServerClient()
      const pack = await getPackBySlug(supabase, referenceId)

      return NextResponse.json({
        success: true,
        sessionId,
        packId: Number.isNaN(packIdFromCustom) ? pack.id : packIdFromCustom,
        packSlug: referenceId,
        pack,
        amount,
        currency,
        paymentIntent: '',
        customerEmail: payerEmail,
        customerName: payerName,
        customerPhone: '',
        paymentStatus: 'paid',
        userId: null,
      })
    }

    // —— Stripe PaymentIntent (flujo Elements / Payment Element) ——
    if (paymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
      if (pi.status !== 'succeeded') {
        return NextResponse.json({ error: 'Payment not completed', status: pi.status }, { status: 400 })
      }
      const packSlug = (pi.metadata?.pack_slug as string) || 'enero-2026'
      const packId = parseInt((pi.metadata?.pack_id as string) || '1', 10)
      const userId = (pi.metadata?.user_id as string) || null
      const amount = (pi.amount || 0) / 100
      const currency = (pi.currency || 'mxn').toUpperCase()

      const supabase = await createServerClient()
      const pack = await getPackBySlug(supabase, packSlug)
      const customerEmail = (pi.receipt_email as string) || ''
      const customerName = ''

      return NextResponse.json({
        success: true,
        sessionId: pi.id,
        packId: Number.isNaN(packId) ? pack.id : packId,
        packSlug,
        pack,
        amount,
        currency,
        paymentIntent: pi.id,
        customerEmail,
        customerName,
        customerPhone: '',
        paymentStatus: 'paid',
        userId,
      })
    }

    // —— Stripe Checkout Session (OXXO, SPEI, redirect flow) ——
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID or payment_intent required' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'line_items'],
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed', status: session.payment_status }, { status: 400 })
    }

    const packSlug = (session.metadata?.pack_slug as string) || 'enero-2026'
    const packId = (session.metadata?.pack_id as string) || '1'
    const userId = (session.metadata?.user_id as string) || null
    const customerEmail = (session.customer_details?.email as string) || (session.customer_email as string) || ''
    const customerName = (session.customer_details?.name as string) || ''
    const customerPhone = (session.customer_details?.phone as string) || ''
    const amount = (session.amount_total || 0) / 100
    const currency = (session.currency || 'mxn').toUpperCase()
    const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || ''

    const supabase = await createServerClient()
    const pack = await getPackBySlug(supabase, packSlug)

    return NextResponse.json({
      success: true,
      sessionId,
      packId: pack.id,
      packSlug,
      pack,
      amount,
      currency,
      paymentIntent,
      customerEmail,
      customerName,
      customerPhone,
      paymentStatus: session.payment_status,
      userId,
    })
  } catch (error: any) {
    console.error('Error verifying payment:', error)
    return NextResponse.json({ error: error.message || 'Failed to verify payment' }, { status: 500 })
  }
}
