'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type NavItem = {
  href: string
  label: string
  emoji: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Panel', emoji: '🏠' },
  { href: '/admin/users', label: 'Usuarios', emoji: '👥' },
  { href: '/admin/purchases', label: 'Compras', emoji: '💳' },
  { href: '/admin/packs', label: 'Packs', emoji: '📦' },
  { href: '/admin/pending', label: 'Pendientes', emoji: '⏳' },
  { href: '/admin/tracking', label: 'Tracking', emoji: '📊' },
  { href: '/admin/attribution', label: 'Atribución', emoji: '🎯' },
  { href: '/admin/mensajes', label: 'Mensajes', emoji: '✉️' },
  { href: '/admin/brevo-emails', label: 'Brevo', emoji: '📧' },
  { href: '/admin/sms-whatsapp', label: 'SMS/WA', emoji: '📱' },
  { href: '/admin/push', label: 'Push', emoji: '🔔' },
  { href: '/admin/manychat', label: 'ManyChat', emoji: '🤖' },
  { href: '/admin/chatbot', label: 'Chatbot', emoji: '💬' },
  { href: '/admin/rescue', label: 'Rescate', emoji: '🚑' },
  { href: '/admin/settings', label: 'Config', emoji: '⚙️' },
] as const

function isActivePath(pathname: string, href: string): boolean {
  if (!pathname) return false
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(href + '/')
}

/** Navegación persistente del panel admin (sticky debajo del header). */
export function AdminNav() {
  const pathname = usePathname() || '/admin'
  const router = useRouter()
  const [q, setQ] = useState('')

  const items = useMemo(
    () =>
      NAV_ITEMS.map((it) => ({
        ...it,
        active: isActivePath(pathname, it.href),
      })),
    [pathname]
  )

  const goSearch = () => {
    const v = q.trim()
    if (!v) return
    router.push(`/admin/users?search=${encodeURIComponent(v)}`)
  }

  return (
    <nav
      aria-label="Admin"
      className={cn(
        'sticky top-14 md:top-16 z-40',
        'border-b border-white/5 bg-zinc-950/90 backdrop-blur-md'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 overflow-x-auto">
              {items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    'shrink-0 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bear-blue/40',
                    it.active
                      ? 'border-bear-blue/30 bg-bear-blue/10 text-bear-blue'
                      : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white'
                  )}
                  aria-current={it.active ? 'page' : undefined}
                >
                  <span aria-hidden="true">{it.emoji}</span>
                  <span>{it.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <div className="relative w-[320px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    goSearch()
                  }
                }}
                placeholder="Buscar usuario, email o ID..."
                aria-label="Buscar en usuarios"
                className="h-11 pl-9 pr-3 bg-black border-zinc-800"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Refrescar datos"
              title="Refrescar datos"
              onClick={() => router.refresh()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
