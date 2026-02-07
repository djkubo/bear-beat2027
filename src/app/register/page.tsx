'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PhoneInput } from '@/components/ui/phone-input'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { normalizePhoneNumber, validatePhoneNumber } from '@/lib/phone'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, TrendingUp, Eye, EyeOff, MessageSquare, Pencil } from 'lucide-react'
import { CountryCode } from 'libphonenumber-js'
import { parsePhoneNumber } from 'libphonenumber-js'

// ==========================================
// REGISTER PAGE – Dark Mode Premium (alineado a Login y Home)
// Sin confirmar contraseña. Sin auth social.
// ==========================================

const registerSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(120, 'Nombre demasiado largo'),
  email: z.string().min(1, 'El email es obligatorio').email('Email no válido'),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(100, 'Contraseña demasiado larga'),
})

type RegisterFormData = z.infer<typeof registerSchema>

const BENEFITS = [
  'Acceso a demos exclusivos',
  'Precios de miembro',
  'Soporte vía Chat',
]

export default function RegisterPage() {
  const [step, setStep] = useState<'info' | 'verify-phone'>('info')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState<CountryCode>('MX')
  const [verificationCode, setVerificationCode] = useState('')
  const [sentCode, setSentCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [formError, setFormError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  })

  const name = watch('name')
  const email = watch('email')
  const password = watch('password')

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [otpHasError, setOtpHasError] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Formatear teléfono para mostrar (ej: +52 55 1234 5678)
  const displayPhone = (() => {
    try {
      const p = parsePhoneNumber(phone, country)
      return p ? p.formatInternational() : phone
    } catch {
      return phone
    }
  })()

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  const onStep1 = async (data: RegisterFormData) => {
    setFormError(null)
    if (!phone || phone.length < 8) {
      setFormError('Ingresa un número de teléfono válido.')
      return
    }
    const isValidPhone = validatePhoneNumber(phone, country)
    if (!isValidPhone) {
      setFormError('El teléfono no es válido para el país seleccionado.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, action: 'send' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al enviar código')
      if (json.code) {
        setSentCode(json.code)
        toast.success(`Código de desarrollo: ${json.code}`)
      } else {
        toast.success('¡Código enviado por SMS!')
      }
      setCountdown(60)
      setStep('verify-phone')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al enviar código')
      setFormError(e instanceof Error ? e.message : 'Error al enviar código')
    } finally {
      setLoading(false)
    }
  }

  const setOtpDigit = useCallback((index: number, digit: string) => {
    setOtpHasError(false)
    setFormError(null)
    setVerificationCode((prev) => {
      const next = prev.split('')
      next[index] = digit
      const joined = next.join('').slice(0, 6)
      return joined
    })
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
  }, [])

  const handleOtpKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (verificationCode[index]) {
        setVerificationCode((prev) => prev.slice(0, index) + prev.slice(index + 1))
        setOtpHasError(false)
      } else if (index > 0) {
        otpRefs.current[index - 1]?.focus()
        setVerificationCode((prev) => prev.slice(0, index - 1))
        setOtpHasError(false)
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus()
  }, [verificationCode])

  const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    setOtpHasError(false)
    setFormError(null)
    setVerificationCode(pasted)
    const nextIndex = Math.min(pasted.length, 5)
    otpRefs.current[nextIndex]?.focus()
  }, [])

  const onStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setOtpHasError(false)
    setLoading(true)
    try {
      const res = await fetch('/api/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: verificationCode, action: 'verify' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Código incorrecto')

      const normalizedPhone = normalizePhoneNumber(phone, country)
      if (!normalizedPhone) throw new Error('Teléfono inválido')

      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '')
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, phone: normalizedPhone, country_code: country },
          emailRedirectTo: `${baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')}/auth/callback`,
        },
      })
      if (error) throw error
      toast.success('¡Cuenta creada! Revisa tu email para verificar.')
      router.push(`/verify-email?email=${encodeURIComponent(email)}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear cuenta'
      setFormError(msg)
      setOtpHasError(true)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (countdown > 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, action: 'send' }),
      })
      const json = await res.json()
      if (json.code) setSentCode(json.code)
      toast.success('Código reenviado')
      setCountdown(60)
    } catch {
      toast.error('Error al reenviar código')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bear-blue/5 via-[#050505] to-[#050505] text-white antialiased">
      <div className="border-b border-white/5 bg-white/[0.02] py-2 text-center">
        <p className="text-xs font-medium text-gray-500">
          Registro gratis · Accede a demos y precios de miembro
        </p>
      </div>

      <div className="flex min-h-[calc(100vh-40px)] flex-col lg:flex-row">
        {/* Columna izquierda – Propuesta de valor y prueba social (solo desktop) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-16 bg-[#0a0a0a]/80 border-r border-white/5">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-md"
          >
            <Link href="/" className="inline-flex items-center gap-3 mb-12">
              <Image
                src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
                alt="Bear Beat"
                width={56}
                height={56}
                className="h-14 w-auto"
              />
              <span className="text-2xl font-black text-white tracking-tight">BEAR BEAT</span>
            </Link>

            <h2 className="text-3xl xl:text-4xl font-black text-white mb-10 leading-tight">
              Activa tu Cuenta PRO.
            </h2>

            <ul className="space-y-4 mb-10">
              {BENEFITS.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  className="flex items-center gap-3 text-gray-300"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bear-blue/10 text-bear-blue">
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  <span className="text-base">{item}</span>
                </motion.li>
              ))}
            </ul>

            {/* Prueba social – badge elegante */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bear-blue/10 text-bear-blue">
                <TrendingUp className="h-5 w-5" />
              </span>
              <p className="text-sm text-gray-400">
                Únete a la comunidad de DJs que ya usan Bear Beat
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Columna derecha – Formulario */}
        <div className="flex flex-1 items-center justify-center p-6 sm:p-8 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <div className="lg:hidden text-center mb-8">
              <Link href="/" className="inline-flex items-center gap-2">
                <Image
                  src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
                  alt="Bear Beat"
                  width={40}
                  height={40}
                  className="h-10 w-auto"
                />
                <span className="text-xl font-black text-bear-blue">BEAR BEAT</span>
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
                  <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
                      Activa tu Cuenta PRO.
                    </h1>
                    <p className="text-base text-gray-500">
                      En 2 minutos tendrás acceso
                    </p>
                  </div>

                  <div className="flex gap-2 mb-6">
                    <div className="flex-1 h-1 rounded-full bg-bear-blue" />
                    <div className="flex-1 h-1 rounded-full bg-white/20" />
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-black/40 p-6 sm:p-8">
                    <form onSubmit={handleSubmit(onStep1)} className="space-y-5" noValidate>
                      <div>
                        <label htmlFor="reg-name" className="block text-sm font-medium text-gray-400 mb-2">
                          Nombre
                        </label>
                        <input
                          id="reg-name"
                          type="text"
                          autoComplete="name"
                          placeholder="Tu nombre"
                          className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors focus:border-bear-blue focus:ring-2 focus:ring-bear-blue/20"
                          {...register('name')}
                        />
                        {errors.name && (
                          <p className="mt-1.5 text-sm text-red-400">{errors.name.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="reg-email" className="block text-sm font-medium text-gray-400 mb-2">
                          Email
                        </label>
                        <input
                          id="reg-email"
                          type="email"
                          autoComplete="email"
                          placeholder="tu@email.com"
                          className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors focus:border-bear-blue focus:ring-2 focus:ring-bear-blue/20"
                          {...register('email')}
                        />
                        {errors.email && (
                          <p className="mt-1.5 text-sm text-red-400">{errors.email.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="reg-phone" className="block text-sm font-medium text-gray-400 mb-2">
                          Teléfono
                        </label>
                        <p className="text-xs text-gray-500 mb-2">(para enviarte tu acceso)</p>
                        <div
                          className="[&_select]:bg-black [&_select]:border-zinc-800 [&_select]:text-white [&_select]:rounded-xl [&_select]:px-3 [&_select]:py-3 [&_select]:focus:border-bear-blue [&_select]:focus:ring-2 [&_select]:focus:ring-bear-blue/20 [&_select]:outline-none [&_input]:bg-black [&_input]:border-zinc-800 [&_input]:text-white [&_input]:rounded-xl [&_input]:px-4 [&_input]:py-3 [&_input]:placeholder-gray-600 [&_input]:focus:border-bear-blue [&_input]:focus:ring-2 [&_input]:focus:ring-bear-blue/20 [&_input]:outline-none"
                        >
                          <PhoneInput
                            value={phone}
                            onChange={setPhone}
                            onCountryChange={setCountry}
                            defaultCountry={country}
                            placeholder="Ej: 55 1234 5678"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="reg-password" className="block text-sm font-medium text-gray-400 mb-2">
                          Contraseña
                        </label>
                        <div className="relative">
                          <input
                            id="reg-password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Mínimo 6 caracteres"
                            className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 pr-12 text-white placeholder-gray-600 outline-none transition-colors focus:border-bear-blue focus:ring-2 focus:ring-bear-blue/20"
                            {...register('password')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="mt-1.5 text-sm text-red-400">{errors.password.message}</p>
                        )}
                      </div>

                      {formError && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                          <p className="text-sm text-red-400">{formError}</p>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-xl bg-bear-blue text-bear-black font-black text-lg transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-bear-blue focus:ring-offset-2 focus:ring-offset-[#050505] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" aria-hidden>
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Enviando código...
                          </span>
                        ) : (
                          'CONTINUAR →'
                        )}
                      </button>
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
                  {/* Header del paso OTP – Dark Mode Premium */}
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bear-blue/10 text-bear-blue">
                        <MessageSquare className="h-5 w-5" />
                      </span>
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white">
                          Verifica tu teléfono
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Enviamos un código de 6 dígitos a:
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-lg sm:text-xl font-bold text-white tracking-tight">
                        {displayPhone}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setStep('info'); setFormError(null); setOtpHasError(false); setVerificationCode(''); }}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Cambiar
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-6">
                    <div className="flex-1 h-1 rounded-full bg-bear-blue" />
                    <div className="flex-1 h-1 rounded-full bg-bear-blue" />
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-black/40 p-6 sm:p-8">
                    <form onSubmit={onStep2} className="space-y-6">
                      {/* OTP: 6 inputs separados */}
                      <div className="flex justify-center gap-2 sm:gap-3">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <input
                            key={index}
                            ref={(el) => { otpRefs.current[index] = el }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            autoComplete="one-time-code"
                            autoFocus={index === 0}
                            value={verificationCode[index] ?? ''}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, '').slice(0, 1)
                              setOtpDigit(index, v)
                            }}
                            onKeyDown={(e) => handleOtpKeyDown(e, index)}
                            onPaste={handleOtpPaste}
                            className={`h-12 w-10 sm:w-12 rounded-xl border bg-black text-center text-xl font-bold text-white outline-none transition-all focus:ring-2 focus:ring-bear-blue/30 ${
                              otpHasError
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                                : 'border-zinc-700 focus:border-bear-blue'
                            }`}
                            aria-label={`Dígito ${index + 1}`}
                          />
                        ))}
                      </div>

                      {sentCode && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center">
                          <p className="text-xs font-medium text-amber-400">Modo desarrollo</p>
                          <p className="text-xl font-mono font-bold text-amber-300 mt-1">{sentCode}</p>
                        </div>
                      )}

                      {formError && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3"
                        >
                          <p className="text-sm text-red-400">{formError}</p>
                        </motion.div>
                      )}

                      <button
                        type="submit"
                        disabled={loading || verificationCode.length !== 6}
                        className="w-full h-12 rounded-xl bg-bear-blue text-bear-black font-black text-lg transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-bear-blue focus:ring-offset-2 focus:ring-offset-[#050505] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" aria-hidden>
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Validando...
                          </span>
                        ) : (
                          'VALIDAR Y ACCEDER →'
                        )}
                      </button>

                      {/* Footer: Reenviar código */}
                      <div className="pt-2 text-center space-y-1">
                        <p className="text-sm text-gray-500">¿No recibiste el código?</p>
                        <div className="flex flex-col items-center gap-1">
                          {countdown > 0 ? (
                            <span className="text-sm text-gray-500">
                              Reenviar en {countdown}s
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResendCode}
                              disabled={loading}
                              className="text-sm font-medium text-bear-blue hover:text-white hover:underline transition-colors disabled:opacity-50"
                            >
                              Reenviar código
                            </button>
                          )}
                        </div>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="mt-8 text-center text-sm text-gray-500">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-bear-blue font-medium underline-offset-2 hover:underline">
                Inicia sesión
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
