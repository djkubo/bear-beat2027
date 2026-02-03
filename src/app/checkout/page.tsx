'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { trackCTAClick } from '@/lib/tracking'
import { fbTrackInitiateCheckout, fbTrackAddPaymentInfo } from '@/components/analytics/MetaPixel'
import { useVideoInventory } from '@/lib/hooks/useVideoInventory'
import { createClient } from '@/lib/supabase/client'
import { Check, Shield, Lock, CreditCard, Building2, Banknote, Wallet, ChevronRight } from 'lucide-react'
import { getMessengerUrl } from '@/config/contact'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'

// ==========================================
// CHECKOUT – Tarjeta (Stripe Elements) | PayPal (nativo) | OXXO/SPEI (Stripe redirect)
// ==========================================

type PaymentMethod = 'card' | 'paypal' | 'oxxo' | 'spei'
type Step = 'select' | 'processing' | 'redirect'

const RESERVATION_MINUTES = 15
const stripePk = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ?? ''
const stripePromise = stripePk ? loadStripe(stripePk) : null

// —— Formulario de pago con tarjeta (Stripe Elements) ——
function CardPaymentForm({
  clientSecret,
  price,
  currencyLabel,
  packSlug,
  customerEmail,
  onError,
}: {
  clientSecret: string
  price: number
  currencyLabel: string
  packSlug: string
  customerEmail?: string | null
  onError: (msg: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [elementReady, setElementReady] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!stripe || !elements) return
      setLoading(true)
      onError('')
      try {
        const returnUrl = typeof window !== 'undefined'
          ? `${window.location.origin}/complete-purchase`
          : `${process.env.NEXT_PUBLIC_APP_URL || ''}/complete-purchase`
        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: returnUrl,
            receipt_email: (customerEmail && customerEmail.trim()) || undefined,
          },
        })
        if (error) {
          onError(error.message || 'Error al procesar el pago')
          toast.error(error.message || 'Revisa los datos de tu tarjeta')
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al procesar el pago'
        onError(msg)
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    },
    [stripe, elements, customerEmail, onError]
  )

  const canSubmit = stripe && elements && elementReady && !loading

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{ layout: 'tabs' }}
        onReady={() => setElementReady(true)}
      />
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full h-12 rounded-xl bg-bear-blue text-bear-black font-black text-base hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-bear-blue focus:ring-offset-2 focus:ring-offset-[#0a0a0a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? 'Procesando...' : `PAGAR $${price} ${currencyLabel} Y ACCEDER →`}
      </button>
    </form>
  )
}

// —— Wrapper Elements para tarjeta (necesita clientSecret) ——
function StripeCardSection({
  clientSecret,
  price,
  currencyLabel,
  packSlug,
  customerEmail,
  error,
  setError,
}: {
  clientSecret: string
  price: number
  currencyLabel: string
  packSlug: string
  customerEmail?: string | null
  error: string | null
  setError: (s: string | null) => void
}) {
  if (!stripePromise) {
    return (
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3">
        <p className="text-sm text-amber-400">Stripe no está configurado (falta NEXT_PUBLIC_STRIPE_PUBLIC_KEY). Usa PayPal u OXXO/SPEI.</p>
      </div>
    )
  }
  const options = {
    clientSecret,
    appearance: {
      theme: 'night' as const,
      variables: { colorPrimary: '#08E1F7', colorBackground: '#121212', colorText: '#fff', colorDanger: '#ef4444' },
    },
  }
  return (
    <>
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      <Elements stripe={stripePromise} options={options}>
        <CardPaymentForm
          clientSecret={clientSecret}
          price={price}
          currencyLabel={currencyLabel}
          packSlug={packSlug}
          customerEmail={customerEmail}
          onError={setError}
        />
      </Elements>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-gray-500" />
          Pagos procesados de forma segura por Stripe
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] font-bold text-gray-500">Visa</span>
          <span className="font-mono text-[10px] font-bold text-gray-500">MC</span>
          <span className="font-mono text-[10px] font-bold text-gray-500">Amex</span>
        </span>
      </div>
    </>
  )
}

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const packSlug = searchParams.get('pack') || 'enero-2026'
  const inventory = useVideoInventory()

  const [step, setStep] = useState<Step>('select')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [country, setCountry] = useState('MX')
  const [currency, setCurrency] = useState<'mxn' | 'usd'>('mxn')
  const [error, setError] = useState<string | null>(null)
  const [reservationSeconds, setReservationSeconds] = useState(RESERVATION_MINUTES * 60)
  const [cardClientSecret, setCardClientSecret] = useState<string | null>(null)
  const [cardClientSecretLoading, setCardClientSecretLoading] = useState(false)
  const [checkoutEmail, setCheckoutEmail] = useState<string | null>(null)

  // Email para Stripe Customer (OXXO/SPEI requieren customer): usuario logueado o invitado
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setCheckoutEmail(user.email)
    })
  }, [])

  // HARDCODED FOR TESTING: forzar MX para ver OXXO/SPEI desde cualquier país (ej. USA)
  useEffect(() => {
    setCountry('MX')
    setCurrency('mxn')
  }, [])
  // Lógica real (geolocalización) — descomentar para producción:
  // useEffect(() => {
  //   fetch('https://ipapi.co/json/')
  //     .then((res) => res.json())
  //     .then((data) => {
  //       setCountry(data.country_code || 'MX')
  //       setCurrency(data.country_code === 'MX' ? 'mxn' : 'usd')
  //     })
  //     .catch(() => {
  //       setCountry('MX')
  //       setCurrency('mxn')
  //     })
  // }, [])

  useEffect(() => {
    if (step !== 'select' || reservationSeconds <= 0) return
    const t = setInterval(() => setReservationSeconds((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [step, reservationSeconds])

  // Al elegir Tarjeta, obtener clientSecret para Stripe Elements (email para OXXO/SPEI en tabs)
  useEffect(() => {
    if (selectedMethod !== 'card') {
      setCardClientSecret(null)
      return
    }
    setError(null)
    setCardClientSecretLoading(true)
    const body: { packSlug: string; currency: string; email?: string } = { packSlug, currency }
    if (checkoutEmail) body.email = checkoutEmail
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.clientSecret) setCardClientSecret(data.clientSecret)
        else setError(data.error || 'Error al preparar el pago')
      })
      .catch(() => setError('Error de conexión. Intenta de nuevo.'))
      .finally(() => setCardClientSecretLoading(false))
  }, [selectedMethod, packSlug, currency, checkoutEmail])

  const price = currency === 'mxn' ? 350 : 19
  const currencyLabel = currency === 'mxn' ? 'MXN' : 'USD'

  useEffect(() => {
    fbTrackInitiateCheckout(
      { content_name: 'Pack Enero 2026', content_ids: [packSlug], value: price, currency: currencyLabel, num_items: 1 },
      checkoutEmail ? { email: checkoutEmail } : undefined
    )
  }, [packSlug, price, currencyLabel, checkoutEmail])

  useEffect(() => {
    if (selectedMethod === 'card' || selectedMethod === 'paypal') {
      fbTrackAddPaymentInfo(
        { content_ids: [packSlug], value: price, currency: currencyLabel },
        checkoutEmail ? { email: checkoutEmail } : undefined
      )
    }
  }, [selectedMethod, packSlug, price, currencyLabel, checkoutEmail])
  const totalVideos = inventory.loading ? '...' : (inventory.count ?? 0).toLocaleString()
  const reservationM = Math.floor(reservationSeconds / 60)
  const reservationS = reservationSeconds % 60

  const handleOxxoSpeiPayment = async () => {
    if (selectedMethod !== 'oxxo' && selectedMethod !== 'spei') return
    if (!checkoutEmail?.trim()) {
      setError('Ingresa tu email para pagar con OXXO o SPEI.')
      toast.error('Ingresa tu email arriba para continuar.')
      return
    }
    setStep('processing')
    setError(null)
    trackCTAClick('checkout_method', 'checkout', `${selectedMethod}-${packSlug}`)
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packSlug, paymentMethod: selectedMethod, currency, email: checkoutEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al procesar')
      setStep('redirect')
      setTimeout(() => { window.location.href = data.url }, 1200)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Algo salió mal. Intenta de nuevo.'
      setError(msg)
      setStep('select')
      toast.error(msg)
    }
  }

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''
  const isPayPalAvailable = !!paypalClientId
  const isStripeTest = stripePk.startsWith('pk_test_')
  const isPayPalSandbox = process.env.NEXT_PUBLIC_PAYPAL_USE_SANDBOX === 'true' || process.env.NEXT_PUBLIC_PAYPAL_USE_SANDBOX === '1'
  const isTestMode = isStripeTest || isPayPalSandbox

  return (
    <div className="min-h-screen bg-[#050505] text-white antialiased">
      {isTestMode && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 py-2 px-4 text-center">
          <p className="text-xs text-amber-400 font-medium">
            Modo pruebas: {[isStripeTest && 'Stripe (test)', isPayPalSandbox && 'PayPal (sandbox)'].filter(Boolean).join(' · ')} — No se cobra dinero real
          </p>
        </div>
      )}
      {step === 'select' && reservationSeconds > 0 && reservationSeconds <= RESERVATION_MINUTES * 60 && (
        <div className="border-b border-white/5 bg-white/[0.02] py-2 px-4 text-center">
          <p className="text-xs text-gray-500">
            Tu precio especial está reservado por{' '}
            <span className="font-mono font-bold text-bear-blue">
              {String(reservationM).padStart(2, '0')}:{String(reservationS).padStart(2, '0')}
            </span>{' '}
            minutos
          </p>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#050505]/95 backdrop-blur py-4 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat"
              width={40}
              height={40}
            />
            <span className="font-bold text-bear-blue">BEAR BEAT</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-7 h-7 rounded-full bg-bear-blue text-bear-black flex items-center justify-center font-bold text-xs">1</span>
            <span className="text-bear-blue font-medium">Pagar</span>
            <ChevronRight className="h-4 w-4 text-gray-600" />
            <span className="w-7 h-7 rounded-full bg-zinc-700 text-zinc-400 flex items-center justify-center font-bold text-xs">2</span>
            <span>Acceso</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="grid lg:grid-cols-2 gap-8 lg:gap-12"
            >
              {/* Columna izquierda – Resumen (igual que antes) */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-bold text-white mb-6">Resumen de tu Orden</h2>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 flex gap-4">
                    <div className="relative h-24 w-24 shrink-0 rounded-xl overflow-hidden bg-zinc-800">
                      <Image
                        src="/logos/BBLOGOTIPOPOSITIVO_Mesa de trabajo 1.png"
                        alt="Pack"
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white text-lg">Pack Enero 2026 - Video Remixes</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{totalVideos} videos HD · Descarga Ilimitada</p>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-sm text-gray-500 line-through">$1,499</span>
                        <span className="text-2xl font-black text-white">${price} {currencyLabel}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <ul className="space-y-3 text-sm text-gray-300">
                  {['Acceso Inmediato (Web + FTP)', 'Actualizaciones incluidas', 'Licencia de uso comercial'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                      <Shield className="h-5 w-5" />
                    </span>
                    <div>
                      <h4 className="font-bold text-white">Garantía de 30 Días</h4>
                      <p className="text-sm text-gray-400 mt-1">Si no te encanta, te devolvemos tu dinero. Sin preguntas.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-gray-400 italic">&quot;La mejor inversión que he hecho para mis eventos.&quot;</p>
                  <p className="font-bold text-white text-sm mt-2">DJ Roberto</p>
                  <p className="text-yellow-500 text-xs">★★★★★</p>
                </div>
                <div className="rounded-2xl border border-bear-blue/20 bg-bear-blue/5 p-5">
                  <h4 className="font-bold text-white mb-4">Qué pasa después</h4>
                  <ol className="space-y-4">
                    <li className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bear-blue/20 text-bear-blue font-bold text-sm">1</span>
                      <div>
                        <p className="font-medium text-white text-sm">Pagas de forma segura</p>
                        <p className="text-xs text-gray-500">Stripe o PayPal protegen tu pago</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bear-blue/20 text-bear-blue font-bold text-sm">2</span>
                      <div>
                        <p className="font-medium text-white text-sm">Recibes tu acceso por Email/WhatsApp</p>
                        <p className="text-xs text-gray-500">En minutos</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bear-blue/20 text-bear-blue font-bold text-sm">3</span>
                      <div>
                        <p className="font-medium text-white text-sm">¡Descargas todo y empiezas a mezclar!</p>
                        <p className="text-xs text-gray-500">Web o FTP</p>
                      </div>
                    </li>
                  </ol>
                </div>
              </div>

              {/* Columna derecha – Pago (condicional: Tarjeta | PayPal | OXXO/SPEI) */}
              <div>
                <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-6 md:p-8 sticky lg:top-24">
                  <h2 className="text-lg font-bold text-white mb-6">Completa tu pago</h2>
                  <p className="text-sm text-gray-500 mb-4">Selecciona cómo quieres pagar</p>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {country === 'MX' && (
                      <>
                        <button
                          type="button"
                          onClick={() => { setSelectedMethod('oxxo'); setError(null) }}
                          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                            selectedMethod === 'oxxo' ? 'border-bear-blue bg-bear-blue/10 shadow-[0_0_20px_rgba(8,225,247,0.2)]' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                          }`}
                        >
                          <Banknote className="h-6 w-6 text-orange-400" />
                          <span className="font-bold text-sm text-white">OXXO</span>
                          <span className="text-xs text-gray-500">Efectivo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelectedMethod('spei'); setError(null) }}
                          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                            selectedMethod === 'spei' ? 'border-bear-blue bg-bear-blue/10 shadow-[0_0_20px_rgba(8,225,247,0.2)]' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                          }`}
                        >
                          <Building2 className="h-6 w-6 text-green-400" />
                          <span className="font-bold text-sm text-white">SPEI</span>
                          <span className="text-xs text-gray-500">Transferencia</span>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => { setSelectedMethod('card'); setError(null) }}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                        selectedMethod === 'card' ? 'border-bear-blue bg-bear-blue/10 shadow-[0_0_20px_rgba(8,225,247,0.2)]' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      }`}
                    >
                      <CreditCard className="h-6 w-6 text-bear-blue" />
                      <span className="font-bold text-sm text-white">Tarjeta</span>
                      <span className="text-xs text-gray-500">Visa, MC, Amex</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedMethod('paypal'); setError(null) }}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                        selectedMethod === 'paypal' ? 'border-bear-blue bg-bear-blue/10 shadow-[0_0_20px_rgba(8,225,247,0.2)]' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      }`}
                    >
                      <Wallet className="h-6 w-6 text-[#0070ba]" />
                      <span className="font-bold text-sm text-white">PayPal</span>
                      <span className="text-xs text-gray-500">Cuenta PayPal</span>
                    </button>
                  </div>

                  {/* Banner crítico para OXXO/SPEI: no ignorar el email */}
                  {(selectedMethod === 'oxxo' || selectedMethod === 'spei') && (
                    <div className="mb-4 rounded-xl border-2 border-amber-500/60 bg-amber-500/15 px-4 py-3 text-center">
                      <p className="text-sm font-bold text-amber-200">
                        ⚠️ MUY IMPORTANTE: Tu acceso llegará a este correo. Escríbelo con cuidado.
                      </p>
                    </div>
                  )}

                  {/* Email: necesario para OXXO/SPEI; recomendado para tarjeta/PayPal */}
                  <div className="mb-4">
                    <label htmlFor="checkout-email" className="block text-sm font-medium text-gray-400 mb-1.5">
                      Tu email
                      {(selectedMethod === 'oxxo' || selectedMethod === 'spei') && !checkoutEmail && (
                        <span className="text-amber-400"> (necesario para OXXO/SPEI)</span>
                      )}
                    </label>
                    <input
                      id="checkout-email"
                      type="email"
                      value={checkoutEmail ?? ''}
                      onChange={(e) => setCheckoutEmail(e.target.value.trim() || null)}
                      placeholder="tu@email.com"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-lg text-white placeholder:text-zinc-500 focus:border-bear-blue focus:ring-1 focus:ring-bear-blue outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Con este correo podrás iniciar sesión después de pagar (invitado o ya registrado).
                    </p>
                  </div>

                  {/* ESCENARIO A: Tarjeta – Stripe Elements + PaymentElement + botón custom */}
                  {selectedMethod === 'card' && (
                    <div className="mt-4">
                      {cardClientSecretLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-10 h-10 border-2 border-bear-blue/30 border-t-bear-blue rounded-full animate-spin" />
                        </div>
                      ) : cardClientSecret ? (
                        <StripeCardSection
                          clientSecret={cardClientSecret}
                          price={price}
                          currencyLabel={currencyLabel}
                          packSlug={packSlug}
                          customerEmail={checkoutEmail}
                          error={error}
                          setError={setError}
                        />
                      ) : error ? (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
                          <p className="text-sm text-red-400">{error}</p>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* ESCENARIO B: PayPal – Solo botones nativos (@paypal/react-paypal-js) */}
                  {selectedMethod === 'paypal' && (
                    <div className="mt-4 rounded-xl border border-zinc-700 bg-[#0a0a0a] p-4 min-h-[200px] flex flex-col items-center justify-center">
                      {!isPayPalAvailable ? (
                        <p className="text-sm text-amber-400">PayPal no está configurado. Usa Tarjeta u OXXO/SPEI.</p>
                      ) : (
                        <PayPalScriptProvider
                          options={{
                            clientId: paypalClientId,
                            currency: currency === 'mxn' ? 'MXN' : 'USD',
                            intent: 'capture',
                          }}
                        >
                          <PayPalButtons
                            style={{ layout: 'vertical', color: 'gold', shape: 'rect' }}
                            createOrder={async () => {
                              trackCTAClick('checkout_method', 'checkout', `paypal-${packSlug}`)
                              const res = await fetch('/api/create-paypal-order', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ packSlug, currency }),
                              })
                              const data = await res.json()
                              if (!res.ok) throw new Error(data.error || 'Error al crear orden PayPal')
                              return data.orderID
                            }}
                            onApprove={async (data) => {
                              if (!data.orderID) return
                              const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '')
                              if (!origin) {
                                toast.error('No se pudo determinar la URL. Recarga la página e intenta de nuevo.')
                                return
                              }
                              window.location.href = `${origin}/complete-purchase?session_id=PAYPAL_${encodeURIComponent(data.orderID)}&provider=paypal`
                            }}
                            onCancel={() => {
                              toast.info('Pago con PayPal cancelado. Puedes elegir otro método de pago.')
                              setError(null)
                            }}
                            onError={(err) => {
                              const msg = typeof err?.message === 'string' ? err.message : 'Error al procesar con PayPal. Intenta con tarjeta u otro método.'
                              toast.error(msg)
                              setError(msg)
                            }}
                          />
                        </PayPalScriptProvider>
                      )}
                      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                        <Lock className="h-3.5 w-3.5" />
                        Pagos procesados por PayPal
                      </div>
                    </div>
                  )}

                  {/* ESCENARIO C: OXXO / SPEI – Botón que llama create-checkout y redirige */}
                  {(selectedMethod === 'oxxo' || selectedMethod === 'spei') && (
                    <>
                      {error && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 mb-6">
                          <p className="text-sm text-red-400">{error}</p>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleOxxoSpeiPayment}
                        className="w-full h-12 rounded-xl bg-bear-blue text-bear-black font-black text-base hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-bear-blue focus:ring-offset-2 focus:ring-offset-[#0a0a0a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        PAGAR ${price} {currencyLabel} Y ACCEDER →
                      </button>
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-gray-500" />
                          Pagos procesados de forma segura por Stripe
                        </span>
                      </div>
                    </>
                  )}

                  {/* Sin método seleccionado: mensaje sutil */}
                  {!selectedMethod && (
                    <p className="text-sm text-gray-500 mt-4">Elige un método de pago arriba.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="w-14 h-14 border-2 border-bear-blue/30 border-t-bear-blue rounded-full animate-spin mb-8" />
              <h2 className="text-xl font-black text-white mb-2">Preparando tu pago...</h2>
              <p className="text-gray-500 text-sm">
                {selectedMethod === 'oxxo' && 'Generando tu ficha OXXO...'}
                {selectedMethod === 'spei' && 'Generando tu referencia SPEI...'}
              </p>
              <p className="text-xs text-gray-600 mt-4">No cierres esta ventana</p>
            </motion.div>
          )}

          {step === 'redirect' && (
            <motion.div
              key="redirect"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="text-5xl mb-6">🚀</div>
              <h2 className="text-xl font-black text-bear-blue mb-2">¡Listo!</h2>
              <p className="text-gray-500 text-sm">Te llevamos a la página de pago seguro...</p>
              <div className="flex gap-2 mt-6">
                <div className="w-2.5 h-2.5 bg-bear-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2.5 h-2.5 bg-bear-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2.5 h-2.5 bg-bear-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-white/5 py-6 px-4 text-center text-sm text-gray-500">
        <p className="flex items-center justify-center gap-2">
          <Lock className="h-4 w-4" />
          Pagos procesados de forma segura (Stripe / PayPal)
        </p>
        <p className="mt-1">
          ¿Problemas?{' '}
          <a href={getMessengerUrl()} target="_blank" rel="noopener noreferrer" className="text-bear-blue hover:underline inline-flex items-center gap-1">
            <span aria-hidden>💬</span> Ayuda en línea
          </a>
        </p>
      </footer>
    </div>
  )
}
