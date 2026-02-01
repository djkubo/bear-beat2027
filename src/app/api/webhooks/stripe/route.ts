import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { upsertSubscriber, addMultipleTags, BEAR_BEAT_TAGS } from '@/lib/manychat'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServerClient()

  // Procesar el evento
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const packId = Number(session.metadata.pack_id)

    try {
      // 1. Crear registro de COMPRA PENDIENTE (pago exitoso, datos pendientes)
      const { error: pendingError } = await supabase
        .from('pending_purchases')
        .insert({
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          pack_id: packId,
          amount_paid: session.amount_total / 100,
          currency: session.currency.toUpperCase(),
          payment_provider: 'stripe',
          customer_email: session.customer_details?.email,
          customer_name: session.customer_details?.name,
          customer_phone: session.customer_details?.phone,
          payment_status: 'paid',
          status: 'awaiting_completion',
        })
      
      if (pendingError) {
        console.error('Error creating pending purchase:', pendingError)
        throw pendingError
      }
      
      console.log('✅ Pago recibido, esperando datos del usuario:', {
        sessionId: session.id,
        packId,
        amount: session.amount_total / 100,
        email: session.customer_details?.email,
      })
      
      // Track evento de pago exitoso
      await supabase.from('user_events').insert({
        session_id: session.id,
        event_type: 'payment_success',
        event_name: 'Pago completado',
        event_data: {
          pack_id: packId,
          amount: session.amount_total / 100,
          currency: session.currency,
          session_id: session.id,
        },
      })
      
      // ==========================================
      // SINCRONIZAR CON MANYCHAT (si hay email/phone)
      // ==========================================
      const customerEmail = session.customer_details?.email
      const customerPhone = session.customer_details?.phone
      const customerName = session.customer_details?.name
      
      if (customerEmail || customerPhone) {
        try {
          // Crear/actualizar suscriptor en ManyChat
          const nameParts = (customerName || '').split(' ')
          const subscriber = await upsertSubscriber({
            email: customerEmail,
            phone: customerPhone,
            whatsapp_phone: customerPhone,
            first_name: nameParts[0] || 'Cliente',
            last_name: nameParts.slice(1).join(' ') || '',
          })
          
          if (subscriber) {
            // Agregar tags de pago exitoso
            await addMultipleTags(subscriber.id, [
              BEAR_BEAT_TAGS.PAYMENT_SUCCESS,
              BEAR_BEAT_TAGS.PAYMENT_INTENT,
            ])
            
            console.log('ManyChat: Payment tracked for subscriber:', subscriber.id)
          }
        } catch (mcError) {
          // No fallar el webhook si ManyChat falla
          console.error('ManyChat sync error (non-critical):', mcError)
        }
      }
      // ==========================================
      
      // NOTA: NO creamos usuario ni activamos acceso todavía
      // Eso sucede cuando el usuario complete sus datos en /complete-purchase
      
      return NextResponse.json({ received: true })
    } catch (error) {
      console.error('Error processing webhook:', error)
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}

function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}
