'use client'

import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { toast } from 'sonner'

// ==========================================
// VERIFY EMAIL – Dark Mode Premium, accesos directos a correo
// ==========================================

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const emailFromUrl = searchParams.get('email') ?? ''
  const [resending, setResending] = useState(false)
  const supabase = createClient()

  const handleResend = async () => {
    if (!emailFromUrl) {
      toast.error('No tenemos tu correo. Inicia sesión o contacta soporte.')
      return
    }
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailFromUrl,
      })
      if (error) throw error
      toast.success('Email reenviado. Revisa tu bandeja.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al reenviar')
    } finally {
      setResending(false)
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
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
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

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl">
          {/* Icono Hero – MailCheck con pulse */}
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="flex items-center justify-center w-16 h-16 rounded-2xl"
              style={{
                background: 'rgba(8,225,247,0.12)',
                border: '1px solid rgba(8,225,247,0.35)',
                boxShadow: '0 0 24px rgba(8,225,247,0.15)',
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              >
                <MailCheck className="w-8 h-8 text-[#08E1F7]" strokeWidth={2} />
              </motion.div>
            </motion.div>
          </div>

          {/* Texto principal */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3">
            ¡Casi listo! 🚀
          </h1>
          <p className="text-center text-zinc-400 text-sm sm:text-base mb-6">
            Enviamos un enlace de acceso a{' '}
            {emailFromUrl ? (
              <span className="text-[#08E1F7] font-medium break-all">{emailFromUrl}</span>
            ) : (
              <span className="text-white font-medium">tu correo</span>
            )}
            .
          </p>

          {/* Botones de acción rápida – Gmail / Outlook */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <a
              href="https://mail.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 hover:text-white transition-colors"
            >
              <Mail className="w-4 h-4 shrink-0 text-[#08E1F7]" />
              Abrir Gmail
            </a>
            <a
              href="https://outlook.live.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 hover:text-white transition-colors"
            >
              <Mail className="w-4 h-4 shrink-0 text-[#08E1F7]" />
              Abrir Outlook
            </a>
          </div>

          {/* Aviso Spam – Alert sutil */}
          <div className="rounded-xl border border-yellow-600/30 bg-yellow-900/20 px-4 py-3 mb-6">
            <p className="text-sm text-yellow-200/90 text-center">
              Tip: Si no aparece en 1 minuto, revisa tu carpeta de Spam.
            </p>
          </div>

          {/* Acciones secundarias */}
          <div className="space-y-3">
            <Link
              href="/login"
              className="w-full rounded-xl border-2 border-[#08E1F7] bg-transparent py-3.5 text-sm font-bold text-[#08E1F7] hover:bg-[#08E1F7]/10 transition-colors inline-flex items-center justify-center"
            >
              VOLVER AL INICIO DE SESIÓN
            </Link>
            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || !emailFromUrl}
                className="text-sm text-zinc-500 hover:text-[#08E1F7] hover:underline underline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? 'Enviando…' : '¿No llegó? Reenviar email'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer – Testimonio */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <div className="flex justify-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="text-amber-400/90 text-lg" aria-hidden>
                ★
              </span>
            ))}
          </div>
          <p className="text-sm text-zinc-500 italic">
            &ldquo;La mejor decisión que tomé para mis eventos&rdquo; — DJ Carlos
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
