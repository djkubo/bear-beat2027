'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Download, Music2, Monitor, Zap, Eye, EyeOff } from 'lucide-react'

// ==========================================
// LOGIN PAGE – Premium & Professional (Dark Mode, coherente con Home)
// Solo Email/Password. Sin Google Auth.
// ==========================================

const loginSchema = z.object({
  email: z.string().min(1, 'El email es obligatorio').email('Email no válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

type LoginFormData = z.infer<typeof loginSchema>

const BENEFITS = [
  { icon: Download, text: 'Descarga ilimitada vía Web y FTP' },
  { icon: Music2, text: 'Todos los géneros: Reggaeton, Cumbia, Rock...' },
  { icon: Monitor, text: 'Acceso desde cualquier dispositivo' },
  { icon: Zap, text: 'Te respondemos en minutos vía Chat' },
]

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: LoginFormData) => {
    setFormError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) throw error

      toast.success('¡Bienvenido de vuelta! Redirigiendo...')

      const params = new URLSearchParams(window.location.search)
      const redirectTo = params.get('redirect') || '/dashboard'
      await supabase.auth.getSession()

      const delay = redirectTo.includes('/admin') || redirectTo.includes('/fix-admin') ? 1200 : 600
      setTimeout(() => {
        window.location.href = redirectTo
      }, delay)
    } catch (err: unknown) {
      setLoading(false)
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
      if (message.includes('Invalid login') || message.includes('invalid')) {
        setFormError('Email o contraseña incorrectos. Revisa tus credenciales.')
      } else {
        setFormError(message)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bear-blue/5 via-[#050505] to-[#050505] text-white antialiased">
      {/* Barra superior – badge sutil */}
      <div className="border-b border-white/5 bg-white/[0.02] py-2 text-center">
        <p className="text-xs font-medium text-gray-500">
          <span className="text-bear-blue/90">+2,847</span> DJs ya tienen acceso
        </p>
      </div>

      <div className="flex min-h-[calc(100vh-40px)] flex-col lg:flex-row">
        {/* Columna izquierda – Refuerzo de marca (solo desktop) */}
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
              Tu biblioteca de videos te espera.
            </h2>

            <ul className="space-y-4 mb-10">
              {BENEFITS.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  className="flex items-center gap-4 text-gray-300"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bear-blue/10 text-bear-blue">
                    <item.icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <span className="text-base">{item.text}</span>
                </motion.li>
              ))}
            </ul>

            {/* Testimonio – tarjeta glassmorphism */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-bear-blue/20 text-bear-blue">
                  <Music2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-white">DJ Roberto</p>
                  <p className="text-sm text-gray-500">Guadalajara, MX</p>
                </div>
              </div>
              <p className="text-gray-400 italic text-sm leading-relaxed">
                &quot;Llevo 2 años con Bear Beat y no me arrepiento. Siempre tienen el contenido más actual.&quot;
              </p>
              <div className="mt-2 flex gap-0.5 text-yellow-500/90 text-sm">
                {'★★★★★'.split('').map((s, i) => (
                  <span key={i}>{s}</span>
                ))}
              </div>
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
            {/* Logo móvil */}
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

            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
                Bienvenido de vuelta, Maestro.
              </h1>
              <p className="text-base text-gray-500">
                Entra a tu cuenta para acceder a tu biblioteca
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-black/40 p-6 sm:p-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-gray-400 mb-2">
                    Email
                  </label>
                  <input
                    id="login-email"
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
                  <label htmlFor="login-password" className="block text-sm font-medium text-gray-400 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Tu contraseña"
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

                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-gray-500 underline-offset-2 hover:text-gray-300 hover:underline transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                {formError && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                    <p className="text-sm text-red-400">{formError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-bear-blue text-bear-black font-black text-lg transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-bear-blue focus:ring-offset-2 focus:ring-offset-[#050505] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(8,225,247,0.3)]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="h-5 w-5 animate-spin"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Entrando...
                    </span>
                  ) : (
                    'ENTRAR →'
                  )}
                </button>
              </form>
            </div>

            {/* Registro – abajo del todo */}
            <p className="mt-8 text-center text-sm text-gray-500">
              ¿Nuevo en Bear Beat?{' '}
              <Link
                href="/register"
                className="text-bear-blue font-medium underline-offset-2 hover:underline"
              >
                Crea una cuenta gratis
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
