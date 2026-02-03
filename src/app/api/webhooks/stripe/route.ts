import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { upsertSubscriber, addMultipleTags, BEAR_BEAT_TAGS } from '@/lib/manychat'
import { sendServerEvent } from '@/lib/fpixel-server'
import {
  createStorageBoxSubaccount,
  isHetznerFtpConfigured,
} from '@/lib/hetzner-robot'
import { isFtpConfigured } from '@/lib/ftp-stream'

function generateRandomPassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 16; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

function generateFtpPassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 14; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

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

  // CAPI Purchase: mismo event_id que el Pixel para deduplicación
  const sendCapiPurchase = async (eventId: string, email: string | undefined, amount: number, currency: string) => {
    try {
      await sendServerEvent(
        'Purchase',
        eventId,
        { email: email || undefined },
        {
          value: amount,
          currency: currency.toUpperCase(),
          content_ids: ['pack-enero-2026'],
          content_type: 'product',
          num_items: 1,
          order_id: eventId,
        }
      )
    } catch (e) {
      console.warn('CAPI Purchase failed (non-critical):', e)
    }
  }

  // payment_intent.succeeded (pago con tarjeta / Elements)
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as { id: string; amount: number; currency: string; receipt_email?: string; metadata?: { customer_email?: string; customer_name?: string } }
    const email = pi.receipt_email || (pi.metadata?.customer_email as string)
    const amount = (pi.amount || 0) / 100
    const currency = (pi.currency || 'mxn').toUpperCase()
    await sendCapiPurchase(pi.id, email, amount, currency)
    if (email && typeof email === 'string' && email.includes('@')) {
      try {
        const admin = createAdminClient()
        const { data: existingUserData } = await (admin.from('users') as any).select('id').eq('email', email).maybeSingle()
        const existingUser = existingUserData as { id: string } | null
        const customerName = (pi.metadata?.customer_name as string) || ''
        if (existingUser?.id) {
          await (admin.auth as any).admin.updateUserById(existingUser.id, { email_confirm: true })
        } else {
          const tempPassword = generateRandomPassword()
          const { data: newAuth, error: createErr } = await (admin.auth as any).admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { name: customerName || undefined },
          })
          if (!createErr && newAuth?.user) {
            await (admin.from('users') as any).insert({ id: newAuth.user.id, email, name: customerName || null })
          } else if (createErr?.message?.includes('already') || createErr?.message?.includes('registered')) {
            const { data: list } = await (admin.auth as any).admin.listUsers({ page: 1, perPage: 1000 })
            const authUser = list?.users?.find((u: { email?: string }) => u.email === email)
            if (authUser?.id) {
              await (admin.auth as any).admin.updateUserById(authUser.id, { email_confirm: true })
              await (admin.from('users') as any).upsert({ id: authUser.id, email, name: customerName || null }, { onConflict: 'id' })
            }
          }
        }
      } catch (_) {}
    }
  }

  // Procesar el evento
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const packId = Math.max(1, parseInt(session.metadata?.pack_id || '1', 10) || 1)

    try {
      // Idempotencia: si ya procesamos esta sesión, no duplicar
      const { data: existing } = await supabase
        .from('pending_purchases')
        .select('id')
        .eq('stripe_session_id', session.id)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ received: true })
      }

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
      
      const amount = session.amount_total / 100
      const utm_source = (session.metadata?.utm_source as string) || null
      const utm_medium = (session.metadata?.utm_medium as string) || null
      const utm_campaign = (session.metadata?.utm_campaign as string) || null
      // Track evento de pago exitoso con UTM para atribución (get_traffic_stats / get_top_campaigns)
      await supabase.from('user_events').insert({
        session_id: session.id,
        event_type: 'payment_success',
        event_name: 'Pago completado',
        event_data: {
          pack_id: packId,
          amount,
          currency: session.currency,
          session_id: session.id,
          stripe_session_id: session.id,
        },
        utm_source: utm_source || undefined,
        utm_medium: utm_medium || undefined,
        utm_campaign: utm_campaign || undefined,
      })
      
      // ==========================================
      // SINCRONIZAR CON MANYCHAT (si hay email/phone)
      // Validación: upsertSubscriber con email del cliente + tag PAYMENT_SUCCESS
      // ==========================================
      const customerEmail = session.customer_details?.email
      const customerPhone = session.customer_details?.phone
      const customerName = session.customer_details?.name
      
      if (customerEmail || customerPhone) {
        try {
          const nameParts = (customerName || '').split(' ')
          const subscriber = await upsertSubscriber({
            email: customerEmail,
            phone: customerPhone,
            whatsapp_phone: customerPhone,
            first_name: nameParts[0] || 'Cliente',
            last_name: nameParts.slice(1).join(' ') || '',
          })
          
          if (subscriber) {
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

      // Crear o confirmar usuario Auth con email_confirm: true (evita bloqueo de login)
      if (customerEmail && typeof customerEmail === 'string' && customerEmail.includes('@')) {
        try {
          const admin = createAdminClient()
          const { data: existingUserData } = await (admin.from('users') as any).select('id').eq('email', customerEmail).maybeSingle()
          const existingUser = existingUserData as { id: string } | null
          if (existingUser?.id) {
            await (admin.auth as any).admin.updateUserById(existingUser.id, { email_confirm: true })
            console.log('Usuario existente confirmado:', customerEmail)
          } else {
            const tempPassword = generateRandomPassword()
            const { data: newAuth, error: createErr } = await (admin.auth as any).admin.createUser({
              email: customerEmail,
              password: tempPassword,
              email_confirm: true,
              user_metadata: { name: customerName || undefined },
            })
            if (!createErr && newAuth?.user) {
              await (admin.from('users') as any).insert({
                id: newAuth.user.id,
                email: customerEmail,
                name: customerName || null,
              })
              console.log('Usuario Auth creado (email confirmado):', customerEmail)
            } else if (createErr?.message?.includes('already') || createErr?.message?.includes('registered')) {
              const { data: list } = await (admin.auth as any).admin.listUsers({ page: 1, perPage: 1000 })
              const authUser = list?.users?.find((u: { email?: string }) => u.email === customerEmail)
              if (authUser?.id) {
                await (admin.auth as any).admin.updateUserById(authUser.id, { email_confirm: true })
                await (admin.from('users') as any).upsert({ id: authUser.id, email: customerEmail, name: customerName || null }, { onConflict: 'id' })
                console.log('Usuario Auth ya existía, confirmado:', customerEmail)
              }
            }
          }
        } catch (authErr) {
          console.warn('Webhook: crear/confirmar usuario Auth (non-critical):', authErr)
        }
      }

      // Auto-activar compra: crear fila en purchases para que el usuario tenga "1 pack" y acceso sin pasar por /complete-purchase
      if (customerEmail && typeof customerEmail === 'string' && customerEmail.includes('@')) {
        try {
          const admin = createAdminClient()
          const { data: userRow } = await (admin.from('users') as any).select('id').eq('email', customerEmail).maybeSingle()
          const userId = userRow?.id
          if (userId) {
            const amountPaid = session.amount_total / 100
            const currency = (session.currency || 'MXN').toUpperCase()
            const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any)?.id || session.id
            const utm_source = (session.metadata?.utm_source as string) || null
            const utm_medium = (session.metadata?.utm_medium as string) || null
            const utm_campaign = (session.metadata?.utm_campaign as string) || null

            const { data: existingPurchase } = await (admin as any).from('purchases').select('id').eq('user_id', userId).eq('pack_id', packId).maybeSingle()
            if (!existingPurchase) {
              let ftp_username: string
              let ftp_password: string
              if (isHetznerFtpConfigured()) {
                const storageboxId = process.env.HETZNER_STORAGEBOX_ID!
                const subUsername = `u${storageboxId}-sub-${userId.slice(0, 8)}`
                const subPassword = generateFtpPassword()
                const result = await createStorageBoxSubaccount(storageboxId, subUsername, subPassword, true)
                if (result.ok) {
                  ftp_username = result.username
                  ftp_password = result.password
                } else {
                  ftp_username = `dj_${userId.slice(0, 8)}`
                  ftp_password = generateFtpPassword()
                }
              } else if (isFtpConfigured()) {
                ftp_username = process.env.FTP_USER || process.env.HETZNER_FTP_USER!
                ftp_password = process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD!
              } else {
                ftp_username = `dj_${userId.slice(0, 8)}`
                ftp_password = generateFtpPassword()
              }

              await (admin as any).from('purchases').insert({
                user_id: userId,
                pack_id: packId,
                amount_paid: amountPaid,
                currency,
                payment_provider: 'stripe',
                payment_id: paymentIntent,
                ftp_username,
                ftp_password,
                ...(utm_source && { utm_source }),
                ...(utm_medium && { utm_medium }),
                ...(utm_campaign && { utm_campaign }),
                ...(utm_source && { traffic_source: utm_source }),
              })
              await (admin as any).from('pending_purchases').update({
                user_id: userId,
                status: 'completed',
                completed_at: new Date().toISOString(),
              }).eq('stripe_session_id', session.id)
              console.log('Webhook: compra auto-activada para', customerEmail, 'pack_id', packId)
            }
          }
        } catch (autoActivateErr: any) {
          console.warn('Webhook: auto-activar compra (non-critical):', autoActivateErr?.message || autoActivateErr)
        }
      }

      // CAPI Purchase (mismo event_id que el cliente para deduplicación)
      await sendCapiPurchase(
        session.id,
        session.customer_details?.email,
        session.amount_total / 100,
        (session.currency || 'mxn').toUpperCase()
      )
      
      return NextResponse.json({ received: true })
    } catch (error) {
      console.error('Error processing webhook:', error)
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
