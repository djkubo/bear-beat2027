'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'

// ==========================================
// MENÚ MÓVIL HAMBURGER
// ==========================================

interface MobileMenuProps {
  currentPath?: string
  userHasAccess?: boolean
  isLoggedIn?: boolean
}

export function MobileMenu({ currentPath = '/', userHasAccess = false, isLoggedIn = false }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Menú diferente según estado del usuario
  const menuItems = userHasAccess 
    ? [
        // USUARIO CON ACCESO PAGADO
        { href: '/dashboard', label: '📊 Mi Panel', icon: '📊', highlight: true },
        { href: '/contenido', label: '⬇️ Descargar Videos', icon: '⬇️' },
        { href: '/', label: '🏠 Inicio', icon: '🏠' },
      ]
    : isLoggedIn 
      ? [
          // USUARIO LOGUEADO SIN COMPRA
          { href: '/', label: 'Inicio', icon: '🏠' },
          { href: '/contenido', label: 'Ver Contenido', icon: '👁️' },
          { href: '/checkout?pack=enero-2026', label: 'Comprar Acceso', icon: '💳', highlight: true },
          { href: '/dashboard', label: 'Mi Panel', icon: '📊' },
        ]
      : [
          // USUARIO NO LOGUEADO
          { href: '/', label: 'Inicio', icon: '🏠' },
          { href: '/contenido', label: 'Ver Contenido', icon: '👁️' },
          { href: '/checkout?pack=enero-2026', label: 'Comprar Acceso', icon: '💳', highlight: true },
          { href: '/login', label: 'Iniciar Sesión', icon: '👤' },
        ]

  return (
    <>
      {/* Botón hamburger - Solo visible en móvil */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden relative z-50 w-10 h-10 flex flex-col justify-center items-center gap-1.5"
        aria-label="Menú"
      >
        <motion.span
          animate={isOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
          className="w-6 h-0.5 bg-bear-blue block"
        />
        <motion.span
          animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
          className="w-6 h-0.5 bg-bear-blue block"
        />
        <motion.span
          animate={isOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
          className="w-6 h-0.5 bg-bear-blue block"
        />
      </button>

      {/* Overlay y menú */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay oscuro */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
            />

            {/* Panel del menú */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-72 bg-bear-black border-l border-bear-blue/20 z-50 md:hidden"
            >
              {/* Header del menú */}
              <div className="p-6 border-b border-bear-blue/20">
                <div className="flex items-center gap-3">
                  <Image
                    src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
                    alt="Bear Beat"
                    width={40}
                    height={40}
                  />
                  <span className="font-bold text-bear-blue text-lg">BEAR BEAT</span>
                </div>
              </div>

              {/* Items del menú */}
              <nav className="p-4">
                <ul className="space-y-2">
                  {menuItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                          ${item.highlight 
                            ? 'bg-bear-blue text-bear-black font-bold' 
                            : currentPath === item.href
                              ? 'bg-bear-blue/20 text-bear-blue'
                              : 'text-gray-300 hover:bg-white/5'
                          }
                        `}
                      >
                        <span className="text-xl">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Footer del menú */}
              <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-bear-blue/20">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-3">¿Necesitas ayuda?</p>
                  <div className="flex gap-2">
                    <a
                      href="https://m.me/104901938679498"
                      target="_blank"
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold"
                    >
                      💬 Chat
                    </a>
                    <a
                      href="https://wa.me/5215512345678?text=Hola%2C%20necesito%20ayuda%20con%20Bear%20Beat"
                      target="_blank"
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-bold"
                    >
                      📱 WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
