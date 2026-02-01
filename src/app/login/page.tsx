'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

// ==========================================
// LOGIN PAGE - Diseño Persuasivo
// ==========================================

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast.success('¡Bienvenido de vuelta! Redirigiendo...')
      
      // Usar window.location para asegurar navegación completa con nueva sesión
      setTimeout(() => {
        // Obtener redirect de URL si existe
        const params = new URLSearchParams(window.location.search)
        const redirectTo = params.get('redirect') || '/dashboard'
        window.location.href = redirectTo
      }, 500)
      
    } catch (error: any) {
      console.error('Error:', error)
      setLoading(false)
      if (error.message.includes('Invalid login')) {
        toast.error('Email o contraseña incorrectos')
      } else {
        toast.error(error.message || 'Error al iniciar sesión')
      }
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (error: any) {
      console.error('Error:', error)
      toast.error('Error al iniciar sesión con Google')
    }
  }

  return (
    <div className="min-h-screen bg-bear-black text-white">
      {/* Banner superior */}
      <div className="bg-gradient-to-r from-bear-blue via-cyan-400 to-bear-blue text-bear-black py-2 text-center text-sm font-bold">
        🎉 +3,000 DJs ya tienen acceso • <span className="underline">¿Qué esperas tú?</span>
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

            <h2 className="text-4xl font-black mb-8">
              Tu biblioteca de <span className="text-bear-blue">+3,000 videos</span> te espera
            </h2>

            {/* Beneficios */}
            <div className="space-y-4 mb-12">
              {[
                { icon: '📁', text: 'Descarga ilimitada vía Web y FTP' },
                { icon: '🎵', text: 'Todos los géneros: Reggaeton, Cumbia, Rock...' },
                { icon: '🔄', text: 'Actualizaciones mensuales incluidas' },
                { icon: '💻', text: 'Acceso desde cualquier dispositivo' },
                { icon: '⚡', text: 'Soporte 24/7 por WhatsApp' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-4 text-lg"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-gray-300">{item.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Testimonio */}
            <div className="bg-white/5 border border-bear-blue/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-bear-blue/30 rounded-full flex items-center justify-center text-xl">
                  🎧
                </div>
                <div>
                  <p className="font-bold">DJ Roberto</p>
                  <p className="text-sm text-gray-400">Guadalajara, MX</p>
                </div>
              </div>
              <p className="text-gray-300 italic">
                "Llevo 2 años con Bear Beat y no me arrepiento. 
                Siempre tienen el contenido más actual."
              </p>
              <div className="flex gap-1 mt-2 text-yellow-400">
                {'★★★★★'.split('').map((s, i) => <span key={i}>{s}</span>)}
              </div>
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

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-black mb-2">Bienvenido de vuelta 👋</h1>
              <p className="text-gray-400">
                Entra a tu cuenta para acceder a tus videos
              </p>
            </div>

            {/* Form Card */}
            <div className="bg-white/5 backdrop-blur border border-bear-blue/30 rounded-3xl p-8">
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-300">
                    📧 Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/10 border-2 border-bear-blue/30 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-bear-blue transition-colors"
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
                      className="w-full bg-white/10 border-2 border-bear-blue/30 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-bear-blue transition-colors pr-12"
                      placeholder="Tu contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {/* Forgot password */}
                <div className="text-right">
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-bear-blue hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-bear-blue text-bear-black font-black py-4 rounded-xl text-lg hover:bg-bear-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Entrando...
                    </span>
                  ) : (
                    'Entrar a mi cuenta →'
                  )}
                </motion.button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-transparent text-gray-500">o continúa con</span>
                </div>
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full bg-white/10 border border-white/20 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-white/20 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
            </div>

            {/* Register link */}
            <div className="mt-8 text-center">
              <div className="bg-gradient-to-r from-bear-blue/20 via-cyan-500/20 to-bear-blue/20 rounded-2xl p-6 border border-bear-blue/30">
                <p className="text-gray-400 mb-3">¿Aún no tienes cuenta?</p>
                <Link href="/register">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="w-full bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition-colors"
                  >
                    Crear cuenta gratis →
                  </motion.button>
                </Link>
                <p className="text-xs text-gray-500 mt-3">
                  🔒 Registro seguro • Sin spam
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
