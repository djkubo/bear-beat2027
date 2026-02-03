'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'

export function AdminDashboardToolbar() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSearch = () => {
    const value = inputRef.current?.value?.trim()
    if (value) {
      router.push(`/admin/users?search=${encodeURIComponent(value)}`)
    }
  }

  return (
    <div className="sticky top-0 z-10 border-b border-white/5 bg-zinc-950/95 backdrop-blur px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          ref={inputRef}
          type="search"
          placeholder="Buscar usuario, email o pedido..."
          className="flex-1 w-full min-w-0 rounded-xl border border-white/5 bg-zinc-900 px-4 py-3 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:border-bear-blue focus:ring-1 focus:ring-bear-blue/30"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
          aria-label="Buscar"
        />
        <button
          type="button"
          onClick={() => router.refresh()}
          className="flex items-center justify-center min-w-[48px] min-h-[48px] rounded-xl border border-bear-blue/30 bg-bear-blue/10 hover:bg-bear-blue/20 text-xl transition-colors"
          title="Refrescar datos"
          aria-label="Refrescar datos"
        >
          🔄
        </button>
      </div>
    </div>
  )
}
