import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
  typescript: true,
})

export async function createCheckoutSession({
  packId,
  packName,
  priceMXN,
  priceUSD,
  userEmail,
  currency = 'mxn',
}: {
  packId: number
  packName: string
  priceMXN: number
  priceUSD: number
  userEmail?: string
  currency?: 'mxn' | 'usd'
}) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment', // Pago único, no suscripción
    payment_method_types: ['card', 'link'],
    customer_email: userEmail,
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: packName,
            description: `Acceso completo al ${packName} - videos HD para DJs`,
            images: [`${process.env.NEXT_PUBLIC_APP_URL}/pack-cover.jpg`],
          },
          unit_amount: currency === 'mxn' ? priceMXN * 100 : priceUSD * 100,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?canceled=true`,
    metadata: {
      pack_id: packId.toString(),
    },
  })

  return session
}
