import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id')
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }
    
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'line_items'],
    })
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ 
        error: 'Payment not completed',
        status: session.payment_status,
      }, { status: 400 })
    }
    
    const packSlug = session.metadata?.pack_slug || 'enero-2026'
    const packId = session.metadata?.pack_id || '1'
    const userId = session.metadata?.user_id || null
    
    const customerEmail = session.customer_details?.email || session.customer_email || ''
    const customerName = session.customer_details?.name || ''
    const customerPhone = session.customer_details?.phone || ''
    
    const amount = (session.amount_total || 0) / 100
    const currency = session.currency?.toUpperCase() || 'MXN'
    
    const paymentIntent = typeof session.payment_intent === 'string' 
      ? session.payment_intent 
      : session.payment_intent?.id || ''
    
    let pack: { id: number; slug: string; name: string; total_videos: number } = {
      id: parseInt(packId),
      slug: packSlug,
      name: 'Pack Enero 2026',
      total_videos: 0,
    }
    try {
      const supabase = await createServerClient()
      const { data: packRow } = await supabase.from('packs').select('id, slug, name').eq('slug', packSlug).single()
      if (packRow) {
        pack.id = packRow.id
        pack.slug = packRow.slug
        pack.name = packRow.name
        const { count } = await supabase.from('videos').select('*', { count: 'exact', head: true }).eq('pack_id', packRow.id)
        pack.total_videos = count ?? 0
      }
    } catch (_) {}
    
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
