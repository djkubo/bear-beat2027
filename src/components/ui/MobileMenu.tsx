'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
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

  // Bloquear scroll del body cuando el drawer está abierto; limpiar al cerrar o al desmontar (navegación)
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

  // Limpieza garantizada al desmontar (p. ej. cambio de ruta) para evitar body con overflow hidden
  useEffect(() => {
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Cerrar con tecla Escape
  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      window.addEventListener('keydown', onEscape)
      return () => window.removeEventListener('keydown', onEscape)
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
      {/* Botón hamburger – área toque 48px, z alto para quedar sobre overlay */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`md:hidden relative shrink-0 min-w-[48px] min-h-[48px] flex flex-col justify-center items-center gap-1.5 p-3 rounded-xl border transition-all touch-manipulation select-none ${isOpen ? 'z-[110] bg-zinc-900 border-cyan-400/60' : 'z-[60] bg-zinc-900 border-cyan-500/40 hover:bg-zinc-800 hover:border-cyan-400/60 active:scale-95'}`}
        aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={isOpen}
        aria-controls="mobile-drawer"
      >
        <span
          className={`w-6 h-0.5 bg-cyan-400 block rounded-full transition-all duration-200 origin-center ${isOpen ? 'rotate-45 translate-y-[7px]' : ''}`}
        />
        <span
          className={`w-6 h-0.5 bg-cyan-400 block rounded-full transition-all duration-200 ${isOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'}`}
        />
        <span
          className={`w-6 h-0.5 bg-cyan-400 block rounded-full transition-all duration-200 origin-center ${isOpen ? '-rotate-45 -translate-y-[7px]' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay – cubre toda la ventana, tap para cerrar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 min-h-[100dvh] bg-black/85 backdrop-blur-md z-[100] md:hidden"
              aria-hidden="true"
            />

            {/* Drawer – pantalla completa en móvil, safe-area, scroll interno */}
            <motion.div
              id="mobile-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Menú de navegación"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 260 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-[320px] min-h-[100dvh] bg-zinc-950 border-l border-white/10 shadow-[-8px_0_32px_rgba(0,0,0,0.6)] z-[105] md:hidden flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            >
              {/* Header: logo + cerrar */}
              <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-4 border-b border-white/10">
                <div className="flex items-center gap-3 min-w-0">
                  <Image
                    src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
                    alt="Bear Beat"
                    width={40}
                    height={40}
                    className="w-10 h-10 shrink-0"
                  />
                  <span className="font-bold text-lg text-cyan-400 tracking-tight truncate">BEAR BEAT</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 active:bg-white/15 transition"
                  aria-label="Cerrar menú"
                >
                  <span className="text-2xl leading-none">×</span>
                </button>
              </div>

              {/* Navegación – scroll si hay muchos ítems */}
              <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-4 px-4">
                <ul className="space-y-1">
                  {menuItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`
                          flex items-center gap-4 px-4 py-3.5 rounded-xl text-lg font-medium transition-colors
                          ${item.highlight
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                            : currentPath === item.href
                              ? 'bg-white/10 text-cyan-400'
                              : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                          }
                        `}
                      >
                        <span className="text-xl shrink-0 opacity-90">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* CTA – solo navegación y conversión */}
              <div className="shrink-0 p-4 pt-4 border-t border-white/10">
                <Link
                  href={ctaItem.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center justify-center w-full py-3.5 rounded-xl text-base font-bold transition-all active:scale-[0.98]
                    ${ctaItem.primary
                      ? 'bg-cyan-500 text-zinc-950 hover:bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]'
                      : 'bg-white/10 text-cyan-400 border border-cyan-500/50 hover:bg-white/15'
                    }
                  `}
                >
                  {ctaItem.label}
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
