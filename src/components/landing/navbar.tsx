'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

// ==========================================
// NAVBAR – Sticky, glassmorphism, drawer móvil premium
// ==========================================

export function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setIsLoggedIn(!!user))
  }, [])

  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  const navLinks = [
    { href: '#generos', label: 'Géneros' },
    { href: '#como-funciona', label: 'Cómo Funciona' },
    { href: '#pricing', label: 'Precio' },
    { href: '#faq', label: 'FAQ' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 md:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat Logo"
              className="h-9 w-auto md:h-10"
            />
            <span className="text-lg md:text-xl font-bold text-cyan-400 tracking-tight">BEAR BEAT</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-zinc-300 hover:text-cyan-400 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-cyan-400">Mi Panel</Button>
                </Link>
                <Link href="/mi-cuenta">
                  <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-cyan-400">Mi cuenta</Button>
                </Link>
              </>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-cyan-400">Iniciar Sesión</Button>
              </Link>
            )}
            <Link href="/checkout">
              <Button size="sm" className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400 font-bold shadow-[0_0_16px_rgba(34,211,238,0.3)]">
                Comprar $350 MXN
              </Button>
            </Link>
          </div>

          {/* Botón hamburger – min 44px touch */}
          <button
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-zinc-900/80 border border-cyan-500/30 hover:bg-zinc-800/90 hover:border-cyan-400/50 transition-colors touch-manipulation"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-6 w-6 text-cyan-400" /> : <Menu className="h-6 w-6 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer – overlay + panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[55] md:hidden"
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-zinc-950/95 backdrop-blur-xl border-l border-cyan-500/20 shadow-[-20px_0_60px_rgba(0,0,0,0.5)] z-[58] md:hidden flex flex-col"
            >
              <div className="shrink-0 p-6 pb-4 border-b border-white/10 flex items-center justify-between">
                <span className="font-bold text-xl text-cyan-400">Menú</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/10"
                  aria-label="Cerrar"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-6 px-6">
                <ul className="space-y-1">
                  {navLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-4 px-5 py-4 rounded-2xl text-2xl font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-all"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
                  {isLoggedIn ? (
                    <>
                      <Link href="/dashboard" className="block" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full py-4 text-lg rounded-2xl border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10">
                          Mi Panel
                        </Button>
                      </Link>
                      <Link href="/mi-cuenta" className="block" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full py-4 text-lg rounded-2xl border-white/20 text-zinc-300 hover:bg-white/5">
                          Mi cuenta
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <Link href="/login" className="block" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full py-4 text-lg rounded-2xl border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10">
                        Iniciar Sesión
                      </Button>
                    </Link>
                  )}
                  <Link href="/checkout" className="block" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full py-4 text-xl font-bold rounded-2xl bg-cyan-500 text-zinc-950 hover:bg-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.4)]">
                      Comprar $350 MXN
                    </Button>
                  </Link>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  )
}
