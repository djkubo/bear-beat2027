import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

async function getPack(supabase: Awaited<ReturnType<typeof createServerClient>>, packSlug: string) {
  const { data: packRow } = await supabase.from('packs').select('*').eq('slug', packSlug).eq('status', 'available').single()
  if (!packRow) return null
  const { count } = await supabase.from('videos').select('*', { count: 'exact', head: true }).eq('pack_id', packRow.id)
  return { ...packRow, total_videos: count ?? packRow.total_videos ?? 0 }
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
  if (!clientId || !secret) {
    throw new Error('PayPal credentials not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)')
  }
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
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal auth failed: ${err}`)
  }
  const data = await res.json()
  return data.access_token
}

/**
 * Crea una orden PayPal (monto según pack y moneda). Devuelve orderID para el cliente.
 */
export async function POST(req: NextRequest) {
  try {
    const { packSlug, currency = 'mxn' } = await req.json()
    if (!packSlug) {
      return NextResponse.json({ error: 'Pack slug required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    let pack: any = null
    try {
      pack = await getPack(supabase, packSlug)
      if (!pack) {
        pack = {
          id: 1,
          slug: packSlug,
          name: 'Pack Enero 2026',
          total_videos: 0,
          price_mxn: 350,
          price_usd: 19,
          status: 'available',
        }
      }
    } catch {
      pack = { id: 1, slug: packSlug, name: 'Pack Enero 2026', total_videos: 0, price_mxn: 350, price_usd: 19, status: 'available' }
    }

    const amount = currency === 'mxn' ? (pack.price_mxn || 350) : (pack.price_usd || 19)
    const currencyCode = currency === 'mxn' ? 'MXN' : 'USD'
    const valueStr = amount.toFixed(2)

    const token = await getPayPalAccessToken()
    const baseUrl = getPayPalBaseUrl()

    const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: packSlug,
            custom_id: `pack_id:${pack.id}`,
            amount: {
              currency_code: currencyCode,
              value: valueStr,
            },
            description: `Bear Beat - ${pack.name}`,
          },
        ],
      }),
    })

    if (!orderRes.ok) {
      const errText = await orderRes.text()
      console.error('PayPal create order error:', errText)
      throw new Error('No se pudo crear la orden de PayPal')
    }

    const orderData = await orderRes.json()
    const orderID = orderData.id
    if (!orderID) throw new Error('PayPal no devolvió order ID')

    return NextResponse.json({ orderID })
  } catch (error: any) {
    console.error('create-paypal-order error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear orden PayPal' },
      { status: 500 }
    )
  }
}
