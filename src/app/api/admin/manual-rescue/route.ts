/**
 * POST: Rescate manual de pagos (Stripe pi_... o PayPal Order ID).
 * Body: { ids: string } — lista de IDs separados por coma o salto de línea (pi_... o alfanumérico PayPal).
 * Opcional: { emails?: string } — "id,email@.com" por línea si falta email.
 * Para cada ID: valida en Stripe o PayPal, busca/crea usuario, inserta purchase, envía email "Acceso Liberado".
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'
import { stripe } from '@/lib/stripe'
import { sendEmail, buildAccessLiberatedEmailHtml, getDashboardUrl } from '@/lib/brevo-email'
import {
  createStorageBoxSubaccount,
  isHetznerFtpConfigured,
} from '@/lib/hetzner-robot'
import { isFtpConfigured } from '@/lib/ftp-stream'

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
  if (!clientId || !secret) throw new Error('PayPal credentials not configured')
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64')
  const baseUrl = getPayPalBaseUrl()
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${auth}` },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error('PayPal auth failed')
  const data = await res.json()
  return data.access_token
}

function randomPassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 14; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    const isAdmin =
      userRow?.role === 'admin' || isAdminEmailWhitelist(user.email)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Solo administradores' },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const idsRaw = (body.ids as string)?.trim() ?? ''
    const emailsRaw = (body.emails as string)?.trim() ?? ''

    const idLines = idsRaw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    const emailMap: Record<string, string> = {}
    if (emailsRaw) {
      emailsRaw.split(/\n/).forEach((line) => {
        const trimmed = line.trim()
        const match = trimmed.match(/^([^\s,]+)\s*[,\t]\s*([^\s]+@[^\s]+)$/)
        if (match) emailMap[match[1].trim()] = match[2].trim()
      })
    }

    const results: { id: string; status: 'ok' | 'skip' | 'error'; message: string; provider?: 'stripe' | 'paypal' }[] = []
    const admin = createAdminClient()
    const dashboardUrl = getDashboardUrl()

    for (const rawId of idLines) {
      const trimmedId = rawId.trim()
      const isStripe = trimmedId.startsWith('pi_')
      const paypalOrderId = trimmedId.startsWith('PAYPAL_') ? trimmedId.replace(/^PAYPAL_/, '') : trimmedId
      const paymentIdStripe = isStripe ? trimmedId : null
      const paymentIdPayPal = !isStripe ? (paypalOrderId ? `PAYPAL_${paypalOrderId}` : null) : null

      try {
        let email: string = ''
        let customerName: string = ''
        let packId: number = 1
        let amountPaid: number = 0
        let currency: string = 'MXN'
        let paymentId: string = trimmedId
        let provider: 'stripe' | 'paypal' = 'stripe'

        if (isStripe && paymentIdStripe) {
          const piId = paymentIdStripe
          const pi = await stripe.paymentIntents.retrieve(piId)
        if (pi.status !== 'succeeded') {
          results.push({
            id: piId,
            status: 'skip',
            message: `Pago no completado en Stripe (status: ${pi.status})`,
          })
          continue
        }

          email =
            (pi.receipt_email as string) ||
            (pi.metadata?.customer_email as string) ||
            emailMap[piId] ||
            ''
          if (!email || !email.includes('@')) {
            const sessions = await stripe.checkout.sessions.list({
              payment_intent: piId,
              limit: 1,
            })
            const session = sessions.data[0] as any
            if (session?.customer_details?.email) {
              email = (session.customer_details.email || '').trim()
            }
          }
          if (!email || !email.includes('@')) {
            results.push({
              id: piId,
              status: 'error',
              message: 'Sin email en Stripe. Añade en "Correos" como pi_xxx,email@.com',
              provider: 'stripe',
            })
            continue
          }

          packId = Math.max(
            1,
            parseInt(
              (pi.metadata?.pack_id as string) ||
                (await stripe.checkout.sessions
                  .list({ payment_intent: piId, limit: 1 })
                  .then((r) => (r.data[0] as any)?.metadata?.pack_id)) ||
                '1',
              10
            )
          )
          amountPaid = (pi.amount || 0) / 100
          currency = (pi.currency || 'MXN').toUpperCase()
          customerName =
            (pi.metadata?.customer_name as string) ||
            (await stripe.checkout.sessions
              .list({ payment_intent: piId, limit: 1 })
              .then((r) => (r.data[0] as any)?.customer_details?.name)) ||
            ''
          paymentId = piId
          provider = 'stripe'
        } else if (paymentIdPayPal && paypalOrderId) {
          const token = await getPayPalAccessToken()
          const baseUrl = getPayPalBaseUrl()
          const getRes = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!getRes.ok) {
            results.push({
              id: trimmedId.slice(0, 30),
              status: 'error',
              message: 'Orden PayPal no encontrada o no válida',
              provider: 'paypal',
            })
            continue
          }
          const order = await getRes.json()
          let finalOrder = order
          if (order.status === 'CREATED' || order.status === 'APPROVED') {
            const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: '{}',
            })
            if (!captureRes.ok) {
              const errData = await captureRes.json().catch(() => ({}))
              if (errData.name === 'ORDER_ALREADY_CAPTURED' || errData.message?.includes('already been captured')) {
                finalOrder = (await (await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}`, { headers: { Authorization: `Bearer ${token}` } })).json())
              } else {
                results.push({
                  id: trimmedId.slice(0, 30),
                  status: 'error',
                  message: 'PayPal capture falló',
                  provider: 'paypal',
                })
                continue
              }
            } else {
              finalOrder = await captureRes.json()
            }
          } else if (order.status !== 'COMPLETED') {
            results.push({
              id: trimmedId.slice(0, 30),
              status: 'skip',
              message: `Orden PayPal no completada (status: ${order.status})`,
              provider: 'paypal',
            })
            continue
          }
          const pu = finalOrder.purchase_units?.[0]
          email = (finalOrder.payer?.email_address || emailMap[trimmedId] || emailMap[paymentIdPayPal] || '').trim()
          if (!email || !email.includes('@')) {
            results.push({
              id: trimmedId.slice(0, 30),
              status: 'error',
              message: 'Sin email en PayPal. Añade en "Correos" como ORDERID,email@.com',
              provider: 'paypal',
            })
            continue
          }
          customerName = finalOrder.payer?.name
            ? `${finalOrder.payer.name.given_name || ''} ${finalOrder.payer.name.surname || ''}`.trim()
            : ''
          const customId = pu?.custom_id || ''
          packId = customId.startsWith('pack_id:') ? Math.max(1, parseInt(customId.replace('pack_id:', ''), 10) || 1) : 1
          amountPaid = pu?.amount?.value ? parseFloat(pu.amount.value) : 0
          currency = (pu?.amount?.currency_code || 'MXN').toUpperCase()
          paymentId = paymentIdPayPal
          provider = 'paypal'
        } else {
          results.push({
            id: trimmedId.slice(0, 25),
            status: 'error',
            message: 'ID inválido (Stripe: pi_... o PayPal: Order ID alfanumérico)',
          })
          continue
        }

        let userId: string
        let passwordSent: string | undefined

        const { data: existingUser } = await (admin as any)
          .from('users')
          .select('id')
          .eq('email', email.toLowerCase())
          .maybeSingle()

        if (existingUser?.id) {
          userId = existingUser.id
        } else {
          const tempPassword = randomPassword()
          const { data: newAuth, error: createErr } = await (admin.auth as any).admin.createUser({
            email: email.toLowerCase(),
            password: tempPassword,
            email_confirm: true,
            user_metadata: { name: customerName || undefined },
          })
          if (createErr) {
            const msg = (createErr.message || '').toLowerCase()
            if (msg.includes('already') || msg.includes('registered')) {
              const { data: retry } = await (admin as any)
                .from('users')
                .select('id')
                .eq('email', email.toLowerCase())
                .maybeSingle()
              if (retry?.id) userId = retry.id
              else {
                results.push({
                  id: paymentId.slice(0, 30),
                  status: 'error',
                  message: 'Usuario ya existe pero no se pudo obtener',
                  provider,
                })
                continue
              }
            } else {
              results.push({
                id: paymentId.slice(0, 30),
                status: 'error',
                message: createErr.message || 'Error al crear usuario',
                provider,
              })
              continue
            }
          } else if (newAuth?.user?.id) {
            userId = newAuth.user.id
            await (admin as any).from('users').insert({
              id: userId,
              email: email.toLowerCase(),
              name: customerName || null,
            })
            passwordSent = tempPassword
          } else {
            results.push({ id: paymentId.slice(0, 30), status: 'error', message: 'No se pudo crear usuario', provider })
            continue
          }
        }

        const { data: existingPurchase } = await (admin as any)
          .from('purchases')
          .select('id')
          .eq('user_id', userId)
          .eq('pack_id', packId)
          .maybeSingle()

        if (existingPurchase) {
          results.push({
            id: paymentId.slice(0, 30),
            status: 'skip',
            message: `${email.split('@')[0]}… ya tenía compra activada`,
            provider,
          })
          continue
        }

        let ftp_username: string
        let ftp_password: string
        if (isHetznerFtpConfigured()) {
          const storageboxId = process.env.HETZNER_STORAGEBOX_ID!
          const subUsername = `u${storageboxId}-sub-${userId.slice(0, 8)}`
          const subPassword = randomPassword()
          const result = await createStorageBoxSubaccount(
            storageboxId,
            subUsername,
            subPassword,
            true
          )
          if (result.ok) {
            ftp_username = result.username
            ftp_password = result.password
          } else {
            ftp_username = `dj_${userId.slice(0, 8)}`
            ftp_password = randomPassword()
          }
        } else if (isFtpConfigured()) {
          ftp_username = process.env.FTP_USER || process.env.HETZNER_FTP_USER!
          ftp_password = process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD!
        } else {
          ftp_username = `dj_${userId.slice(0, 8)}`
          ftp_password = randomPassword()
        }

        const { error: insertErr } = await (admin as any).from('purchases').insert({
          user_id: userId,
          pack_id: packId,
          amount_paid: amountPaid,
          currency,
          payment_provider: provider,
          payment_id: paymentId,
          ftp_username,
          ftp_password,
        })

        if (insertErr) {
          results.push({
            id: paymentId.slice(0, 30),
            status: 'error',
            message: (insertErr as Error).message || 'Error al insertar compra',
            provider,
          })
          continue
        }

        const displayName =
          (customerName || email.split('@')[0] || 'DJ').trim().replace(/[<>"&]/g, '') || 'DJ'
        const html = buildAccessLiberatedEmailHtml(dashboardUrl)
        const emailResult = await sendEmail(
          email,
          '🐺 Acceso Liberado: Tu Pack Bear Beat está listo',
          html,
          { name: displayName, tags: ['rescue', 'manual', 'access_liberated'] }
        )

        if (emailResult.success) {
          results.push({
            id: paymentId.slice(0, 30),
            status: 'ok',
            message: `${email.split('@')[0]}… activado (${provider}), email enviado`,
            provider,
          })
        } else {
          results.push({
            id: paymentId.slice(0, 30),
            status: 'ok',
            message: `${email.split('@')[0]}… activado (${provider}), email falló: ${emailResult.error || 'unknown'}`,
            provider,
          })
        }
      } catch (err: any) {
        results.push({
          id: trimmedId.slice(0, 30),
          status: 'error',
          message: err?.message || String(err),
        })
      }
    }

    return NextResponse.json({ results })
  } catch (e: any) {
    console.error('manual-rescue error:', e)
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    )
  }
}
