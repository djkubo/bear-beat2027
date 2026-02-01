'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { trackCTAClick } from '@/lib/tracking'

// ==========================================
// EMBUDO DE CONVERSIÓN - CHECKOUT PERFECTO
// ==========================================

type PaymentMethod = 'oxxo' | 'spei' | 'card'
type Step = 'select' | 'processing' | 'redirect'

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const packSlug = searchParams.get('pack') || 'pack-enero-2026'
  
  const [step, setStep] = useState<Step>('select')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [country, setCountry] = useState('MX')
  const [currency, setCurrency] = useState<'mxn' | 'usd'>('mxn')
  const [error, setError] = useState<string | null>(null)

  // Detectar país
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        setCountry(data.country_code || 'MX')
        setCurrency(data.country_code === 'MX' ? 'mxn' : 'usd')
      })
      .catch(() => {
        setCountry('MX')
        setCurrency('mxn')
      })
  }, [])

  const price = currency === 'mxn' ? 350 : 19
  const currencyLabel = currency === 'mxn' ? 'MXN' : 'USD'

  // Procesar pago
  const handlePayment = async (method: PaymentMethod) => {
    setSelectedMethod(method)
    setStep('processing')
    setError(null)

    try {
      // Track
      trackCTAClick('checkout_method', 'checkout', { method, pack: packSlug })

      // Crear sesión de Stripe
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packSlug,
          paymentMethod: method,
          currency,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar')
      }

      // Redirigir a Stripe
      setStep('redirect')
      
      // Pequeño delay para mostrar mensaje
      setTimeout(() => {
        window.location.href = data.url
      }, 1500)

    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Algo salió mal. Intenta de nuevo.')
      setStep('select')
      toast.error('Error al procesar. Intenta de nuevo.')
    }
  }

  return (
    <div className="min-h-screen bg-bear-black text-white">
      {/* Header simple */}
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
          
          {/* Progress */}
          <div className="flex items-center gap-2 text-sm">
            <span className="w-6 h-6 bg-bear-blue text-bear-black rounded-full flex items-center justify-center font-bold text-xs">1</span>
            <span className="text-bear-blue font-bold">Pagar</span>
            <span className="text-gray-600">→</span>
            <span className="w-6 h-6 bg-gray-700 text-gray-400 rounded-full flex items-center justify-center font-bold text-xs">2</span>
            <span className="text-gray-500">Acceso</span>
          </div>
        </div>
      </header>

      <main className="py-8 px-4">
        <div className="max-w-3xl mx-auto">
          
          <AnimatePresence mode="wait">
            {/* ==================== PASO 1: SELECCIONAR MÉTODO ==================== */}
            {step === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Resumen del pedido - SÚPER CLARO */}
                <div className="bg-gradient-to-r from-bear-blue/20 to-bear-blue/5 border-2 border-bear-blue/50 rounded-2xl p-6 mb-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-black mb-1">
                        📦 Pack Enero 2026 - Video Remixes
                      </h1>
                      <p className="text-gray-400">
                        178 videos HD • Descarga ilimitada • Pago único
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl md:text-5xl font-black text-bear-blue">
                        ${price}
                      </div>
                      <div className="text-sm text-gray-400">{currencyLabel} • Pago único</div>
                    </div>
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-6 text-center">
                    <p className="text-red-400 font-bold">{error}</p>
                    <p className="text-sm text-red-300 mt-1">Intenta con otro método de pago</p>
                  </div>
                )}

                {/* Título */}
                <h2 className="text-xl md:text-2xl font-bold text-center mb-6">
                  ¿Cómo quieres pagar? 👇
                </h2>

                {/* Métodos de pago */}
                <div className="space-y-4">
                  
                  {/* OXXO - México */}
                  {country === 'MX' && (
                    <button
                      onClick={() => handlePayment('oxxo')}
                      className="w-full bg-white/5 hover:bg-red-500/20 border-2 border-red-500/50 hover:border-red-500 rounded-2xl p-5 text-left transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-red-500 rounded-xl flex items-center justify-center text-3xl shrink-0">
                          🏪
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl font-black">OXXO</span>
                            <span className="bg-yellow-500 text-yellow-900 px-2 py-0.5 rounded text-xs font-bold">
                              MÁS POPULAR
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm">
                            Paga en efectivo en cualquier OXXO
                          </p>
                          <div className="flex gap-2 mt-2">
                            <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded text-xs font-bold">
                              ⏰ 1-24 horas
                            </span>
                            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">
                              Sin tarjeta
                            </span>
                          </div>
                        </div>
                        <div className="text-2xl group-hover:translate-x-1 transition-transform">
                          →
                        </div>
                      </div>
                    </button>
                  )}

                  {/* SPEI - México */}
                  {country === 'MX' && (
                    <button
                      onClick={() => handlePayment('spei')}
                      className="w-full bg-white/5 hover:bg-green-500/20 border-2 border-green-500/50 hover:border-green-500 rounded-2xl p-5 text-left transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center text-3xl shrink-0">
                          🏦
                        </div>
                        <div className="flex-1">
                          <div className="text-xl font-black mb-1">Transferencia SPEI</div>
                          <p className="text-gray-400 text-sm">
                            Desde tu app del banco
                          </p>
                          <div className="flex gap-2 mt-2">
                            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">
                              ⚡ Casi inmediato
                            </span>
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold">
                              Cualquier banco
                            </span>
                          </div>
                        </div>
                        <div className="text-2xl group-hover:translate-x-1 transition-transform">
                          →
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Tarjeta */}
                  <button
                    onClick={() => handlePayment('card')}
                    className="w-full bg-white/5 hover:bg-bear-blue/20 border-2 border-bear-blue/50 hover:border-bear-blue rounded-2xl p-5 text-left transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-bear-blue/30 rounded-xl flex items-center justify-center text-3xl shrink-0">
                        💳
                      </div>
                      <div className="flex-1">
                        <div className="text-xl font-black mb-1">Tarjeta de Crédito/Débito</div>
                        <p className="text-gray-400 text-sm">
                          Visa, Mastercard, American Express
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">
                            ⚡ Inmediato
                          </span>
                          <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs font-bold">
                            🌎 Internacional
                          </span>
                        </div>
                      </div>
                      <div className="text-2xl group-hover:translate-x-1 transition-transform">
                        →
                      </div>
                    </div>
                  </button>

                  {/* PayPal — integración separada (no Stripe) */}
                  <Link
                    href={`/checkout-paypal?pack=${packSlug}&currency=${currency}`}
                    className="block w-full bg-white/5 hover:bg-yellow-500/20 border-2 border-yellow-500/50 hover:border-yellow-500 rounded-2xl p-5 text-left transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-[#003087] rounded-xl flex items-center justify-center shrink-0">
                        <svg className="w-10 h-6" viewBox="0 0 124 33" fill="none">
                          <path d="M46.211 6.749h-6.839a.95.95 0 0 0-.939.802l-2.766 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.972-1.142-2.696-1.746-4.985-1.746zM47 13.154c-.374 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.481h.473c1.235 0 2.4 0 3.002.704.359.42.468 1.044.332 1.906zM66.654 13.075h-3.275a.57.57 0 0 0-.563.481l-.145.916-.229-.332c-.709-1.029-2.29-1.373-3.868-1.373-3.619 0-6.71 2.741-7.312 6.586-.313 1.918.132 3.752 1.22 5.031.998 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .562.66h2.95a.95.95 0 0 0 .939-.803l1.77-11.209a.568.568 0 0 0-.561-.658zm-4.565 6.374c-.316 1.871-1.801 3.127-3.695 3.127-.951 0-1.711-.305-2.199-.883-.484-.574-.668-1.391-.514-2.301.295-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.499.589.697 1.411.554 2.317zM84.096 13.075h-3.291a.954.954 0 0 0-.787.417l-4.539 6.686-1.924-6.425a.953.953 0 0 0-.912-.678h-3.234a.57.57 0 0 0-.541.754l3.625 10.638-3.408 4.811a.57.57 0 0 0 .465.9h3.287a.949.949 0 0 0 .781-.408l10.946-15.8a.57.57 0 0 0-.468-.895z" fill="#fff"/>
                          <path d="M94.992 6.749h-6.84a.95.95 0 0 0-.938.802l-2.766 17.537a.569.569 0 0 0 .562.658h3.51a.665.665 0 0 0 .656-.562l.785-4.971a.95.95 0 0 1 .938-.803h2.164c4.506 0 7.105-2.18 7.785-6.5.307-1.89.012-3.375-.873-4.415-.971-1.142-2.694-1.746-4.983-1.746zm.789 6.405c-.373 2.454-2.248 2.454-4.062 2.454h-1.031l.725-4.583a.568.568 0 0 1 .562-.481h.473c1.234 0 2.4 0 3.002.704.359.42.468 1.044.331 1.906zM115.434 13.075h-3.273a.567.567 0 0 0-.562.481l-.145.916-.23-.332c-.709-1.029-2.289-1.373-3.867-1.373-3.619 0-6.709 2.741-7.311 6.586-.312 1.918.131 3.752 1.219 5.031 1 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .564.66h2.949a.95.95 0 0 0 .938-.803l1.771-11.209a.571.571 0 0 0-.565-.658zm-4.565 6.374c-.314 1.871-1.801 3.127-3.695 3.127-.949 0-1.711-.305-2.199-.883-.484-.574-.666-1.391-.514-2.301.297-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.501.589.699 1.411.554 2.317zM119.295 7.23l-2.807 17.858a.569.569 0 0 0 .562.658h2.822c.469 0 .867-.34.939-.803l2.768-17.536a.57.57 0 0 0-.562-.659h-3.16a.571.571 0 0 0-.562.482z" fill="#fff"/>
                          <path d="M7.266 29.154l.523-3.322-1.165-.027H1.061L4.927 1.292a.316.316 0 0 1 .314-.268h9.38c3.114 0 5.263.648 6.385 1.927.526.6.861 1.227 1.023 1.917.17.724.173 1.589.007 2.644l-.012.077v.676l.526.298a3.69 3.69 0 0 1 1.065.812c.45.513.741 1.165.864 1.938.127.795.085 1.741-.123 2.812-.24 1.232-.628 2.305-1.152 3.183a6.547 6.547 0 0 1-1.825 2c-.696.494-1.523.869-2.458 1.109-.906.236-1.939.355-3.072.355h-.73c-.522 0-1.029.188-1.427.525a2.21 2.21 0 0 0-.744 1.328l-.055.299-.924 5.855-.042.215c-.011.068-.03.102-.058.125a.155.155 0 0 1-.096.035H7.266z" fill="#253B80"/>
                          <path d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132L6.596 26.83l-.399 2.533a.704.704 0 0 0 .695.814h4.881c.578 0 1.069-.42 1.16-.99l.048-.248.919-5.832.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.336-1.03z" fill="#179BD7"/>
                          <path d="M21.754 7.151a9.757 9.757 0 0 0-1.203-.267 15.284 15.284 0 0 0-2.426-.177H11.27a1.17 1.17 0 0 0-1.161.992L8.59 17.665l-.064.407a1.348 1.348 0 0 1 1.322-1.132h2.752c5.405 0 9.637-2.195 10.874-8.545.037-.188.068-.371.096-.55a6.57 6.57 0 0 0-1.017-.42 9.253 9.253 0 0 0-.799-.274z" fill="#222D65"/>
                          <path d="M10.108 8.699a1.167 1.167 0 0 1 1.161-.992h6.856c.813 0 1.571.053 2.426.177a9.654 9.654 0 0 1 1.481.353c.365.121.704.264 1.017.42.368-2.347-.003-3.945-1.272-5.392C20.378 1.667 17.853 1 14.622 1h-9.38c-.66 0-1.223.48-1.325 1.133L.01 25.898a.806.806 0 0 0 .795.932h5.791l1.454-9.225 2.058-8.906z" fill="#253B80"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-xl font-black mb-1">PayPal</div>
                        <p className="text-gray-400 text-sm">
                          Paga con tu cuenta de PayPal (integración directa)
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">
                            ⚡ Inmediato
                          </span>
                          <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold">
                            🔒 Protección al comprador
                          </span>
                        </div>
                      </div>
                      <div className="text-2xl group-hover:translate-x-1 transition-transform">
                        →
                      </div>
                    </div>
                  </Link>

                </div>

                {/* Garantías */}
                <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm">
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-2xl mb-1">🔒</div>
                    <div className="font-bold text-xs">Pago Seguro</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-2xl mb-1">⚡</div>
                    <div className="font-bold text-xs">Acceso Rápido</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-2xl mb-1">🛡️</div>
                    <div className="font-bold text-xs">Garantía 30 días</div>
                  </div>
                </div>

                {/* Qué pasa después */}
                <div className="mt-8 bg-bear-blue/10 border border-bear-blue/30 rounded-2xl p-6">
                  <h3 className="font-bold text-lg mb-4 text-center">
                    ¿Qué pasa después de pagar? 🤔
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <div className="text-3xl mb-2">1️⃣</div>
                      <p className="font-bold">Recibes confirmación</p>
                      <p className="text-gray-400 text-xs">Por email y WhatsApp</p>
                    </div>
                    <div>
                      <div className="text-3xl mb-2">2️⃣</div>
                      <p className="font-bold">Creas tu cuenta</p>
                      <p className="text-gray-400 text-xs">Email + contraseña</p>
                    </div>
                    <div>
                      <div className="text-3xl mb-2">3️⃣</div>
                      <p className="font-bold">¡Descargas todo!</p>
                      <p className="text-gray-400 text-xs">Web o FTP</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ==================== PASO 2: PROCESANDO ==================== */}
            {step === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-20"
              >
                <div className="inline-block mb-8">
                  <div className="w-20 h-20 border-4 border-bear-blue border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
                <h2 className="text-2xl md:text-3xl font-black mb-4">
                  Preparando tu pago...
                </h2>
                <p className="text-gray-400 text-lg">
                  {selectedMethod === 'oxxo' && 'Generando tu ficha de OXXO...'}
                  {selectedMethod === 'spei' && 'Generando tu referencia SPEI...'}
                  {selectedMethod === 'card' && 'Conectando con el procesador...'}
                </p>
                <p className="text-sm text-gray-500 mt-4">
                  No cierres esta ventana
                </p>
              </motion.div>
            )}

            {/* ==================== PASO 3: REDIRIGIENDO ==================== */}
            {step === 'redirect' && (
              <motion.div
                key="redirect"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-20"
              >
                <div className="text-6xl mb-6">🚀</div>
                <h2 className="text-2xl md:text-3xl font-black mb-4 text-bear-blue">
                  ¡Listo!
                </h2>
                <p className="text-gray-400 text-lg mb-4">
                  Te estamos llevando a la página de pago seguro...
                </p>
                <div className="flex justify-center gap-2">
                  <div className="w-3 h-3 bg-bear-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-3 h-3 bg-bear-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-3 h-3 bg-bear-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>

      {/* Footer simple */}
      <footer className="py-6 px-4 border-t border-white/10 text-center text-sm text-gray-500">
        <p>🔒 Pagos procesados de forma segura por Stripe</p>
        <p className="mt-1">
          ¿Problemas? <a href="mailto:soporte@bearbeat.com" className="text-bear-blue hover:underline">soporte@bearbeat.com</a>
        </p>
      </footer>
    </div>
  )
}
