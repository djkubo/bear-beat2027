'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getWhatsAppUrl } from '@/config/contact'

// ==========================================
// COMUNIDAD VIP - Grupo WhatsApp + Bonos
// ==========================================

interface Bono {
  title: string
  size: string
  status: 'available' | 'coming'
  description?: string
}

const BONOS: Bono[] = [
  { title: 'Pack Transiciones', size: '250 MB', status: 'available', description: 'Transiciones profesionales para tus mixes' },
  { title: 'Sound Effects', size: '180 MB', status: 'available', description: 'Efectos de sonido para DJ' },
  { title: 'VJ Loops', size: '1.2 GB', status: 'available', description: 'Loops visuales para VJ' },
  { title: 'Guía Mixing', size: '15 MB', status: 'available', description: 'PDF y recursos de mezcla' },
  { title: 'Acapellas', size: '—', status: 'coming', description: 'Próximamente' },
  { title: 'Pack Febrero', size: '—', status: 'coming', description: 'Próximamente' },
]

export default function ComunidadPage() {
  const supabase = createClient()
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login?redirect=/comunidad'
        return
      }

      const { data: purchases } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      setHasAccess(!!purchases?.length)
    } catch (error) {
      console.error('Error verificando acceso:', error)
      setHasAccess(false)
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

  const whatsappGroupUrl = getWhatsAppUrl('Hola, quiero unirme al grupo VIP de Bear Beat')

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
          <Link href="/dashboard" className="text-sm text-bear-blue hover:underline">
            ← Mi Panel
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-3xl md:text-4xl font-black mb-2">Comunidad VIP</h1>
        <p className="text-gray-400 mb-10">
          Grupo exclusivo y bonos extra para clientes con acceso.
        </p>

        {/* Botón grupo VIP WhatsApp */}
        <section className="mb-12">
          <div className="bg-green-500/10 border-2 border-green-500/40 rounded-2xl p-8 text-center">
            <span className="text-5xl block mb-4">💬</span>
            <h2 className="text-xl font-bold text-green-400 mb-2">Grupo VIP en WhatsApp</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Únete al grupo de DJs con acceso. Comparte dudas, tips y contenido exclusivo.
            </p>
            <a
              href={whatsappGroupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-green-700 transition-colors"
            >
              📱 Unirme al grupo VIP
            </a>
          </div>
        </section>

        {/* 6 bonos */}
        <section>
          <h2 className="text-xl font-bold text-bear-blue mb-4">🎁 Bonos incluidos</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BONOS.map((bono) => (
              <div
                key={bono.title}
                className={`rounded-2xl p-5 border-2 ${
                  bono.status === 'available'
                    ? 'bg-white/5 border-bear-blue/30'
                    : 'bg-white/5 border-gray-700 opacity-75'
                }`}
              >
                <p className="font-bold">{bono.title}</p>
                <p className="text-sm text-gray-500">{bono.size}</p>
                {bono.description && (
                  <p className="text-sm text-gray-400 mt-1">{bono.description}</p>
                )}
                {bono.status === 'coming' && (
                  <span className="inline-block mt-2 text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">
                    Próximamente
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <p className="text-sm text-gray-500 mt-8">
          Los bonos disponibles se comparten por el grupo VIP o por correo. Si no ves un enlace aún, escríbenos por WhatsApp.
        </p>
      </main>
    </div>
  )
}
