'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import { getMessengerUrl } from '@/config/contact'
import { Lock, Mail, MailCheck, AlertCircle } from 'lucide-react'

// ==========================================
// FORGOT PASSWORD – Dark Mode Premium (identidad, seguridad, anti-spam)
// ==========================================

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(data.error || 'Error al enviar email')
        setLoading(false)
        return
      }

      setEmailSent(true)
      toast.success('¡Email enviado!')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al enviar email'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 text-white antialiased relative overflow-hidden"
      style={{
        background: '#0a0a0a',
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% 40%, rgba(8,225,247,0.06) 0%, transparent 60%)',
      }}
    >
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 text-white hover:opacity-90 transition-opacity">
            <Image
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat"
              width={48}
              height={48}
              className="h-12 w-auto"
            />
            <span className="text-xl font-black text-white tracking-tight">BEAR BEAT</span>
          </Link>
        </div>

        <AnimatePresence mode="wait">
          {!emailSent ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl"
            >
              {/* Icono Hero – Lock con glow cyan */}
              <div className="flex justify-center mb-6">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/10"
                  style={{
                    boxShadow: '0 0 32px rgba(6, 182, 212, 0.25)',
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                  }}
                >
                  <Lock className="w-8 h-8 text-cyan-500" strokeWidth={2} />
                </motion.div>
              </div>

              {/* Textos persuasivos */}
              <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">
                ¿Olvidaste tu contraseña?
              </h1>
              <p className="text-gray-400 text-center text-sm sm:text-base mb-6">
                Ingresa tu email y te enviaremos las instrucciones para restablecerla.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-5">
                {/* Input con icono Mail (estilo Login) */}
                <div>
                  <label htmlFor="forgot-email" className="sr-only">
                    Email
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                      <Mail className="w-5 h-5" strokeWidth={2} />
                    </span>
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      autoFocus
                      autoComplete="email"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-11 pr-4 py-3.5 text-white placeholder-zinc-500 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
                    />
                  </div>
                </div>

                {/* Botón de acción */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-xl bg-cyan-500 text-black font-bold py-4 text-sm uppercase tracking-wide hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Enviando...
                    </>
                  ) : (
                    <>ENVIAR INSTRUCCIONES →</>
                  )}
                </motion.button>
              </form>

              {/* Tip anti-spam */}
              <div className="mt-5 rounded-xl border border-amber-600/30 bg-amber-950/30 px-4 py-3 flex gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-500/90 mt-0.5" strokeWidth={2} />
                <p className="text-sm text-amber-200/90">
                  Tip: Si no recibes el correo en 1 minuto, revisa tu carpeta de Spam o Promociones.
                </p>
              </div>

              {/* Footer de tarjeta */}
              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="text-sm text-zinc-500 hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  ← Volver a Iniciar Sesión
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl"
            >
              {/* Icono MailCheck (éxito) */}
              <div className="flex justify-center mb-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10"
                  style={{
                    boxShadow: '0 0 24px rgba(6, 182, 212, 0.2)',
                    border: '1px solid rgba(6, 182, 212, 0.25)',
                  }}
                >
                  <MailCheck className="w-8 h-8 text-cyan-500" strokeWidth={2} />
                </motion.div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3">
                ¡Correo Enviado!
              </h2>
              <p className="text-center text-zinc-400 text-sm sm:text-base mb-2">
                Hemos enviado un enlace a{' '}
                <span className="text-cyan-400 font-medium break-all">{email}</span>.
              </p>
              <p className="text-center text-zinc-500 text-xs mb-6">
                Revisa también <strong>Spam</strong> y <strong>Promociones</strong>. El enlace caduca en 1 hora. Si no llega en 5 minutos, contacta soporte.
              </p>

              {/* Abrir Gmail / Abrir Outlook (misma lógica que verify-email) */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <a
                  href="https://mail.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4 shrink-0 text-cyan-500" strokeWidth={2} />
                  Abrir Gmail
                </a>
                <a
                  href="https://outlook.live.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4 shrink-0 text-cyan-500" strokeWidth={2} />
                  Abrir Outlook
                </a>
              </div>

              {/* Botón secundario: Volver a Iniciar Sesión */}
              <Link
                href="/login"
                className="w-full rounded-xl border-2 border-cyan-500/50 bg-transparent py-3.5 text-sm font-bold text-cyan-400 hover:bg-cyan-500/10 transition-colors inline-flex items-center justify-center"
              >
                ← Volver a Iniciar Sesión
              </Link>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setEmailSent(false)}
                  className="text-sm text-zinc-500 hover:text-cyan-400 hover:underline transition-colors"
                >
                  ¿No te llegó? Intentar con otro email
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ayuda */}
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-500">
            ¿Problemas para acceder?{' '}
            <a
              href={getMessengerUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-500 hover:text-cyan-400 hover:underline transition-colors"
            >
              Contacta soporte (chat, Messenger o Instagram)
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
