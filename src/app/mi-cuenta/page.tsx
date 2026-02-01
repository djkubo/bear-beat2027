'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ==========================================
// MI CUENTA / MI PERFIL - Ver y editar perfil completo
// Nombre, Email (solo lectura), Teléfono, Avatar (iniciales)
// ==========================================

function getInitials(name: string, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  if (email?.trim()) return email.slice(0, 2).toUpperCase()
  return 'DJ'
}

export default function MiCuentaPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login?redirect=/mi-cuenta'
        return
      }
      setUserId(user.id)
      setEmail(user.email || '')

      const { data: profile } = await supabase
        .from('users')
        .select('name, phone')
        .eq('id', user.id)
        .single()

      if (profile) {
        setName(profile.name || '')
        setPhone(profile.phone || '')
      } else {
        setName(user.user_metadata?.name || user.email?.split('@')[0] || '')
      }
    } catch (error) {
      console.error('Error cargando perfil:', error)
      toast.error('Error al cargar el perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: name.trim() || null,
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error
      toast.success('Perfil actualizado')
    } catch (error: any) {
      console.error('Error actualizando:', error)
      toast.error(error.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bear-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-bear-blue/30 border-t-bear-blue rounded-full animate-spin" />
      </div>
    )
  }

  const initials = getInitials(name, email)

  return (
    <div className="min-h-screen bg-bear-black text-white">
      <header className="py-4 px-4 border-b border-bear-blue/20">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat"
              width={40}
              height={40}
            />
            <span className="font-bold text-bear-blue">BEAR BEAT</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-bear-blue">
            ← Volver al panel
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-12 px-4">
        <h1 className="text-2xl md:text-3xl font-black mb-2">Mi perfil</h1>
        <p className="text-gray-400 mb-8">
          Revisa y edita tu información. Los datos se obtienen de tu cuenta en Supabase (conexión real).
        </p>

        {/* Avatar / Iniciales */}
        <div className="flex items-center gap-6 mb-10">
          <div
            className="w-24 h-24 rounded-full bg-bear-blue/30 border-2 border-bear-blue flex items-center justify-center text-3xl font-black text-bear-blue"
            aria-hidden
          >
            {initials}
          </div>
          <div>
            <p className="text-sm text-gray-500">Foto de perfil</p>
            <p className="text-xs text-gray-600">
              Por ahora se muestran tus iniciales. Subida de avatar en una próxima actualización.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Nombre completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full bg-white/5 border-2 border-bear-blue/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-bear-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full bg-white/5 border-2 border-gray-700 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed"
              tabIndex={-1}
              aria-readonly
            />
            <p className="text-xs text-gray-500 mt-1">Solo lectura. El email no se puede cambiar aquí.</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Teléfono / WhatsApp</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 55 1234 5678"
              className="w-full bg-white/5 border-2 border-bear-blue/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-bear-blue"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-bear-blue text-bear-black font-black py-4 rounded-xl hover:bg-bear-blue/90 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-6">
          Para cambiar tu contraseña, cierra sesión y en la pantalla de login usa &quot;Olvidé mi contraseña&quot;.
        </p>
      </main>
    </div>
  )
}
