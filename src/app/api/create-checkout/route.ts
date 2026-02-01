import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase/server'

// Fallback solo cuando no hay DB
async function getPackWithVideoCount(supabase: Awaited<ReturnType<typeof createServerClient>>, packSlug: string) {
  const { data: packRow } = await supabase.from('packs').select('*').eq('slug', packSlug).eq('status', 'available').single()
  if (!packRow) return null
  const { count } = await supabase.from('videos').select('*', { count: 'exact', head: true }).eq('pack_id', packRow.id)
  return {
    ...packRow,
    total_videos: count ?? packRow.total_videos ?? 0,
  }
}

export async function POST(req: NextRequest) {
  try {
    const { packSlug, paymentMethod, currency = 'mxn' } = await req.json()
    
    if (!packSlug) {
      return NextResponse.json({ error: 'Pack slug required' }, { status: 400 })
    }
    
    const supabase = await createServerClient()
    
    // Verificar si hay usuario logueado
    let loggedUser: { id: string; email: string; name?: string } | null = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        loggedUser = {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || '',
        }
        console.log('Usuario logueado detectado:', loggedUser.email)
      }
    } catch (e) {
      console.log('No user logged in')
    }
    
    let pack: any = null
    try {
      pack = await getPackWithVideoCount(supabase, packSlug)
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
    } catch (e) {
      console.log('DB not available, using fallback pack')
      pack = { id: 1, slug: packSlug, name: 'Pack Enero 2026', total_videos: 0, price_mxn: 350, price_usd: 19, status: 'available' }
    }
    
    // Precio según moneda
    const prices: Record<string, number> = {
      'mxn': pack.price_mxn || 350,
      'usd': pack.price_usd || 19,
      'eur': 17,
    }
    const price = prices[currency] || pack.price_usd
    
    // Configurar payment_method_types según método
    let paymentMethodTypes: string[] = ['card']
    
    if (paymentMethod === 'oxxo') {
      paymentMethodTypes = ['oxxo']
    } else if (paymentMethod === 'spei') {
      // SPEI es customer_balance en Stripe
      paymentMethodTypes = ['customer_balance']
    } else if (paymentMethod === 'paypal') {
      paymentMethodTypes = ['paypal']
    }
    
    // Configuración base de la sesión
    const sessionConfig: any = {
      mode: 'payment',
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Bear Beat - ${pack.name}`,
              description: `${pack.total_videos} videos HD/4K organizados por género. Pago único, acceso permanente.`,
              images: [`${process.env.NEXT_PUBLIC_APP_URL}/logos/BBLOGOTIPOPOSITIVO_Mesa%20de%20trabajo%201.png`],
            },
            unit_amount: Math.round(price * 100), // En centavos
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/complete-purchase?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?canceled=true&pack=${pack.slug}`,
      metadata: {
        pack_id: pack.id.toString(),
        pack_slug: pack.slug,
        // Si hay usuario logueado, guardar su ID para asociar la compra
        ...(loggedUser && { user_id: loggedUser.id }),
      },
      billing_address_collection: 'auto',
      phone_number_collection: {
        enabled: true,
      },
    }
    
    // Si el usuario está logueado, pre-rellenar su email en Stripe
    if (loggedUser?.email) {
      sessionConfig.customer_email = loggedUser.email
    }
    
    // Configuración específica por método de pago
    if (paymentMethod === 'oxxo') {
      sessionConfig.payment_method_options = {
        oxxo: {
          expires_after_days: 3,
        },
      }
    }
    
    if (paymentMethod === 'spei') {
      // SPEI requiere customer_balance
      sessionConfig.payment_method_options = {
        customer_balance: {
          funding_type: 'bank_transfer',
          bank_transfer: {
            type: 'mx_bank_transfer', // SPEI México
          },
        },
      }
    }
    
    // Crear sesión de Stripe
    const session = await stripe.checkout.sessions.create(sessionConfig)
    
    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error: any) {
    console.error('Error creating checkout:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout' },
      { status: 500 }
    )
  }
}
