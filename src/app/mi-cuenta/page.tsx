'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Lock, Phone, ChevronLeft } from 'lucide-react'

// ==========================================
// MI CUENTA / MI PERFIL – Dark Mode Premium
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
  const [hasPurchases, setHasPurchases] = useState(false)

  // Cambio de contraseña (Opción A: in-page)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

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

      const { data: purchases } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
      setHasPurchases(!!purchases?.length)
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
      toast.error(error.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Contraseña actualizada')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar contraseña')
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    )
  }

  const initials = getInitials(name, email)
  const displayName = name?.trim() || email?.split('@')[0] || 'Usuario'

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header con logo y volver */}
      <header className="py-4 px-4 border-b border-zinc-800/80">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Volver al panel</span>
          </Link>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat"
              width={32}
              height={32}
            />
            <span className="font-bold text-cyan-400">BEAR BEAT</span>
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto py-10 px-4">
        {/* Avatar + Nombre + Badge */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-24 h-24 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-900 border-2 border-cyan-500 flex items-center justify-center text-3xl font-black text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
            aria-hidden
          >
            {initials}
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-4">
            {displayName}
          </h1>
          {hasPurchases && (
            <span className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              Miembro PRO
            </span>
          )}
        </div>

        {/* Tarjeta: Datos del perfil */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950 p-6 md:p-8 mb-6">
          <h2 className="text-lg font-bold text-white mb-6">Datos del perfil</h2>
          <form onSubmit={handleSubmit} className="space-y-5" method="post">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  className="w-full bg-zinc-900/60 border border-zinc-700 rounded-xl px-4 py-3 pr-12 text-zinc-400 cursor-not-allowed"
                  tabIndex={-1}
                  aria-readonly
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden>
                  <Lock className="w-5 h-5" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Teléfono (opcional)</label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Número con lada (ej. 55 1234 5678)"
                  className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl pl-4 pr-12 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                  <Phone className="w-5 h-5" />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-black font-black py-4 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </div>

        {/* Tarjeta: Seguridad */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950 p-6 md:p-8">
          <h2 className="text-lg font-bold text-white mb-4">Seguridad</h2>
          {!showPasswordForm ? (
            <button
              type="button"
              onClick={() => setShowPasswordForm(true)}
              className="w-full py-3 px-4 rounded-xl border border-zinc-700 text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/5 transition-colors font-medium"
            >
              Cambiar contraseña
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4" method="post">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Nueva contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  minLength={6}
                  className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false)
                    setNewPassword('')
                    setConfirmPassword('')
                  }}
                  className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:bg-zinc-800/80 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold disabled:opacity-50 transition-colors"
                >
                  {savingPassword ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
