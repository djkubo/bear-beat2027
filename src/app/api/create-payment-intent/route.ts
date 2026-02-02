import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase/server'

async function getPack(supabase: Awaited<ReturnType<typeof createServerClient>>, packSlug: string) {
  const { data: packRow } = await supabase.from('packs').select('*').eq('slug', packSlug).eq('status', 'available').single()
  if (!packRow) return null
  const { count } = await supabase.from('videos').select('*', { count: 'exact', head: true }).eq('pack_id', packRow.id)
  return { ...packRow, total_videos: count ?? packRow.total_videos ?? 0 }
}

/**
 * Crea un PaymentIntent para pago con tarjeta (Stripe Elements / Payment Element).
 * Solo para método "card". Devuelve clientSecret para el front.
 */
export async function POST(req: NextRequest) {
  try {
    const { packSlug, currency = 'mxn' } = await req.json()
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
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch {}

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency === 'mxn' ? 'mxn' : 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        pack_id: String(pack.id),
        pack_slug: pack.slug,
        ...(userId && { user_id: userId }),
      },
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (error: any) {
    console.error('create-payment-intent error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
