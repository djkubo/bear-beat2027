import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase/server'
import { parseAttributionCookie } from '@/lib/attribution'

/** OXXO/SPEI (customer_balance) requieren customer en Stripe. Buscar o crear por email. */
async function getOrCreateStripeCustomer(email: string): Promise<string> {
  const existing = await stripe.customers.list({ email, limit: 1 })
  if (existing.data.length > 0) return existing.data[0].id
  const customer = await stripe.customers.create({ email })
  return customer.id
}

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
  let paymentMethod: string | undefined
  try {
    const body = await req.json()
    const cookieHeader = req.headers.get('cookie')
    const attribution = parseAttributionCookie(cookieHeader)
    const { packSlug, paymentMethod: method, currency = 'mxn', email: bodyEmail } = body as {
      packSlug?: string
      paymentMethod?: string
      currency?: string
      email?: string
    }
    paymentMethod = method

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
    
    // Configurar payment_method_types según método (MXN requiere al menos un tipo soportado por la moneda).
    // Incluimos 'link' para pago con tarjeta: Stripe lo muestra si está activo en el Dashboard (MX compatible).
    let paymentMethodTypes: string[] = ['card', 'link']
    
    if (paymentMethod === 'oxxo') {
      paymentMethodTypes = ['oxxo']
    } else if (paymentMethod === 'spei') {
      // SPEI = customer_balance (bank_transfer). Stripe exige al menos un método compatible con MXN:
      // incluir 'card' para que la sesión sea válida; en Checkout el cliente puede elegir transferencia.
      paymentMethodTypes = ['card', 'customer_balance']
    } else if (paymentMethod === 'paypal') {
      paymentMethodTypes = ['paypal']
    }
    
    // OXXO/SPEI (customer_balance) requieren customer; email obligatorio
    const emailForCustomer =
      typeof bodyEmail === 'string' && bodyEmail.trim()
        ? bodyEmail.trim()
        : loggedUser?.email ?? null
    if (paymentMethod === 'oxxo' || paymentMethod === 'spei') {
      if (!emailForCustomer || !emailForCustomer.includes('@')) {
        return NextResponse.json(
          { error: 'Para pagar con OXXO o SPEI necesitas ingresar tu email en el checkout.' },
          { status: 400 }
        )
      }
    }
    let stripeCustomerId: string | null = null
    if (emailForCustomer && (paymentMethod === 'oxxo' || paymentMethod === 'spei')) {
      stripeCustomerId = await getOrCreateStripeCustomer(emailForCustomer)
    }

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') || (process.env.NODE_ENV === 'production' ? 'https://bear-beat2027.onrender.com' : '')
    if (!baseUrl) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL no configurada' }, { status: 500 })
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
              images: [`${baseUrl}/logos/BBLOGOTIPOPOSITIVO_Mesa%20de%20trabajo%201.png`],
            },
            unit_amount: Math.round(price * 100), // En centavos
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/complete-purchase?session_id={CHECKOUT_SESSION_ID}${emailForCustomer ? `&email=${encodeURIComponent(emailForCustomer)}` : ''}`,
      cancel_url: `${baseUrl}/checkout?canceled=true&pack=${pack.slug}`,
      metadata: {
        pack_id: pack.id.toString(),
        pack_slug: pack.slug,
        ...(loggedUser && {
          user_id: loggedUser.id,
          customer_email: loggedUser.email,
          ...(loggedUser.name && { customer_name: loggedUser.name }),
        }),
        ...(attribution?.utm_source && { utm_source: attribution.utm_source }),
        ...(attribution?.utm_medium && { utm_medium: attribution.utm_medium }),
        ...(attribution?.utm_campaign && { utm_campaign: (attribution.utm_campaign || '').slice(0, 500) }),
        ...(attribution?.ref && { ref: (attribution.ref || '').slice(0, 500) }),
      },
      billing_address_collection: 'auto',
      phone_number_collection: {
        enabled: true,
      },
    }

    if (stripeCustomerId) {
      sessionConfig.customer = stripeCustomerId
    } else if (loggedUser?.email) {
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
    const msg = [error?.message, error?.raw?.message, error?.raw?.error?.message].filter(Boolean).join(' ') || 'Failed to create checkout'
    // SPEI usa customer_balance: si no está activado en Stripe, mensaje claro con enlace
    const isSpeiCustomerBalanceError =
      paymentMethod === 'spei' &&
      /customer_balance|invalid.*payment.*method|activated in your dashboard|preview features/i.test(String(msg))
    if (isSpeiCustomerBalanceError) {
      return NextResponse.json(
        {
          error:
            'SPEI (transferencia bancaria) no está activado en tu cuenta de Stripe. Actívalo aquí: https://dashboard.stripe.com/settings/payment_methods (sección "Bank transfers"). Mientras tanto puedes usar Tarjeta, OXXO o PayPal.',
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    )
  }
}
