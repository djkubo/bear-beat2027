'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PhoneInput } from '@/components/ui/phone-input'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { normalizePhoneNumber, validatePhoneNumber } from '@/lib/phone'
import Link from 'next/link'
import { CountryCode } from 'libphonenumber-js'

// ==========================================
// REGISTER PAGE - Diseño Persuasivo
// ==========================================

export default function RegisterPage() {
  const [step, setStep] = useState<'info' | 'verify-phone'>('info')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState<CountryCode>('MX')
  const [verificationCode, setVerificationCode] = useState('')
  const [sentCode, setSentCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  // Countdown para reenviar código
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleSubmitInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validaciones
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    
    if (!phone || phone.length < 8) {
      toast.error('Ingresa un teléfono válido')
      return
    }
    
    const isValidPhone = validatePhoneNumber(phone, country)
    if (!isValidPhone) {
      toast.error('El teléfono no es válido para el país seleccionado')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          action: 'send',
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar código')
      }
      
      if (data.code) {
        setSentCode(data.code)
        toast.success(`Código de desarrollo: ${data.code}`)
      } else {
        toast.success('¡Código enviado por SMS!')
      }
      
      setCountdown(60)
      setStep('verify-phone')
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Error al enviar código')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          code: verificationCode,
          action: 'verify',
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Código incorrecto')
      }
      
      const normalizedPhone = normalizePhoneNumber(phone, country)
      
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone: normalizedPhone,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      if (authData.user) {
        await supabase.from('users').insert({
          id: authData.user.id,
          email,
          name,
          phone: normalizedPhone,
          country_code: country,
        })
      }

      toast.success('¡Cuenta creada! Revisa tu email para verificar.')
      router.push('/verify-email')
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Error al crear cuenta')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (countdown > 0) return
    setLoading(true)
    
    try {
      const response = await fetch('/api/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, action: 'send' }),
      })
      
      const data = await response.json()
      
      if (data.code) setSentCode(data.code)
      
      toast.success('Código reenviado')
      setCountdown(60)
    } catch (error) {
      toast.error('Error al reenviar código')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bear-black text-white">
      {/* Banner superior */}
      <div className="bg-gradient-to-r from-bear-blue via-cyan-400 to-bear-blue text-bear-black py-2 text-center text-sm font-bold">
        🎁 REGISTRO GRATIS • Crea tu cuenta y accede a los demos
      </div>

      <div className="flex min-h-[calc(100vh-40px)]">
        {/* Sidebar con beneficios - Solo desktop */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-bear-black via-bear-blue/10 to-bear-black p-12 flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Logo */}
            <Link href="/" className="inline-flex items-center gap-3 mb-12">
              <img 
                src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png" 
                alt="Bear Beat" 
                className="h-16 w-auto"
              />
              <span className="text-3xl font-black">BEAR BEAT</span>
            </Link>

            <h2 className="text-4xl font-black mb-4">
              Únete a la comunidad de <span className="text-bear-blue">DJs profesionales</span>
            </h2>
            
            <p className="text-xl text-gray-400 mb-8">
              +3,000 DJs ya confían en nosotros para sus eventos
            </p>

            {/* Lo que obtienes */}
            <div className="bg-white/5 border border-bear-blue/30 rounded-2xl p-6 mb-8">
              <h3 className="font-bold text-lg mb-4 text-bear-blue">
                ✨ Al crear tu cuenta obtienes:
              </h3>
              <div className="space-y-3">
                {[
                  'Acceso a demos de videos',
                  'Precios exclusivos de miembro',
                  'Notificaciones de nuevos packs',
                  'Soporte prioritario por WhatsApp',
                  'Ofertas y descuentos especiales',
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-bear-blue text-xl">✓</span>
                    <span className="text-gray-300">{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {['🎧', '🎵', '🎤', '🎹'].map((emoji, i) => (
                  <div 
                    key={i}
                    className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border-2 border-bear-black text-lg"
                  >
                    {emoji}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-400">
                <span className="text-white font-bold">+156</span> se registraron esta semana
              </p>
            </div>
          </motion.div>
        </div>

        {/* Formulario */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            {/* Logo mobile */}
            <div className="lg:hidden text-center mb-8">
              <Link href="/" className="inline-flex items-center gap-3">
                <img 
                  src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png" 
                  alt="Bear Beat" 
                  className="h-12 w-auto"
                />
                <span className="text-2xl font-black">BEAR BEAT</span>
              </Link>
            </div>

            <AnimatePresence mode="wait">
              {step === 'info' ? (
                <motion.div
                  key="info"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {/* Header */}
                  <div className="text-center mb-8">
                    <h1 className="text-4xl font-black mb-2">Crear cuenta 🚀</h1>
                    <p className="text-gray-400">
                      En 2 minutos tendrás acceso
                    </p>
                  </div>

                  {/* Progress */}
                  <div className="flex gap-2 mb-6">
                    <div className="flex-1 h-1 bg-bear-blue rounded-full"></div>
                    <div className="flex-1 h-1 bg-white/20 rounded-full"></div>
                  </div>

                  {/* Form Card */}
                  <div className="bg-white/5 backdrop-blur border border-bear-blue/30 rounded-3xl p-8">
                    <form onSubmit={handleSubmitInfo} className="space-y-4">
                      {/* Nombre */}
                      <div>
                        <label className="block text-sm font-bold mb-2 text-gray-300">
                          👤 Nombre completo
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-white/10 border-2 border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-bear-blue transition-colors"
                          placeholder="Tu nombre"
                          required
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-bold mb-2 text-gray-300">
                          📧 Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-white/10 border-2 border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-bear-blue transition-colors"
                          placeholder="tu@email.com"
                          required
                        />
                      </div>

                      {/* Password */}
                      <div>
                        <label className="block text-sm font-bold mb-2 text-gray-300">
                          🔑 Contraseña
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/10 border-2 border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-bear-blue transition-colors pr-12"
                            placeholder="Mínimo 6 caracteres"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                          >
                            {showPassword ? '🙈' : '👁️'}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label className="block text-sm font-bold mb-2 text-gray-300">
                          ✅ Confirmar contraseña
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`w-full bg-white/10 border-2 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors ${
                            confirmPassword && password !== confirmPassword 
                              ? 'border-red-500' 
                              : confirmPassword && password === confirmPassword
                              ? 'border-bear-blue'
                              : 'border-white/20 focus:border-bear-blue'
                          }`}
                          placeholder="Repite tu contraseña"
                          required
                        />
                      </div>

                      {/* Teléfono */}
                      <div>
                        <label className="block text-sm font-bold mb-2 text-gray-300">
                          📱 WhatsApp (para enviarte tu acceso)
                        </label>
                        <PhoneInput
                          value={phone}
                          onChange={setPhone}
                          onCountryChange={setCountry}
                          defaultCountry={country}
                          placeholder="55 1234 5678"
                        />
                      </div>

                      {/* Submit */}
                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-bear-blue text-bear-black font-black py-4 rounded-xl text-lg hover:bg-bear-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6"
                      >
                        {loading ? 'Enviando código...' : 'Continuar →'}
                      </motion.button>
                    </form>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="text-6xl mb-4">📱</div>
                    <h1 className="text-3xl font-black mb-2">Verifica tu teléfono</h1>
                    <p className="text-gray-400">
                      Enviamos un código de 6 dígitos a<br/>
                      <span className="text-bear-blue font-bold">{phone}</span>
                    </p>
                  </div>

                  {/* Progress */}
                  <div className="flex gap-2 mb-6">
                    <div className="flex-1 h-1 bg-bear-blue rounded-full"></div>
                    <div className="flex-1 h-1 bg-bear-blue rounded-full"></div>
                  </div>

                  {/* Form Card */}
                  <div className="bg-white/5 backdrop-blur border border-bear-blue/30 rounded-3xl p-8">
                    <form onSubmit={handleVerifyPhone} className="space-y-6">
                      {/* Código */}
                      <div>
                        <label className="block text-sm font-bold mb-3 text-gray-300 text-center">
                          🔐 Código de verificación
                        </label>
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-full bg-white/10 border-2 border-bear-blue/50 rounded-xl px-4 py-5 text-white text-center text-3xl font-mono tracking-[0.5em] focus:outline-none focus:border-bear-blue transition-colors"
                          placeholder="000000"
                          maxLength={6}
                          required
                          autoFocus
                        />
                      </div>

                      {/* Código de desarrollo */}
                      {sentCode && (
                        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4 text-center">
                          <p className="text-xs text-yellow-400 font-bold">🔧 MODO DESARROLLO</p>
                          <p className="text-2xl font-mono font-bold mt-1">{sentCode}</p>
                        </div>
                      )}

                      {/* Submit */}
                      <motion.button
                        type="submit"
                        disabled={loading || verificationCode.length !== 6}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-bear-blue text-bear-black font-black py-4 rounded-xl text-lg hover:bg-bear-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {loading ? 'Verificando...' : '✅ Verificar y crear cuenta'}
                      </motion.button>

                      {/* Actions */}
                      <div className="flex flex-col gap-3 text-center">
                        <button
                          type="button"
                          onClick={() => setStep('info')}
                          className="text-sm text-gray-400 hover:text-white"
                        >
                          ← Cambiar número
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleResendCode}
                          disabled={countdown > 0 || loading}
                          className={`text-sm font-bold ${
                            countdown > 0 
                              ? 'text-gray-500 cursor-not-allowed' 
                              : 'text-bear-blue hover:underline'
                          }`}
                        >
                          {countdown > 0 
                            ? `Reenviar código en ${countdown}s` 
                            : '🔄 Reenviar código'
                          }
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login link */}
            <div className="mt-8 text-center">
              <p className="text-gray-400">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="text-bear-blue font-bold hover:underline">
                  Inicia sesión
                </Link>
              </p>
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex justify-center gap-4 text-xs text-gray-500">
              <span>🔒 Datos seguros</span>
              <span>•</span>
              <span>📵 Sin spam</span>
              <span>•</span>
              <span>✅ Gratis</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
