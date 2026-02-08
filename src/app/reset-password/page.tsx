'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { getMessengerUrl } from '@/config/contact'

// ==========================================
// RESET PASSWORD PAGE - Diseño Persuasivo
// ==========================================

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Validación de contraseña
  const passwordStrength = () => {
    if (password.length === 0) return null
    if (password.length < 6) return { level: 'weak', text: 'Muy corta', color: 'red' }
    if (password.length < 8) return { level: 'medium', text: 'Regular', color: 'yellow' }
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { level: 'strong', text: 'Fuerte', color: 'green' }
    }
    return { level: 'medium', text: 'Buena', color: 'yellow' }
  }

  const strength = passwordStrength()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) throw error

      setSuccess(true)
      toast.success('¡Contraseña actualizada!')
      
      // Redirect after 3 seconds
      setTimeout(() => router.push('/login'), 3000)
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Error al cambiar contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bear-black text-white flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
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
          {!success ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🔐</div>
                <h1 className="text-3xl font-black mb-2">Nueva contraseña</h1>
                <p className="text-gray-400">
                  Escribe una contraseña segura para tu cuenta
                </p>
              </div>

              {/* Form Card */}
              <div className="bg-white/5 backdrop-blur border border-bear-blue/30 rounded-3xl p-8">
                <form onSubmit={handleResetPassword} className="space-y-5" method="post">
                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-300">
                      🔑 Nueva contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/10 border-2 border-bear-blue/30 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-bear-blue transition-colors pr-12"
                        placeholder="Mínimo 6 caracteres"
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
                    
                    {/* Password strength */}
                    {strength && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                strength.color === 'red' ? 'bg-red-500 w-1/3' :
                                strength.color === 'yellow' ? 'bg-yellow-500 w-2/3' :
                                'bg-green-500 w-full'
                              }`}
                            />
                          </div>
                          <span className={`text-xs ${
                            strength.color === 'red' ? 'text-red-400' :
                            strength.color === 'yellow' ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {strength.text}
                          </span>
                        </div>
                      </div>
                    )}
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
                      className={`w-full bg-white/10 border-2 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none transition-colors ${
                        confirmPassword && password !== confirmPassword 
                          ? 'border-red-500' 
                          : confirmPassword && password === confirmPassword
                          ? 'border-green-500'
                          : 'border-bear-blue/30 focus:border-bear-blue'
                      }`}
                      placeholder="Repite tu contraseña"
                      required
                    />
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-400 mt-1">Las contraseñas no coinciden</p>
                    )}
                    {confirmPassword && password === confirmPassword && (
                      <p className="text-xs text-green-400 mt-1">✓ Las contraseñas coinciden</p>
                    )}
                  </div>

                  {/* Tips */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs font-bold text-gray-400 mb-2">💡 Tips para una contraseña segura:</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>• Mínimo 8 caracteres</li>
                      <li>• Incluye mayúsculas y números</li>
                      <li>• Evita datos personales</li>
                    </ul>
                  </div>

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={loading || password.length < 6 || password !== confirmPassword}
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
                        Actualizando...
                      </span>
                    ) : (
                      '✅ Cambiar contraseña'
                    )}
                  </motion.button>
                </form>
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
                  className="text-8xl mb-6"
                >
                  ✅
                </motion.div>
                
                <h2 className="text-3xl font-black mb-4">¡Contraseña actualizada!</h2>
                
                <p className="text-gray-300 mb-8">
                  Tu nueva contraseña ha sido guardada.<br/>
                  Ahora puedes iniciar sesión.
                </p>

                <Link href="/login">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-bear-blue text-bear-black font-black py-4 rounded-xl text-lg hover:bg-bear-blue/90 transition-all"
                  >
                    Ir al Login →
                  </motion.button>
                </Link>

                <p className="text-xs text-gray-500 mt-4">
                  Redirigiendo automáticamente en 3 segundos...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            ¿Problemas?{' '}
            <a 
              href={getMessengerUrl()} 
              target="_blank"
              rel="noopener noreferrer"
              className="text-bear-blue hover:underline"
            >
              Contacta soporte (chat, Messenger o Instagram)
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
