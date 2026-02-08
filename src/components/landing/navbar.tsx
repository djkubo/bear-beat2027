'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MobileMenu } from '@/components/ui/MobileMenu'
import { useFeaturedPack } from '@/lib/hooks/useFeaturedPack'
import Image from 'next/image'

export function NavBar() {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userHasAccess, setUserHasAccess] = useState(false)
  const supabase = createClient()
  const { pack: featuredPack } = useFeaturedPack()
  const packSlug = featuredPack?.slug || 'enero-2026'
  const priceMXN = Number(featuredPack?.price_mxn) || 350

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
      if (!user) {
        setUserHasAccess(false)
        return
      }
      supabase.from('purchases').select('id').eq('user_id', user.id).limit(1).maybeSingle().then(({ data }) => {
        setUserHasAccess(!!data)
      })
    })
  }, [])

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
            <Image
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat Logo"
              width={40}
              height={40}
              priority
              className="h-9 w-auto md:h-10"
            />
            <span className="text-lg md:text-xl font-bold text-bear-blue tracking-tight">BEAR BEAT</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-zinc-300 hover:text-bear-blue transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Button asChild variant="ghost" size="sm" className="text-zinc-300 hover:text-bear-blue">
                  <Link href="/dashboard">Mi Panel</Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="text-zinc-300 hover:text-bear-blue">
                  <Link href="/mi-cuenta">Mi cuenta</Link>
                </Button>
              </>
            ) : (
              <Button asChild variant="ghost" size="sm" className="text-zinc-300 hover:text-bear-blue">
                <Link href="/login">Iniciar Sesión</Link>
              </Button>
            )}
            <Button
              asChild
              size="sm"
              className={`bg-bear-blue text-zinc-950 hover:brightness-110 font-bold shadow-[0_0_16px_rgba(8,225,247,0.3)] ${!userHasAccess ? 'animate-pulse' : ''}`}
            >
              <Link href={`/checkout?pack=${packSlug}`}>Acceso Total ${priceMXN}</Link>
            </Button>
          </div>

          {/* Menú móvil – componente único, botón alineado a la derecha, z-index coherente */}
          <div className="md:hidden flex items-center justify-end shrink-0" style={{ zIndex: 60 }}>
            <MobileMenu
              currentPath={pathname ?? '/'}
              userHasAccess={userHasAccess}
              isLoggedIn={isLoggedIn}
            />
          </div>
        </div>
      </div>
    </nav>
  )
}
