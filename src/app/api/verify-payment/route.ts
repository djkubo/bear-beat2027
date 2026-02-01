import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

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
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }
    
    // Obtener sesión de Stripe
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
