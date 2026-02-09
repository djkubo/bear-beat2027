import { NextRequest, NextResponse } from 'next/server'
import { activatePurchase } from '@/lib/purchase-activation'
import { getErrorMessage, HttpError } from '@/lib/http-error'

/**
 * POST: Activar compra (Stripe o PayPal: crear FTP si aplica, insertar purchase).
 * Body: { sessionId, userId, email?, name?, phone?, packId?, amountPaid?, currency?, paymentProvider? }
 * Para PayPal: sessionId = PAYPAL_<orderID>, y se deben enviar packId, amountPaid, currency, paymentProvider: 'paypal'.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await activatePurchase(body)
    return NextResponse.json(result)
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error('Activate purchase error:', e)
    return NextResponse.json({ error: getErrorMessage(e) || 'Error al activar la compra' }, { status: 500 })
  }
}
