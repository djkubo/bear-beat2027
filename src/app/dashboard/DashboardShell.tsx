'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Home,
  FolderOpen,
  Radio,
  User,
  LogOut,
  Menu,
  X,
  Lock,
} from 'lucide-react'

const DASHBOARD_BG = '#0a0a0a'
const CARD_BG = '#121212'
const BORDER = '#27272a'

interface UserProfile {
  id: string
  email: string
  name: string
}

interface Purchase {
  id: number
  pack_id: number
  pack?: { name: string; slug: string } | null
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [packName, setPackName] = useState<string>('Pack Enero 2026')
  const [hasPurchase, setHasPurchase] = useState(false)
  const [loading, setLoading] = useState(true)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        window.location.href = '/login?redirect=/dashboard'
        return
      }
      const { data: profile } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('id', authUser.id)
        .single()
      if (profile) {
        setUser({ id: profile.id, email: profile.email ?? '', name: profile.name ?? authUser.email?.split('@')[0] ?? 'Usuario' })
      } else {
        setUser({
          id: authUser.id,
          email: authUser.email ?? '',
          name: authUser.user_metadata?.name ?? authUser.email?.split('@')[0] ?? 'Usuario',
        })
      }
      const { data: purchases } = await supabase
        .from('purchases')
        .select('*, pack:packs(name, slug)')
        .eq('user_id', authUser.id)
        .order('purchased_at', { ascending: false })
        .limit(1)
      const list = (purchases as Purchase[] | null) ?? []
      setHasPurchase(list.length > 0)
      const first = list[0]
      if (first?.pack?.name) setPackName(first.pack.name)
      setLoading(false)
    }
    load()
  }, [supabase])

  const tabFtp = searchParams.get('tab') === 'ftp'
  const nav = [
    { href: '/dashboard', icon: Home, label: 'Inicio', locked: false },
    { href: '/contenido', icon: FolderOpen, label: 'Biblioteca Web', locked: !hasPurchase },
    { href: '/dashboard?tab=ftp', icon: Radio, label: 'Conexión FTP', locked: !hasPurchase },
    { href: '/mi-cuenta', icon: User, label: 'Mi Cuenta', locked: false },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: DASHBOARD_BG }}>
        <div className="w-10 h-10 border-2 border-[#08E1F7]/30 border-t-[#08E1F7] rounded-full animate-spin" />
      </div>
    )
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <div className="min-h-screen flex" style={{ background: DASHBOARD_BG }}>
      {/* Sidebar - desktop */}
      <aside
        className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-60 md:border-r z-30"
        style={{ background: CARD_BG, borderColor: BORDER }}
      >
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat"
              width={36}
              height={36}
            />
            <span className="font-bold text-[#08E1F7]">BEAR BEAT</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard' && !tabFtp
                : item.href === '/dashboard?tab=ftp'
                  ? pathname === '/dashboard' && tabFtp
                  : pathname.startsWith(item.href.split('?')[0])
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#08E1F7]/10 text-[#08E1F7]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
                {item.locked && <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500/80" />}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: BORDER }}>
          <button
            onClick={() => supabase.auth.signOut().then(() => (window.location.href = '/'))}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-60 z-50 md:hidden transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: CARD_BG, borderRight: `1px solid ${BORDER}` }}
      >
        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: BORDER }}>
          <Link href="/" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
            <Image
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat"
              width={32}
              height={32}
            />
            <span className="font-bold text-[#08E1F7] text-sm">BEAR BEAT</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="p-2 text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5"
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
                {item.locked && <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500/80" />}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t absolute bottom-0 left-0 right-0" style={{ borderColor: BORDER }}>
          <button
            onClick={() => supabase.auth.signOut().then(() => (window.location.href = '/'))}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col md:pl-60 min-h-screen">
        {/* Header */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between gap-4 px-4 py-3 border-b"
          style={{ background: CARD_BG, borderColor: BORDER }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav className="text-sm text-gray-400 truncate">
              <Link href="/dashboard" className="hover:text-white">
                Inicio
              </Link>
              <span className="mx-2">/</span>
              <span className="text-white truncate">{packName}</span>
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {hasPurchase ? (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Acceso Activo
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-600/30 text-zinc-400 border border-amber-500/40">
                Cuenta Gratuita
              </span>
            )}
            <div className="relative">
              <button
                onClick={() => setAvatarOpen(!avatarOpen)}
                className="flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold text-white border-2 shrink-0"
                style={{ background: '#08E1F7', borderColor: 'rgba(8,225,247,0.5)' }}
                aria-expanded={avatarOpen}
                aria-haspopup="true"
              >
                {initials}
              </button>
              {avatarOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setAvatarOpen(false)}
                    aria-hidden
                  />
                  <div
                    className="absolute right-0 mt-2 w-48 py-1 rounded-lg shadow-xl z-20"
                    style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
                  >
                    <Link
                      href="/mi-cuenta"
                      onClick={() => setAvatarOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5"
                    >
                      Mi cuenta
                    </Link>
                    <button
                      onClick={() => {
                        setAvatarOpen(false)
                        supabase.auth.signOut().then(() => (window.location.href = '/'))
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>

        {/* Bottom nav - mobile only */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around py-2 px-2 border-t z-30"
          style={{ background: CARD_BG, borderColor: BORDER }}
        >
          <Link
            href="/dashboard"
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
              pathname === '/dashboard' && !tabFtp ? 'text-[#08E1F7]' : 'text-gray-500'
            }`}
          >
            <Home className="h-5 w-5" />
            Inicio
          </Link>
          <Link
            href="/contenido"
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
              pathname.startsWith('/contenido') ? 'text-[#08E1F7]' : 'text-gray-500'
            }`}
          >
            <FolderOpen className="h-5 w-5" />
            Biblioteca
          </Link>
          <Link
            href="/dashboard?tab=ftp"
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
              pathname === '/dashboard' && tabFtp ? 'text-[#08E1F7]' : 'text-gray-500'
            }`}
          >
            <Radio className="h-5 w-5" />
            FTP
          </Link>
          <Link
            href="/mi-cuenta"
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
              pathname.startsWith('/mi-cuenta') ? 'text-[#08E1F7]' : 'text-gray-500'
            }`}
          >
            <User className="h-5 w-5" />
            Cuenta
          </Link>
        </nav>

        {/* Spacer for bottom nav on mobile */}
        <div className="h-16 md:hidden" aria-hidden />
      </div>
    </div>
  )
}
