import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase/server'
import { parseAttributionCookie } from '@/lib/attribution'

async function getPack(supabase: Awaited<ReturnType<typeof createServerClient>>, packSlug: string) {
  const { data: packRow } = await supabase.from('packs').select('*').eq('slug', packSlug).eq('status', 'available').single()
  if (!packRow) return null
  const { count } = await supabase.from('videos').select('*', { count: 'exact', head: true }).eq('pack_id', packRow.id)
  return { ...packRow, total_videos: count ?? packRow.total_videos ?? 0 }
}

/**
 * Busca un Stripe Customer por email o crea uno nuevo.
 * OXXO/SPEI (customer_balance) requieren que el PaymentIntent tenga customer.
 */
async function getOrCreateStripeCustomer(email: string): Promise<string> {
  const existing = await stripe.customers.list({ email, limit: 1 })
  if (existing.data.length > 0) {
    return existing.data[0].id
  }
  const customer = await stripe.customers.create({ email })
  return customer.id
}

/**
 * Crea un PaymentIntent para Stripe Elements (tarjeta, OXXO, SPEI en tabs).
 * OXXO y SPEI (customer_balance) requieren customer; resolvemos por email (body o usuario logueado).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { packSlug, currency = 'mxn', email: bodyEmail } = body as { packSlug?: string; currency?: string; email?: string }
    const cookieHeader = req.headers.get('cookie')
    const attribution = parseAttributionCookie(cookieHeader)

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

    const prices: Record<string, number> = {
      mxn: pack.price_mxn || 350,
      usd: pack.price_usd || 19,
      eur: 17,
    }
    const amount = prices[currency] ?? pack.price_usd ?? 19
    const amountInCents = Math.round(amount * 100)

    let userId: string | null = null
    let userEmail: string | null = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
        userEmail = user.email ?? null
      }
    } catch {}

    const email = (typeof bodyEmail === 'string' && bodyEmail.trim()) ? bodyEmail.trim() : userEmail

    let customerId: string | undefined
    if (email) {
      customerId = await getOrCreateStripeCustomer(email)
    }

    const paymentIntentParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
      amount: amountInCents,
      currency: currency === 'mxn' ? 'mxn' : 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        pack_id: String(pack.id),
        pack_slug: pack.slug,
        ...(userId && { user_id: userId }),
        ...(email && { customer_email: email }),
        ...(attribution?.utm_source && { utm_source: attribution.utm_source }),
        ...(attribution?.utm_medium && { utm_medium: attribution.utm_medium }),
        ...(attribution?.utm_campaign && { utm_campaign: (attribution.utm_campaign || '').slice(0, 500) }),
        ...(attribution?.ref && { ref: (attribution.ref || '').slice(0, 500) }),
      },
    }
    if (customerId) {
      paymentIntentParams.customer = customerId
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (error: any) {
    console.error('create-payment-intent error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
