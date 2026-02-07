import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { upsertSubscriber, addMultipleTags, BEAR_BEAT_TAGS } from '@/lib/manychat'
import { sendServerEvent } from '@/lib/fpixel-server'
import {
  createStorageBoxSubaccount,
  isHetznerFtpConfigured,
} from '@/lib/hetzner-robot'
import { isFtpConfigured } from '@/lib/ftp-stream'
import { sendEmail, sendPaymentFailedRecoveryEmail, buildAccessLiberatedEmailHtml, getDashboardUrl } from '@/lib/brevo-email'
import { sendSms } from '@/lib/brevo-sms'

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

  // Webhooks no tienen sesión de usuario: usar service role para evitar depender de RLS pública.
  const supabase = createAdminClient()

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

  // payment_intent.payment_failed – recuperación: Email "Acceso Pausado" + SMS "Alerta Roja"
  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as any
    let email = (pi.receipt_email || pi.metadata?.customer_email || '').trim()
    let phone = (pi.metadata?.customer_phone || '').trim()
    let name = (pi.metadata?.customer_name || 'DJ').trim()
    let packSlug = pi.metadata?.pack_slug || 'enero-2026'

    if (!email && pi.id) {
      try {
        const sessions = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 })
        if (sessions.data.length > 0) {
          const s = sessions.data[0]
          email = (s.customer_details?.email || '').trim()
          phone = (s.customer_details?.phone || '').trim()
          name = (s.customer_details?.name || name).trim()
          packSlug = (s.metadata?.pack_slug as string) || packSlug
        }
      } catch (err) {
        console.error('Error recuperando sesión para fallido:', err)
      }
    }

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') || 'https://bear-beat2027.onrender.com'
    const recoveryLink = `${baseUrl}/checkout?pack=${encodeURIComponent(packSlug)}&retry=1`

    if (phone && phone.length >= 10) {
      try {
        const smsBody = `BearBeat: 🛑 Tu banco rechazó la transacción. Tu cupo está reservado por 15 min más. Finaliza aquí: ${recoveryLink}`
        await sendSms(phone, smsBody, undefined, { tag: 'payment_failed' })
        console.log('📱 SMS Recuperación enviado')
      } catch (e) {
        console.error('Error SMS Recuperación:', e)
      }
    }

    if (email && email.includes('@')) {
      try {
        const emailResult = await sendPaymentFailedRecoveryEmail({
          to: email,
          name: name || undefined,
          recoveryUrl: recoveryLink,
        })
        if (emailResult.success) {
          console.log('📧 Email Recuperación enviado')
        } else {
          console.warn('Email Recuperación no enviado:', emailResult.error)
        }
      } catch (e) {
        console.error('Error Email Recuperación:', e)
      }
    }
  }

  // payment_intent.succeeded (pago con tarjeta / Elements) – Modo Bestia: SMS Bienvenida Élite
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as {
      id: string
      amount: number
      currency: string
      receipt_email?: string
      metadata?: { customer_email?: string; customer_name?: string; customer_phone?: string }
    }
    const email = pi.receipt_email || (pi.metadata?.customer_email as string)
    let phone = (pi.metadata?.customer_phone as string)?.trim() || ''
    if (!phone && pi.id) {
      try {
        const sessions = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 })
        if (sessions.data[0]?.customer_details?.phone) {
          phone = String(sessions.data[0].customer_details.phone).trim()
        }
      } catch (_) {}
    }
    const amount = (pi.amount || 0) / 100
    const currency = (pi.currency || 'mxn').toUpperCase()
    await sendCapiPurchase(pi.id, email, amount, currency)
    if (phone && phone.replace(/\D/g, '').length >= 10) {
      try {
        await sendSms(
          phone,
          'BearBeat: Pago confirmado 💳. Tu arsenal está desbloqueado. Entra a tu panel y descarga todo ya. 🔥',
          undefined,
          { tag: 'payment_success' }
        )
        console.log('📱 SMS Bienvenida Élite enviado')
      } catch (e) {
        console.warn('SMS Bienvenida Élite (non-critical):', e)
      }
    }
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

    // OXXO / pagos asíncronos: checkout.session.completed llega al generar la referencia (unpaid). Cuando pagan, Stripe envía payment_intent.succeeded. Aquí activamos la compra.
    const customerEmailForActivation = email || (pi.metadata?.customer_email as string)
    if (customerEmailForActivation && typeof customerEmailForActivation === 'string' && customerEmailForActivation.includes('@')) {
      try {
        const sessions = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 })
        const session = sessions.data[0] as any
        if (session?.metadata?.pack_id) {
          const packId = Math.max(1, parseInt(session.metadata.pack_id || '1', 10) || 1)
          const admin = createAdminClient()
          const { data: userRow } = await (admin.from('users') as any).select('id').eq('email', customerEmailForActivation).maybeSingle()
          const userId = userRow?.id
          if (userId) {
            const { data: existingPurchase } = await (admin as any).from('purchases').select('id').eq('user_id', userId).eq('pack_id', packId).maybeSingle()
            if (!existingPurchase) {
              const amountPaid = (session.amount_total || pi.amount) / 100
              const currency = ((session.currency || pi.currency) || 'MXN').toUpperCase()
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
              const { error: insertErr } = await (admin as any).from('purchases').insert({
                user_id: userId,
                pack_id: packId,
                amount_paid: amountPaid,
                currency,
                payment_provider: 'stripe',
                payment_id: pi.id,
                ftp_username,
                ftp_password,
              })
              if (insertErr) {
                console.error('Webhook payment_intent.succeeded: error insertando purchase', insertErr)
                return NextResponse.json({ error: 'Activación fallida' }, { status: 500 })
              }
              if (session.id) {
                await (admin as any).from('pending_purchases').update({
                  user_id: userId,
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                }).eq('stripe_session_id', session.id)
              }
              console.log('Webhook: compra activada por payment_intent.succeeded (OXXO/async) para', customerEmailForActivation, 'pack_id', packId)
              try {
                const displayNamePi = (session.customer_details?.name || (pi.metadata?.customer_name as string) || customerEmailForActivation.split('@')[0] || 'DJ').trim()
                const htmlPi = buildAccessLiberatedEmailHtml(getDashboardUrl())
                await sendEmail(
                  customerEmailForActivation,
                  '🐺 Acceso Liberado: Tu Pack Bear Beat está listo',
                  htmlPi,
                  { name: displayNamePi, tags: ['payment', 'access_liberated'] }
                )
                console.log('Email Acceso Liberado (payment_intent.succeeded) enviado a', customerEmailForActivation)
              } catch (e) {
                console.warn('sendEmail Acceso Liberado (payment_intent.succeeded, non-critical):', e)
              }
            } else {
              // Usuario ya tenía compra (renovación/recompra): enviar email igual
              try {
                const displayNamePi = (session.customer_details?.name || (pi.metadata?.customer_name as string) || customerEmailForActivation.split('@')[0] || 'DJ').trim()
                const htmlPi = buildAccessLiberatedEmailHtml(getDashboardUrl())
                await sendEmail(
                  customerEmailForActivation,
                  '🐺 Acceso Liberado: Tu Pack Bear Beat está listo',
                  htmlPi,
                  { name: displayNamePi, tags: ['payment', 'access_liberated'] }
                )
                console.log('Email Acceso Liberado (recompra, payment_intent) enviado a', customerEmailForActivation)
              } catch (e) {
                console.warn('sendEmail Acceso Liberado recompra (non-critical):', e)
              }
            }
          }
        }
      } catch (activateErr) {
        console.error('Webhook payment_intent.succeeded: activación OXXO/async', activateErr)
      }
    }
  }

  // Procesar el evento
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const packId = Math.max(1, parseInt(session.metadata?.pack_id || '1', 10) || 1)
    const customerEmail = session.customer_details?.email
    const customerPhone = session.customer_details?.phone
    const customerName = session.customer_details?.name

    // OXXO/transferencia: la sesión se completa al generar la referencia, no al pagar. Solo activar cuando esté pagado.
    if (session.payment_status !== 'paid') {
      console.log('checkout.session.completed con payment_status != paid (ej. OXXO pendiente), omitiendo activación:', session.id)
      return NextResponse.json({ received: true })
    }

    try {
      // Idempotencia: si ya existe pending y ya hay compra activada para este cliente+pack, solo confirmar
      const { data: existingPending } = await supabase
        .from('pending_purchases')
        .select('id')
        .eq('stripe_session_id', session.id)
        .maybeSingle()

      if (existingPending && customerEmail && typeof customerEmail === 'string' && customerEmail.includes('@')) {
        const admin = createAdminClient()
        const { data: userRow } = await (admin.from('users') as any).select('id').eq('email', customerEmail).maybeSingle()
        const userId = userRow?.id
        if (userId) {
          const { data: existingPurchase } = await (admin as any).from('purchases').select('id').eq('user_id', userId).eq('pack_id', packId).maybeSingle()
          if (existingPurchase) {
            // Renovación/recompra: enviar email de acceso igual
            try {
              const displayName = (customerName || customerEmail.split('@')[0] || 'DJ').trim()
              const html = buildAccessLiberatedEmailHtml(getDashboardUrl())
              await sendEmail(
                customerEmail,
                '🐺 Acceso Liberado: Tu Pack Bear Beat está listo',
                html,
                { name: displayName, tags: ['payment', 'access_liberated'] }
              )
              console.log('Email Acceso Liberado (recompra) enviado a', customerEmail)
            } catch (e) {
              console.warn('sendEmail Acceso Liberado (non-critical):', e)
            }
            return NextResponse.json({ received: true })
          }
        }
        // Hay pending pero no compra activada (falló en un intento anterior): seguimos para reintentar auto-activar
      }

      // 1. Crear registro de COMPRA PENDIENTE solo si no existe (para que Stripe pueda reintentar si falla la activación)
      if (!existingPending) {
        const { error: pendingError } = await (supabase as any)
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
        try {
          await (supabase as any).from('user_events').insert({
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
        } catch (trackErr) {
          console.warn('user_events insert (non-critical):', (trackErr as Error)?.message ?? trackErr)
        }

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
            console.error('ManyChat sync error (non-critical):', mcError)
          }
        }
      }

      // Crear o confirmar usuario Auth
      if (customerEmail && typeof customerEmail === 'string' && customerEmail.includes('@')) {
        try {
          const admin = createAdminClient()
          const { data: existingUserData } = await (admin.from('users') as any).select('id').eq('email', customerEmail).maybeSingle()
          const existingUser = existingUserData as { id: string } | null
          if (existingUser?.id) {
            await (admin.auth as any).admin.updateUserById(existingUser.id, { email_confirm: true })
            if (!existingPending) console.log('Usuario existente confirmado:', customerEmail)
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
              if (!existingPending) console.log('Usuario Auth creado (email confirmado):', customerEmail)
              // Email de éxito (Neuroventas): copy de élite + credenciales
              const loginUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') || 'https://bear-beat2027.onrender.com/login'
              const customerDisplayName = (customerName || customerEmail.split('@')[0] || 'DJ').trim()
              const emailHtml = `
  <h1>¡Bienvenido a la Élite, ${customerDisplayName}! 💿</h1>
  <p>Tu pago entró perfecto. Ya eres parte del 1% de DJs que invierten en su carrera.</p>
  <p><strong>Tus Credenciales de Acceso:</strong></p>
  <ul>
    <li>Usuario: <strong>${customerEmail}</strong></li>
    <li>Contraseña: <strong>${tempPassword}</strong></li>
  </ul>
  <p><a href="${loginUrl}" style="background:#00f2ea; color:black; padding:10px 20px; text-decoration:none; font-weight:bold; border-radius:5px;">👉 ENTRAR AL PANEL AHORA</a></p>
  <p><em>PD: Guarda este correo. Tienes garantía total.</em></p>
              `.trim()
              try {
                const emailResult = await sendEmail(
                  customerEmail,
                  '⚠️ TUS ACCESOS: Pack Video Remixes 2026 (IMPORTANTE)',
                  emailHtml,
                  { name: customerDisplayName, tags: ['welcome', 'credentials'] }
                )
                if (emailResult.success) {
                  console.log('Email de acceso (Neuroventas) enviado a', customerEmail)
                } else {
                  console.warn('Email de acceso no enviado:', emailResult.error)
                }
              } catch (e) {
                console.warn('sendEmail (non-critical):', e)
              }
              if (customerPhone && typeof customerPhone === 'string' && customerPhone.trim()) {
                try {
                  await sendSms(
                    customerPhone.trim(),
                    `Bear Beat: Tu acceso está listo. Revisa tu correo (${customerEmail}) para usuario y contraseña.`,
                    undefined,
                    { tag: 'welcome' }
                  )
                } catch (_) {}
              }
            } else if (createErr?.message?.includes('already') || createErr?.message?.includes('registered')) {
              const { data: list } = await (admin.auth as any).admin.listUsers({ page: 1, perPage: 1000 })
              const authUser = list?.users?.find((u: { email?: string }) => u.email === customerEmail)
              if (authUser?.id) {
                await (admin.auth as any).admin.updateUserById(authUser.id, { email_confirm: true })
                await (admin.from('users') as any).upsert({ id: authUser.id, email: customerEmail, name: customerName || null }, { onConflict: 'id' })
                if (!existingPending) console.log('Usuario Auth ya existía, confirmado:', customerEmail)
              }
            }
          }
        } catch (authErr) {
          console.warn('Webhook: crear/confirmar usuario Auth (non-critical):', authErr)
        }
      }

      // Auto-activar compra (crítico: si falla devolvemos 500 para que Stripe reintente)
      if (customerEmail && typeof customerEmail === 'string' && customerEmail.includes('@')) {
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

            const { error: insertErr } = await (admin as any).from('purchases').insert({
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
            if (insertErr) {
              console.error('Webhook: error insertando purchase (devolvemos 500 para reintento):', insertErr)
              return NextResponse.json(
                { error: 'Activación fallida; Stripe reintentará el webhook.' },
                { status: 500 }
              )
            }
            await (admin as any).from('pending_purchases').update({
              user_id: userId,
              status: 'completed',
              completed_at: new Date().toISOString(),
            }).eq('stripe_session_id', session.id)
            console.log('Webhook: compra auto-activada para', customerEmail, 'pack_id', packId)
            if (customerEmail && customerEmail.includes('@')) {
              try {
                const displayName = (customerName || customerEmail.split('@')[0] || 'DJ').trim()
                const html = buildAccessLiberatedEmailHtml(getDashboardUrl())
                await sendEmail(
                  customerEmail,
                  '🐺 Acceso Liberado: Tu Pack Bear Beat está listo',
                  html,
                  { name: displayName, tags: ['payment', 'access_liberated'] }
                )
                console.log('Email Acceso Liberado enviado a', customerEmail)
              } catch (e) {
                console.warn('sendEmail Acceso Liberado (non-critical):', e)
              }
            }
          }
        } else {
          console.error('Webhook: no se encontró usuario para', customerEmail, '(devolvemos 500 para reintento)')
          return NextResponse.json(
            { error: 'Usuario no encontrado; Stripe reintentará el webhook.' },
            { status: 500 }
          )
        }
      }

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
