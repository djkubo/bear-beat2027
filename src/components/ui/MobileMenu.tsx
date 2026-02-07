'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useFeaturedPack } from '@/lib/hooks/useFeaturedPack'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
// ==========================================
// MENÚ MÓVIL – App Nativa Premium
// Dark (zinc-950), acentos bear-blue (manual de marca), glassmorphism
// ==========================================

interface MobileMenuProps {
  currentPath?: string
  userHasAccess?: boolean
  isLoggedIn?: boolean
}

export function MobileMenu({ currentPath = '/', userHasAccess = false, isLoggedIn = false }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { pack: featuredPack } = useFeaturedPack()
  const packSlug = featuredPack?.slug || 'enero-2026'
  const priceMXN = Number(featuredPack?.price_mxn) || 350

  // Bloquear scroll del body cuando el drawer está abierto; limpiar al cerrar o al desmontar (navegación)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = isOpen ? 'hidden' : prev
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  /* Solo lo que genera dinero: Inicio, Acceso Total, Login. Sin Soporte/Ayuda. */
  const menuItems = userHasAccess
    ? [
        { href: '/', label: 'Inicio', icon: '🏠' },
        { href: '/dashboard', label: 'Mi Panel', icon: '📊', highlight: true },
        { href: '/contenido', label: 'Descargar Videos', icon: '⬇️' },
      ]
    : isLoggedIn
      ? [
          { href: '/', label: 'Inicio', icon: '🏠' },
          { href: `/checkout?pack=${packSlug}`, label: `Acceso Total $${priceMXN}`, icon: '💳', highlight: true },
          { href: '/dashboard', label: 'Mi Panel', icon: '📊' },
        ]
      : [
          { href: '/', label: 'Inicio', icon: '🏠' },
          { href: `/checkout?pack=${packSlug}`, label: `Acceso Total $${priceMXN}`, icon: '💳', highlight: true },
          { href: '/login', label: 'Iniciar Sesión', icon: '👤' },
        ]

  const ctaItem = userHasAccess
    ? { href: '/contenido', label: 'Ir a Descargar', primary: true }
    : isLoggedIn
      ? { href: `/checkout?pack=${packSlug}`, label: `Acceso Total $${priceMXN}`, primary: true }
      : { href: '/login', label: 'Iniciar Sesión', primary: false }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* Botón hamburger – área toque 48px */}
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            'md:hidden relative shrink-0 min-w-[48px] min-h-[48px] flex flex-col justify-center items-center gap-1.5 p-3 rounded-xl border transition-all touch-manipulation select-none',
            isOpen
              ? 'z-[60] bg-zinc-900 border-bear-blue/60'
              : 'z-[60] bg-zinc-900 border-bear-blue/40 hover:bg-zinc-800 hover:border-bear-blue/60 active:scale-95'
          )}
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          <span
            className={cn(
              'w-6 h-0.5 bg-bear-blue block rounded-full transition-all duration-200 origin-center',
              isOpen ? 'rotate-45 translate-y-[7px]' : ''
            )}
          />
          <span
            className={cn(
              'w-6 h-0.5 bg-bear-blue block rounded-full transition-all duration-200',
              isOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
            )}
          />
          <span
            className={cn(
              'w-6 h-0.5 bg-bear-blue block rounded-full transition-all duration-200 origin-center',
              isOpen ? '-rotate-45 -translate-y-[7px]' : ''
            )}
          />
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="md:hidden flex flex-col overflow-x-hidden min-h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        aria-label="Menú de navegación"
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
            <span className="font-bold text-lg text-bear-blue tracking-tight truncate">BEAR BEAT</span>
          </div>
          <SheetClose asChild>
            <button
              type="button"
              className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 active:bg-white/15 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bear-blue/40"
              aria-label="Cerrar menú"
            >
              <span className="text-2xl leading-none">×</span>
            </button>
          </SheetClose>
        </div>

        {/* Navegación – scroll si hay muchos ítems */}
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-4 px-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3.5 rounded-xl text-lg font-medium transition-colors',
                    item.highlight
                      ? `bg-bear-blue/20 text-bear-blue border border-bear-blue/40${!userHasAccess ? ' animate-pulse' : ''}`
                      : currentPath === item.href
                        ? 'bg-white/10 text-bear-blue'
                        : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                  )}
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
            className={cn(
              'flex items-center justify-center w-full py-3.5 rounded-xl text-base font-bold transition-all active:scale-[0.98]',
              ctaItem.primary
                ? 'bg-bear-blue text-bear-black hover:brightness-110 shadow-[0_0_20px_rgba(8,225,247,0.3)]'
                : 'bg-white/10 text-bear-blue border border-bear-blue/50 hover:bg-white/15',
              ctaItem.primary && !userHasAccess ? 'animate-pulse' : ''
            )}
          >
            {ctaItem.label}
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
