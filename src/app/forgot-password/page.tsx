'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'

// ==========================================
// FORGOT PASSWORD PAGE - Diseño Persuasivo
// ==========================================

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setEmailSent(true)
      toast.success('¡Email enviado!')
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Error al enviar email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bear-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <img 
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png" 
              alt="Bear Beat" 
              className="h-14 w-auto"
            />
            <span className="text-2xl font-black">BEAR BEAT</span>
          </Link>
        </div>

        <AnimatePresence mode="wait">
          {!emailSent ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🔐</div>
                <h1 className="text-3xl font-black mb-2">¿Olvidaste tu contraseña?</h1>
                <p className="text-gray-400">
                  No te preocupes, te enviamos un link para cambiarla
                </p>
              </div>

              {/* Form Card */}
              <div className="bg-white/5 backdrop-blur border border-bear-blue/30 rounded-3xl p-8">
                <form onSubmit={handleResetPassword} className="space-y-5">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-300">
                      📧 Tu email de registro
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/10 border-2 border-bear-blue/30 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-bear-blue transition-colors"
                      placeholder="tu@email.com"
                      required
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      El email que usaste para crear tu cuenta
                    </p>
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
                        Enviando...
                      </span>
                    ) : (
                      '📧 Enviar link de recuperación'
                    )}
                  </motion.button>
                </form>

                {/* Back to login */}
                <div className="mt-6 text-center">
                  <Link 
                    href="/login" 
                    className="text-sm text-gray-400 hover:text-white flex items-center justify-center gap-2"
                  >
                    ← Volver al login
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {/* Success State */}
              <div className="bg-green-500/10 border border-green-500/50 rounded-3xl p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="text-7xl mb-6"
                >
                  ✅
                </motion.div>
                
                <h2 className="text-3xl font-black mb-4">¡Email enviado!</h2>
                
                <p className="text-gray-300 mb-6">
                  Revisa tu bandeja de entrada de<br/>
                  <span className="text-green-400 font-bold">{email}</span>
                </p>

                {/* Instructions */}
                <div className="bg-white/5 rounded-xl p-5 mb-6 text-left">
                  <p className="font-bold mb-3 text-sm">¿Qué hacer ahora?</p>
                  <ol className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400">1.</span>
                      Abre tu email
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400">2.</span>
                      Busca el email de Bear Beat
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400">3.</span>
                      Haz clic en el link de recuperación
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400">4.</span>
                      Crea tu nueva contraseña
                    </li>
                  </ol>
                </div>

                <p className="text-xs text-gray-500 mb-6">
                  💡 Si no lo ves, revisa en spam o correo no deseado
                </p>

                <Link href="/login">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="w-full bg-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/20 transition-colors"
                  >
                    ← Volver al login
                  </motion.button>
                </Link>
              </div>

              {/* Resend option */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => setEmailSent(false)}
                  className="text-sm text-bear-blue hover:underline"
                >
                  ¿No te llegó? Intentar con otro email
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            ¿Problemas para acceder?{' '}
            <a 
              href="https://wa.me/5215512345678?text=Hola%2C%20necesito%20ayuda%20para%20recuperar%20mi%20contrase%C3%B1a" 
              target="_blank"
              className="text-bear-blue hover:underline"
            >
              Contacta soporte
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
