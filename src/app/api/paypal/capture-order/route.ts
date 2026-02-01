import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { assignFtpToPurchase } from '@/lib/ftp-pool'

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
  if (!res.ok) throw new Error('PayPal auth failed')
  const data = await res.json()
  return data.access_token
}

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json()
    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 })
    }

    const token = await getPayPalAccessToken()
    const captureRes = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!captureRes.ok) {
      const err = await captureRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.message || 'Error al capturar pago PayPal' },
        { status: 400 }
      )
    }

    const capture = await captureRes.json()
    if (capture.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'La orden no está completada' },
        { status: 400 }
      )
    }

    const unit = capture.purchase_units?.[0]
    const payer = capture.payer
    const customerEmail = payer?.email_address || ''
    const customerName = [payer?.name?.given_name, payer?.name?.surname].filter(Boolean).join(' ') || ''
    const amount = unit?.payments?.captures?.[0]?.amount?.value || '0'
    const currency = unit?.payments?.captures?.[0]?.amount?.currency_code || 'MXN'
    const packId = unit?.custom_id ? parseInt(unit.custom_id, 10) : 1
    const packSlug = 'enero-2026'

    const supabase = createServerClient()
    let userId: string | null = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch (_) {}

    let purchaseId: number | null = null
    try {
      const { data: insertData, error: insertErr } = await supabase
        .from('purchases')
        .insert({
          user_id: userId,
          pack_id: packId,
          amount_paid: parseFloat(amount),
          currency,
          payment_provider: 'paypal',
          payment_id: orderId,
        })
        .select('id')
        .single()
      if (!insertErr && insertData?.id) purchaseId = insertData.id
    } catch (dbErr) {
      console.warn('PayPal: could not insert purchase', dbErr)
    }

    // Una cuenta FTP por cliente: asignar del pool a esta compra
    if (purchaseId) {
      try {
        const admin = createServiceRoleClient()
        await assignFtpToPurchase(admin, purchaseId)
      } catch (e) {
        console.warn('PayPal: assign FTP failed (pool may be empty)', e)
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.json({
      success: true,
      redirectUrl: `${appUrl}/complete-purchase?provider=paypal&order_id=${orderId}`,
      customerEmail,
      customerName,
      amount: parseFloat(amount),
      currency,
      packId,
      packSlug,
    })
  } catch (error: any) {
    console.error('PayPal capture error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al capturar PayPal' },
      { status: 500 }
    )
  }
}
