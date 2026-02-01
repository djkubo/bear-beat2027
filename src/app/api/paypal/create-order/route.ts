import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Pack por defecto
const TEST_PACK = {
  id: 1,
  slug: 'enero-2026',
  name: 'Pack Enero 2026',
  total_videos: 157,
  price_mxn: 350,
  price_usd: 19,
}

const PAYPAL_API_BASE = process.env.PAYPAL_SANDBOX === 'true'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com'

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !secret) {
    throw new Error('PayPal credentials not configured')
  }
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64')
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal auth failed: ${err}`)
  }
  const data = await res.json()
  return data.access_token
}

export async function POST(req: NextRequest) {
  try {
    const { packSlug, currency = 'mxn' } = await req.json()
    const packId = packSlug || 'enero-2026'

    const supabase = createServerClient()
    let pack: typeof TEST_PACK | null = null
    try {
      const { data } = await supabase
        .from('packs')
        .select('*')
        .eq('slug', packId)
        .eq('status', 'available')
        .single()
      if (data) pack = data as typeof TEST_PACK
    } catch (_) {}
    const p = pack || TEST_PACK
    const price = currency === 'mxn' ? (p.price_mxn ?? 350) : (p.price_usd ?? 19)
    const currencyCode = currency === 'mxn' ? 'MXN' : 'USD'

    const token = await getPayPalAccessToken()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `pack-${p.slug}`,
          description: `Bear Beat - ${p.name}`,
          custom_id: `${p.id}`,
          amount: {
            currency_code: currencyCode,
            value: price.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'Bear Beat',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${appUrl}/complete-purchase?provider=paypal`,
        cancel_url: `${appUrl}/checkout-paypal?canceled=true&pack=${packId}`,
      },
    }

    const createRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderPayload),
    })

    if (!createRes.ok) {
      const errText = await createRes.text()
      console.error('PayPal create order error:', errText)
      return NextResponse.json(
        { error: 'No se pudo crear la orden de PayPal' },
        { status: 500 }
      )
    }

    const order = await createRes.json()
    return NextResponse.json({
      orderId: order.id,
      currency: currencyCode,
      amount: price,
    })
  } catch (error: any) {
    console.error('PayPal create-order error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear orden PayPal' },
      { status: 500 }
    )
  }
}
