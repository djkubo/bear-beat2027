'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { trackCTAClick, trackPageView, trackStartCheckout } from '@/lib/tracking'
import { fbTrackInitiateCheckout, fbTrackAddPaymentInfo } from '@/components/analytics/MetaPixel'
import { useVideoInventory } from '@/lib/hooks/useVideoInventory'
import { useFeaturedPack } from '@/lib/hooks/useFeaturedPack'
import { usePackBySlug } from '@/lib/hooks/usePackBySlug'
import { createClient } from '@/lib/supabase/client'
import { Check, Shield, Lock, CreditCard, Building2, Banknote, Wallet, ChevronRight } from 'lucide-react'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// ==========================================
// CHECKOUT – Tarjeta (redirect Stripe) | PayPal (nativo) | OXXO/SPEI (redirect Stripe)
// ==========================================

type PaymentMethod = 'card' | 'paypal' | 'oxxo' | 'spei'
type Step = 'select' | 'processing' | 'redirect'

const RESERVATION_MINUTES = 15
const BB_USER_NAME_COOKIE = 'bb_user_name'
const stripePk = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ?? ''

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

const DOWNSELL_PACK_SLUG = 'pack-prueba-99'
const DOWNSELL_PRICE_MXN = 99

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const { pack: featuredPack } = useFeaturedPack()
  const requestedPackSlug = searchParams.get('pack') || featuredPack.slug || 'enero-2026'
  const isDownsell = requestedPackSlug === DOWNSELL_PACK_SLUG || requestedPackSlug === 'prueba-99'
  const { pack: packFromSlug } = usePackBySlug(isDownsell ? null : requestedPackSlug)
  const resolvedPack = isDownsell ? null : (packFromSlug || featuredPack)
  const packSlug = isDownsell ? DOWNSELL_PACK_SLUG : (resolvedPack?.slug || 'enero-2026')
  const inventory = useVideoInventory(packSlug)

  const [step, setStep] = useState<Step>('select')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [country, setCountry] = useState('MX')
  const [currency, setCurrency] = useState<'mxn' | 'usd'>('mxn')
  const [error, setError] = useState<string | null>(null)
  const [reservationSeconds, setReservationSeconds] = useState(RESERVATION_MINUTES * 60)
  const [checkoutEmail, setCheckoutEmail] = useState<string | null>(null)
  const [checkoutName, setCheckoutName] = useState<string>('')
  const [showExitModal, setShowExitModal] = useState(false)

  // Email para Stripe Customer (OXXO/SPEI requieren customer): usuario logueado o invitado
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setCheckoutEmail(user.email)
    })
  }, [])

  // ManyChat: pre-llenar nombre desde cookie bb_user_name
  useEffect(() => {
    const name = getCookie(BB_USER_NAME_COOKIE)
    if (name && name.trim()) setCheckoutName(name.trim())
  }, [])

  // Nota: antes se forzaba MXN para pruebas. Ya es el default; no lo forzamos para permitir geolocalización si se activa.
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

  // Tarjeta usa Checkout nativo de Stripe (redirect). Ya no usamos PaymentElement ni create-payment-intent.

  const priceMxn = isDownsell
    ? DOWNSELL_PRICE_MXN
    : (Number(resolvedPack?.price_mxn) || 350)
  const priceUsd = isDownsell
    ? 6
    : (Number(resolvedPack?.price_usd) || 19)
  const price = currency === 'mxn' ? priceMxn : priceUsd
  const currencyLabel = currency === 'mxn' ? 'MXN' : 'USD'
  const packDisplayName = isDownsell ? 'Pack de Prueba (50 Videos)' : (resolvedPack?.name || 'Pack Bear Beat')

  useEffect(() => {
    trackPageView('checkout')
    trackStartCheckout(packSlug, packDisplayName, price, checkoutEmail ?? undefined)
  }, [packSlug, packDisplayName, price, checkoutEmail])

  useEffect(() => {
    fbTrackInitiateCheckout(
      { content_name: packDisplayName, content_ids: [packSlug], value: price, currency: currencyLabel, num_items: 1 },
      checkoutEmail ? { email: checkoutEmail } : undefined
    )
  }, [packSlug, price, currencyLabel, checkoutEmail, packDisplayName])

  // Exit intent: mouse sale por arriba (cerrar pestaña) → modal downsell $99 (una vez por sesión)
  useEffect(() => {
    if (isDownsell || step !== 'select') return
    const key = 'bb_exit_modal_shown'
    const handler = (e: MouseEvent) => {
      if (e.clientY <= 10 && typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        setShowExitModal(true)
      }
    }
    document.addEventListener('mouseout', handler)
    return () => document.removeEventListener('mouseout', handler)
  }, [isDownsell, step])

  useEffect(() => {
    if (selectedMethod === 'card' || selectedMethod === 'paypal') {
      fbTrackAddPaymentInfo(
        { content_ids: [packSlug], value: price, currency: currencyLabel },
        checkoutEmail ? { email: checkoutEmail } : undefined
      )
    }
  }, [selectedMethod, packSlug, price, currencyLabel, checkoutEmail])
  const totalVideosStr = inventory.loading ? '...' : (inventory.count ?? 0).toLocaleString()
  const totalSizeStr = inventory.totalSizeFormatted || '...'
  const genreCountNum = inventory.genreCount ?? 0
  const reservationM = Math.floor(reservationSeconds / 60)
  const reservationS = reservationSeconds % 60

  const handleStripeCheckoutRedirect = async (method: 'card' | 'oxxo' | 'spei') => {
    if (method !== 'card' && method !== 'oxxo' && method !== 'spei') return
    if ((method === 'oxxo' || method === 'spei') && !checkoutEmail?.trim()) {
      setError('Ingresa tu email para pagar con OXXO o SPEI.')
      toast.error('Ingresa tu email arriba para continuar.')
      return
    }
    setStep('processing')
    setError(null)
    trackCTAClick('checkout_method', 'checkout', `${method}-${packSlug}`)
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packSlug,
          paymentMethod: method,
          currency,
          email: checkoutEmail?.trim() || undefined,
        }),
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
    <div className="min-h-screen bg-[#020202] text-white flex flex-col overflow-x-hidden min-w-0">
      {/* Modal Exit Intent: downsell Pack Prueba $99 */}
      <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <div className="bg-zinc-900 border-2 border-amber-500/50 rounded-2xl p-6 w-full shadow-[0_0_40px_rgba(245,158,11,0.2)]">
            <DialogHeader className="px-0 pt-0 mb-6">
              <DialogTitle className="text-2xl font-black text-white">
                🎁 ¡ESPERA! ¿{currency === 'mxn' ? `$${priceMxn}` : `$${priceUsd}`} es mucho?
              </DialogTitle>
              <DialogDescription className="text-zinc-300">
                Llévate el Pack de Prueba (50 videos) por solo <strong className="text-amber-400">$99 MXN</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Link
                href={`/checkout?pack=${DOWNSELL_PACK_SLUG}`}
                onClick={() => setShowExitModal(false)}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-4 rounded-xl transition inline-flex items-center justify-center text-center"
              >
                Sí, quiero el Pack de Prueba por $99 MXN
              </Link>
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="w-full py-2 text-zinc-400 hover:text-white text-sm"
              >
                No, seguir con {packDisplayName}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <header className="border-b border-white/10 bg-black py-4">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/#catalogo" className="flex items-center gap-2 order-2 sm:order-1">
            <img src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png" className="h-10 w-auto" alt="Logo" />
            <span className="font-bold text-xl tracking-tight">CHECKOUT SEGURO 🔒</span>
          </Link>
          <Link href="/#catalogo" className="text-sm text-gray-400 hover:text-bear-blue transition order-1 sm:order-2">
            ← Volver al catálogo
          </Link>
        </div>
        <p className="text-center text-xs text-gray-500 mt-2 max-w-4xl mx-auto px-4">Pago 100% seguro · Sin suscripciones · Acceso de por vida</p>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full min-w-0 px-4 py-8 md:py-12">
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
        <AnimatePresence mode="wait">
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="grid lg:grid-cols-2 gap-8 lg:gap-12"
            >
              {/* Columna izquierda – Resumen (en desktop a la izq; en móvil abajo para que el formulario de pago se vea primero) */}
              <div className="space-y-8 order-2 lg:order-1">
                <div>
                  <h2 className="text-lg font-bold text-white mb-6">Resumen de tu Orden</h2>
                  <div className="rounded-2xl border-2 border-bear-blue/30 bg-zinc-950 p-5 flex gap-4">
                    <div className="relative h-24 w-24 shrink-0 rounded-xl overflow-hidden bg-zinc-800">
                      <Image
                        src="/logos/BBLOGOTIPOPOSITIVO_Mesa de trabajo 1.png"
                        alt="Pack"
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white text-lg">{packDisplayName} · Video Remixes</h3>
                      <ul className="mt-2 space-y-1 text-sm text-gray-300">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-400 shrink-0" strokeWidth={2.5} />
                          {totalVideosStr} videos HD
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-400 shrink-0" strokeWidth={2.5} />
                          {totalSizeStr} · {genreCountNum > 0 ? `${genreCountNum} géneros` : 'organizado por género'}
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-400 shrink-0" strokeWidth={2.5} />
                          Acceso de por vida
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-400 shrink-0" strokeWidth={2.5} />
                          Si no te hace ganar más dinero, te devolvemos todo
                        </li>
                      </ul>
                      <div className="flex items-baseline gap-3 mt-3">
                        {!isDownsell && <span className="text-sm text-gray-500 line-through">$1,500 MXN</span>}
                        <span className="text-2xl font-black text-bear-blue">${price} {currencyLabel}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <ul className="space-y-3 text-sm text-gray-300">
                  {['Acceso Inmediato (Web + FTP)', 'Pack completo · Un solo pago', 'Licencia de uso comercial'].map((item, i) => (
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
                      <h4 className="font-bold text-white">Garantía de devolución</h4>
                      <p className="text-sm text-gray-400 mt-1">Si no te hace ganar más dinero, te devolvemos todo. Sin preguntas.</p>
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
                        <p className="font-medium text-white text-sm">Recibes tu acceso por email</p>
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

              {/* Columna derecha – Pago (en móvil primero para que sea fácil comprar; sticky en desktop) */}
              <div className="order-1 lg:order-2">
                <div className="rounded-2xl border-2 border-bear-blue/30 bg-zinc-950 p-6 md:p-8 sticky top-20 lg:top-24 shadow-[0_0_40px_rgba(8,225,247,0.08)]">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bear-blue/20 text-bear-blue font-black text-xs">1</span>
                      <h2 className="text-lg font-bold text-white">Completa tu pago</h2>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">Un solo paso</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Nombre, email y elige cómo pagar. En minutos tienes acceso.</p>

                  {/* Precio visible en la caja de pago (para móvil: no hace falta bajar al resumen) */}
                  <div className="flex items-center justify-between rounded-xl bg-bear-blue/10 border border-bear-blue/30 px-4 py-3 mb-6">
                    <span className="text-sm text-gray-400">Total a pagar</span>
                    <span className="text-xl font-black text-bear-blue">${price} {currencyLabel}</span>
                  </div>

                  {/* Nombre y email */}
                  <div className="mb-4">
                    <label htmlFor="checkout-name" className="block text-sm font-medium text-gray-400 mb-1.5">
                      Tu nombre (para el recibo)
                    </label>
                    <input
                      id="checkout-name"
                      type="text"
                      value={checkoutName}
                      onChange={(e) => setCheckoutName(e.target.value)}
                      placeholder="Ej. Gustavo"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-lg text-white placeholder:text-zinc-500 focus:border-bear-blue focus:ring-1 focus:ring-bear-blue outline-none"
                    />
                  </div>

                  <div className="bg-amber-500/15 border-2 border-amber-500/60 rounded-xl p-4 mb-4 flex gap-3 items-start">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="font-bold text-amber-300 text-sm">Importante: Tu acceso llegará a este email</h4>
                      <p className="text-amber-200/90 text-sm mt-0.5">Escribe bien tu correo; ahí recibirás el enlace y la contraseña.</p>
                    </div>
                  </div>

                  <div className="mb-6">
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

                  {/* Botones de método de pago */}
                  <p className="text-sm font-bold text-white mb-3">Elige cómo pagar</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
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

                  <div className="mb-4 flex flex-wrap items-center justify-center gap-2 py-3 px-4 rounded-xl border border-bear-blue/30 bg-zinc-950/80 text-center">
                    <Lock className="h-4 w-4 shrink-0 text-bear-blue" />
                    <span className="text-sm font-bold text-white">Transacción Encriptada 256-bit SSL</span>
                    <span className="hidden sm:inline text-gray-500">·</span>
                    <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-400">Visa</span>
                    <span className="text-xs text-gray-400">Mastercard</span>
                    <Banknote className="h-3.5 w-3.5 text-orange-400" />
                    <span className="text-xs text-gray-400">OXXO</span>
                  </div>

                  {/* ESCENARIO A: Tarjeta – Redirect al Checkout nativo de Stripe (sin PaymentElement, sin botón bloqueado) */}
                  {selectedMethod === 'card' && (
                    <>
                      {error && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 mb-4">
                          <p className="text-sm text-red-400">{error}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center justify-center gap-2 py-3 text-xs text-gray-400 mb-4">
                        <Lock className="h-4 w-4 shrink-0" />
                        <span>Te llevamos a la página segura de Stripe</span>
                        <span className="hidden sm:inline">·</span>
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Visa, Mastercard, Link</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStripeCheckoutRedirect('card')}
                        className="w-full h-12 rounded-xl bg-bear-blue text-bear-black font-black text-base hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-bear-blue focus:ring-offset-2 focus:ring-offset-[#0a0a0a] transition-all"
                      >
                        Ir a pagar con tarjeta → ${price} {currencyLabel}
                      </button>
                      <p className="mt-3 text-center text-xs text-gray-500">
                        Stripe te pedirá los datos de la tarjeta en su página. Pago 100% seguro.
                      </p>
                    </>
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
                      <div className="flex flex-wrap items-center justify-center gap-2 py-3 text-xs text-gray-400 mb-2">
                        <Lock className="h-4 w-4 shrink-0" />
                        <span>🔒 Pago 100% Seguro y Encriptado</span>
                        <span className="hidden sm:inline">·</span>
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Visa, MC</span>
                        <span className="mx-0.5">·</span>
                        <Banknote className="h-3.5 w-3.5" />
                        <span>OXXO</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStripeCheckoutRedirect(selectedMethod!)}
                        className="w-full h-12 rounded-xl bg-bear-blue text-bear-black font-black text-base hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-bear-blue focus:ring-offset-2 focus:ring-offset-[#0a0a0a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        PAGAR ${price} {currencyLabel} Y ACCEDER →
                      </button>
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-gray-500">
                        <Lock className="h-3.5 w-3.5" />
                        <span>Transacción Encriptada 256-bit SSL · Visa, MC, OXXO</span>
                      </div>
                    </>
                  )}

                  {/* Testimonio en punto de dolor (debajo de toda la zona de pago) */}
                  <p className="mt-6 text-center text-sm text-gray-500 italic">
                    &quot;La mejor inversión de mi carrera. Recuperé el dinero en un evento.&quot; — DJ Alex, CDMX
                  </p>

                  {/* Sin método seleccionado */}
                  {!selectedMethod && (
                    <div className="mt-4 p-4 rounded-xl border border-dashed border-zinc-600 bg-zinc-900/30 text-center">
                      <p className="text-sm text-gray-400">👆 Elige un método de pago arriba para continuar</p>
                    </div>
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
                {selectedMethod === 'card' && 'Redirigiendo a la página segura de Stripe...'}
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

      <footer className="py-6 text-center text-zinc-600 text-xs">
        <p>🔒 Pagos encriptados con seguridad bancaria 256-bit SSL.</p>
        <p className="mt-2">© 2026 Bear Beat. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
