import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase/server'

// Pack de prueba para desarrollo
const TEST_PACK = {
  id: 1,
  slug: 'enero-2026',
  name: 'Pack Enero 2026',
  total_videos: 157,
}

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id')
    const provider = req.nextUrl.searchParams.get('provider')
    const orderId = req.nextUrl.searchParams.get('order_id')

    // PayPal: verificar por order_id (payment_id en purchases)
    if (provider === 'paypal' && orderId) {
      const supabase = createServerClient()
      const { data: purchase, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('payment_id', orderId)
        .eq('payment_provider', 'paypal')
        .single()

      if (!error && purchase) {
        // Email/nombre pueden venir de PayPal API si se guardan; por ahora vacío, el usuario los completa en el form
        return NextResponse.json({
          success: true,
          sessionId: orderId,
          packId: purchase.pack_id || 1,
          packSlug: 'enero-2026',
          pack: TEST_PACK,
          amount: Number(purchase.amount_paid) ?? 0,
          currency: purchase.currency ?? 'MXN',
          paymentIntent: orderId,
          customerEmail: (purchase as any).customer_email || '',
          customerName: (purchase as any).customer_name || '',
          customerPhone: '',
          paymentStatus: 'paid',
          userId: purchase.user_id ?? null,
        })
      }
      return NextResponse.json(
        { error: 'No se encontró la compra de PayPal' },
        { status: 404 }
      )
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Stripe: verificar por session_id
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'line_items'],
    })
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    // Verificar que el pago fue exitoso
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ 
        error: 'Payment not completed',
        status: session.payment_status,
      }, { status: 400 })
    }
    
    // Extraer datos
    const packSlug = session.metadata?.pack_slug || 'enero-2026'
    const packId = session.metadata?.pack_id || '1'
    // User ID del usuario logueado al momento del pago (si existía)
    const userId = session.metadata?.user_id || null
    
    // Datos del cliente
    const customerEmail = session.customer_details?.email || session.customer_email || ''
    const customerName = session.customer_details?.name || ''
    const customerPhone = session.customer_details?.phone || ''
    
    // Monto
    const amount = (session.amount_total || 0) / 100
    const currency = session.currency?.toUpperCase() || 'MXN'
    
    // Payment Intent ID
    const paymentIntent = typeof session.payment_intent === 'string' 
      ? session.payment_intent 
      : session.payment_intent?.id || ''
    
    return NextResponse.json({
      success: true,
      sessionId,
      packId: parseInt(packId),
      packSlug,
      pack: TEST_PACK, // En producción, buscar en la DB
      amount,
      currency,
      paymentIntent,
      customerEmail,
      customerName,
      customerPhone,
      paymentStatus: session.payment_status,
      // Si el usuario estaba logueado al pagar, devolver su ID
      userId,
    })
    
  } catch (error: any) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
