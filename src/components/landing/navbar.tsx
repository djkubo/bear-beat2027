'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

export function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <img 
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png" 
              alt="Bear Beat Logo" 
              className="h-10 w-auto"
            />
            <span className="text-xl font-bold">BEAR BEAT</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#generos" className="text-sm font-medium hover:text-primary transition-colors">
              Géneros
            </Link>
            <Link href="#como-funciona" className="text-sm font-medium hover:text-primary transition-colors">
              Cómo Funciona
            </Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
              Precio
            </Link>
            <Link href="#faq" className="text-sm font-medium hover:text-primary transition-colors">
              FAQ
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/checkout">
              <Button size="sm" className="btn-pulse bg-bear-blue text-bear-black hover:bg-bear-blue/90 font-bold">
                Comprar $350 MXN
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="#generos"
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent"
              onClick={() => setMobileMenuOpen(false)}
            >
              Géneros
            </Link>
            <Link
              href="#como-funciona"
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent"
              onClick={() => setMobileMenuOpen(false)}
            >
              Cómo Funciona
            </Link>
            <Link
              href="#pricing"
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent"
              onClick={() => setMobileMenuOpen(false)}
            >
              Precio
            </Link>
            <Link
              href="#faq"
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent"
              onClick={() => setMobileMenuOpen(false)}
            >
              FAQ
            </Link>
            <div className="pt-4 pb-2 space-y-2">
              <Link href="/login" className="block">
                <Button variant="outline" className="w-full">
                  Iniciar Sesión
                </Button>
              </Link>
              <Link href="/checkout" className="block">
                <Button className="w-full">
                  Comprar $350 MXN
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
