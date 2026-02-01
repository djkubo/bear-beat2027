'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

// ==========================================
// VERIFY EMAIL PAGE - Diseño Persuasivo
// ==========================================

export default function VerifyEmailPage() {
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

        {/* Main Card */}
        <div className="bg-gradient-to-br from-bear-blue/20 to-cyan-500/10 border border-bear-blue/50 rounded-3xl p-8 text-center">
          {/* Animated Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.8 }}
            className="text-8xl mb-6"
          >
            📧
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-black mb-4"
          >
            ¡Casi listo! 🎉
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-300 text-lg mb-8"
          >
            Te enviamos un email de verificación.<br/>
            Haz clic en el link para activar tu cuenta.
          </motion.p>

          {/* Steps */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/5 rounded-2xl p-6 mb-8 text-left"
          >
            <h3 className="font-bold mb-4 text-center">
              📋 Sigue estos pasos:
            </h3>
            <div className="space-y-4">
              {[
                { num: '1', text: 'Abre tu bandeja de entrada', icon: '📥' },
                { num: '2', text: 'Busca el email de Bear Beat', icon: '🔍' },
                { num: '3', text: 'Haz clic en "Verificar Email"', icon: '👆' },
                { num: '4', text: '¡Listo! Ya puedes iniciar sesión', icon: '✅' },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-8 h-8 bg-bear-blue/30 rounded-full flex items-center justify-center text-sm font-bold text-bear-blue">
                    {step.num}
                  </div>
                  <span className="text-gray-300 flex-1">{step.text}</span>
                  <span className="text-xl">{step.icon}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6"
          >
            <p className="text-sm text-yellow-400">
              💡 <strong>Tip:</strong> Si no ves el email, revisa en spam o correo no deseado
            </p>
          </motion.div>

          {/* Login button */}
          <Link href="/login">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-bear-blue text-bear-black font-black py-4 rounded-xl text-lg hover:bg-bear-blue/90 transition-all"
            >
              Ir al Login →
            </motion.button>
          </Link>
        </div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-8 text-center"
        >
          <div className="flex justify-center gap-2 mb-3">
            {['⭐', '⭐', '⭐', '⭐', '⭐'].map((star, i) => (
              <span key={i} className="text-yellow-400 text-xl">{star}</span>
            ))}
          </div>
          <p className="text-sm text-gray-500">
            "La mejor decisión que tomé para mis eventos" - DJ Carlos
          </p>
        </motion.div>

        {/* Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            ¿No te llegó el email?{' '}
            <a 
              href="https://wa.me/5215512345678?text=Hola%2C%20no%20me%20llega%20el%20email%20de%20verificaci%C3%B3n" 
              target="_blank"
              className="text-bear-blue hover:underline"
            >
              Contacta soporte
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
