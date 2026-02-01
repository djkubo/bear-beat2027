'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getMessengerUrl, getWhatsAppUrl } from '@/config/contact'

// ==========================================
// PORTAL DE CLIENTE - Accesos rápidos y guía
// Bienvenida personalizada, 4 accesos, soporte
// ==========================================

interface UserProfile {
  id: string
  email: string
  name: string
  phone?: string
}

export default function PortalPage() {
  const supabase = createClient()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        window.location.href = '/login?redirect=/portal'
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('id, email, name, phone')
        .eq('id', authUser.id)
        .single()

      if (profile) {
        setUser(profile)
      } else {
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuario',
        })
      }
    } catch (error) {
      console.error('Error cargando usuario:', error)
      window.location.href = '/login?redirect=/portal'
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bear-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-bear-blue/30 border-t-bear-blue rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const quickLinks = [
    { href: '/contenido', icon: '⬇️', label: 'Descargar Videos', desc: 'Explorador web de videos' },
    { href: '/dashboard', icon: '📁', label: 'Descarga FTP', desc: 'Tus claves y FileZilla' },
    { href: '/comunidad', icon: '💬', label: 'Comunidad VIP', desc: 'Grupo WhatsApp y bonos' },
    { href: '/mi-cuenta', icon: '👤', label: 'Mi Cuenta', desc: 'Perfil y datos' },
  ]

  return (
    <div className="min-h-screen bg-bear-black text-white">
      <header className="py-4 px-4 border-b border-bear-blue/20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat"
              width={40}
              height={40}
            />
            <span className="font-bold text-bear-blue">BEAR BEAT</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-bear-blue hover:underline">
              Mi Panel
            </Link>
            <Link href="/mi-cuenta" className="text-sm text-gray-400 hover:text-white">
              Mi cuenta
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-3xl md:text-4xl font-black mb-2">
          Hola, {user.name?.split(' ')[0] || 'DJ'}
        </h1>
        <p className="text-gray-400 mb-10">
          Tu portal de acceso. Elige dónde quieres ir.
        </p>

        {/* 4 accesos rápidos */}
        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white/5 border-2 border-bear-blue/30 rounded-2xl p-6 flex items-center gap-4 hover:bg-bear-blue/10 hover:border-bear-blue transition-all"
            >
              <span className="text-4xl">{link.icon}</span>
              <div>
                <p className="font-bold text-lg">{link.label}</p>
                <p className="text-sm text-gray-500">{link.desc}</p>
              </div>
              <span className="ml-auto text-bear-blue">→</span>
            </Link>
          ))}
        </div>

        {/* Guía paso a paso breve */}
        <section className="bg-white/5 border border-bear-blue/20 rounded-2xl p-6 mb-10">
          <h2 className="text-xl font-bold text-bear-blue mb-4">📖 Guía rápida</h2>
          <ol className="space-y-3 text-gray-300">
            <li><strong>1.</strong> Descarga por navegador: ve a <Link href="/contenido" className="text-bear-blue hover:underline">Contenido</Link> y descarga los videos que necesites.</li>
            <li><strong>2.</strong> Descarga por FTP: en tu <Link href="/dashboard" className="text-bear-blue hover:underline">Panel</Link> tienes usuario y contraseña para FileZilla.</li>
            <li><strong>3.</strong> Comunidad: entra al grupo VIP y descarga bonos en <Link href="/comunidad" className="text-bear-blue hover:underline">Comunidad</Link>.</li>
          </ol>
        </section>

        {/* Soporte directo */}
        <section className="bg-gradient-to-r from-bear-blue/10 to-cyan-500/10 border border-bear-blue/20 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">¿Necesitas ayuda?</h2>
          <p className="text-gray-400 mb-4">Te respondemos en menos de 5 minutos.</p>
          <div className="flex flex-wrap gap-3">
            <a href={getMessengerUrl()} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700">
              💬 Messenger
            </a>
            <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700">
              📱 WhatsApp
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}
