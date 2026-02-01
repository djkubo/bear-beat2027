'use client'

import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { trackCTAClick } from '@/lib/tracking'

const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''

export default function CheckoutPayPalPage() {
  const searchParams = useSearchParams()
  const packSlug = searchParams.get('pack') || 'pack-enero-2026'
  const currency = searchParams.get('currency') || 'mxn'
  const price = currency === 'mxn' ? 350 : 19
  const currencyLabel = currency === 'mxn' ? 'MXN' : 'USD'

  if (!clientId) {
    return (
      <div className="min-h-screen bg-bear-black text-white flex flex-col items-center justify-center p-6">
        <p className="text-red-400 mb-4">PayPal no está configurado (falta NEXT_PUBLIC_PAYPAL_CLIENT_ID).</p>
        <Link href={`/checkout?pack=${packSlug}`} className="text-bear-blue hover:underline">
          Volver al checkout
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bear-black text-white">
      <header className="py-4 px-4 border-b border-bear-blue/20">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat"
              width={40}
              height={40}
            />
            <span className="font-bold text-bear-blue">BEAR BEAT</span>
          </Link>
          <Link
            href={`/checkout?pack=${packSlug}`}
            className="text-sm text-gray-400 hover:text-white"
          >
            ← Otros métodos de pago
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto py-12 px-4">
        <div className="bg-gradient-to-r from-bear-blue/20 to-bear-blue/5 border-2 border-bear-blue/50 rounded-2xl p-6 mb-8">
          <h1 className="text-2xl font-black mb-1">Pagar con PayPal</h1>
          <p className="text-gray-400 text-sm mb-4">Pack Enero 2026 • 178 videos</p>
          <div className="text-4xl font-black text-bear-blue">
            ${price} <span className="text-lg font-normal text-gray-400">{currencyLabel}</span>
          </div>
        </div>

        <p className="text-center text-gray-400 text-sm mb-6">
          Serás redirigido a PayPal para completar el pago de forma segura.
        </p>

        <div className="flex justify-center">
          <PayPalScriptProvider
            options={{
              clientId,
              currency: currencyLabel,
              intent: 'capture',
            }}
          >
            <PayPalButtons
              style={{ layout: 'vertical', color: 'gold', shape: 'rect' }}
              createOrder={async () => {
                trackCTAClick('checkout_method', 'checkout-paypal', { method: 'paypal', pack: packSlug })
                const res = await fetch('/api/paypal/create-order', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ packSlug, currency }),
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || 'Error al crear la orden')
                return data.orderId
              }}
              onApprove={async (data) => {
                const res = await fetch('/api/paypal/capture-order', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ orderId: data.orderID }),
                })
                const result = await res.json()
                if (res.ok && result.redirectUrl) {
                  window.location.href = result.redirectUrl
                } else {
                  alert(result.error || 'Error al completar el pago')
                }
              }}
              onError={(err) => {
                console.error('PayPal error:', err)
                alert('Hubo un error con PayPal. Intenta de nuevo o usa otro método de pago.')
              }}
            />
          </PayPalScriptProvider>
        </div>

        <p className="text-center text-gray-500 text-xs mt-8">
          Protegido por PayPal. Puedes pagar con tu cuenta o tarjeta.
        </p>
      </main>
    </div>
  )
}
