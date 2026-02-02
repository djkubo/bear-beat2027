'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { getMessengerUrl } from '@/config/contact'

// ==========================================
// MENÚ MÓVIL – App Nativa Premium
// Dark (zinc-950), acentos cyan neon, glassmorphism
// ==========================================

interface MobileMenuProps {
  currentPath?: string
  userHasAccess?: boolean
  isLoggedIn?: boolean
}

export function MobileMenu({ currentPath = '/', userHasAccess = false, isLoggedIn = false }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Evitar scroll del body cuando el drawer está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const menuItems = userHasAccess
    ? [
        { href: '/dashboard', label: 'Mi Panel', icon: '📊', highlight: true },
        { href: '/portal', label: 'Portal', icon: '🚪' },
        { href: '/contenido', label: 'Descargar Videos', icon: '⬇️' },
        { href: '/comunidad', label: 'Comunidad VIP', icon: '💬' },
        { href: '/mi-cuenta', label: 'Mi cuenta', icon: '👤' },
        { href: '/', label: 'Inicio', icon: '🏠' },
      ]
    : isLoggedIn
      ? [
          { href: '/', label: 'Inicio', icon: '🏠' },
          { href: '/contenido', label: 'Ver Contenido', icon: '👁️' },
          { href: '/checkout?pack=enero-2026', label: 'Comprar Acceso', icon: '💳', highlight: true },
          { href: '/dashboard', label: 'Mi Panel', icon: '📊' },
          { href: '/portal', label: 'Portal', icon: '🚪' },
          { href: '/comunidad', label: 'Comunidad VIP', icon: '💬' },
          { href: '/mi-cuenta', label: 'Mi cuenta', icon: '👤' },
        ]
      : [
          { href: '/', label: 'Inicio', icon: '🏠' },
          { href: '/contenido', label: 'Ver Contenido', icon: '👁️' },
          { href: '/checkout?pack=enero-2026', label: 'Comprar Acceso', icon: '💳', highlight: true },
          { href: '/login', label: 'Iniciar Sesión', icon: '👤' },
        ]

  const ctaItem = userHasAccess
    ? { href: '/contenido', label: 'Ir a Descargar', primary: true }
    : isLoggedIn
      ? { href: '/checkout?pack=enero-2026', label: 'Acceso Total $350', primary: true }
      : { href: '/login', label: 'Iniciar Sesión', primary: false }

  return (
    <>
      {/* Botón hamburger – área de toque mínima 44px (accesibilidad) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden relative z-[60] min-w-[44px] min-h-[44px] flex flex-col justify-center items-center gap-1.5 p-3 rounded-xl bg-zinc-900/80 border border-cyan-500/30 hover:bg-zinc-800/90 hover:border-cyan-400/50 transition-colors touch-manipulation"
        aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={isOpen}
      >
        <motion.span
          animate={isOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
          className="w-6 h-0.5 bg-cyan-400 block rounded-full shadow-[0_0_8px_rgba(34,211,238,0.6)]"
        />
        <motion.span
          animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
          className="w-6 h-0.5 bg-cyan-400 block rounded-full shadow-[0_0_8px_rgba(34,211,238,0.6)]"
        />
        <motion.span
          animate={isOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
          className="w-6 h-0.5 bg-cyan-400 block rounded-full shadow-[0_0_8px_rgba(34,211,238,0.6)]"
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay pantalla completa – negro + blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[55] md:hidden"
              aria-hidden="true"
            />

            {/* Side Drawer – glassmorphism */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-zinc-950/95 backdrop-blur-xl border-l border-cyan-500/20 shadow-[-20px_0_60px_rgba(0,0,0,0.5)] z-[58] md:hidden flex flex-col"
            >
              {/* Header con logo */}
              <div className="shrink-0 p-6 pb-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
                      alt="Bear Beat"
                      width={44}
                      height={44}
                      className="w-11 h-11"
                    />
                    <span className="font-bold text-xl text-cyan-400 tracking-tight">BEAR BEAT</span>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
                    aria-label="Cerrar"
                  >
                    <span className="text-2xl">×</span>
                  </button>
                </div>
              </div>

              {/* Links – texto grande, mucho aire */}
              <nav className="flex-1 overflow-y-auto py-6 px-6">
                <ul className="space-y-1">
                  {menuItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`
                          flex items-center gap-4 px-5 py-4 rounded-2xl text-2xl font-medium transition-all
                          ${item.highlight
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                            : currentPath === item.href
                              ? 'bg-white/10 text-cyan-400'
                              : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                          }
                        `}
                      >
                        <span className="text-2xl opacity-90">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* CTA destacado abajo */}
              <div className="shrink-0 p-6 pt-4 border-t border-white/10 space-y-4">
                <Link
                  href={ctaItem.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center justify-center w-full py-4 rounded-2xl text-xl font-bold transition-all
                    ${ctaItem.primary
                      ? 'bg-cyan-500 text-zinc-950 shadow-[0_0_24px_rgba(34,211,238,0.4)] hover:bg-cyan-400 active:scale-[0.98]'
                      : 'bg-white/10 text-cyan-400 border-2 border-cyan-500/50 hover:bg-white/15'
                    }
                  `}
                >
                  {ctaItem.label}
                </Link>
                <p className="text-center text-sm text-zinc-500">¿Necesitas ayuda?</p>
                <div className="flex gap-3">
                  <a
                    href={getMessengerUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-xl bg-blue-600/90 text-white text-center font-semibold text-sm hover:bg-blue-500 transition"
                  >
                    💬 Chat
                  </a>
                  <a
                    href="https://wa.me/5215512345678?text=Hola%2C%20necesito%20ayuda%20con%20Bear%20Beat"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-xl bg-green-600/90 text-white text-center font-semibold text-sm hover:bg-green-500 transition"
                  >
                    📱 WhatsApp
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
