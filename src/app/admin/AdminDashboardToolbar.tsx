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
    <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-4 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          ref={inputRef}
          type="search"
          placeholder="Buscar usuario, email o pedido..."
          className="flex-1 w-full min-w-0 rounded-xl border-2 border-border bg-background px-4 py-3 text-base focus:outline-none focus:border-bear-blue focus:ring-2 focus:ring-bear-blue/20"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
          aria-label="Buscar"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="flex items-center justify-center min-w-[48px] min-h-[48px] rounded-xl border-2 border-bear-blue/30 bg-bear-blue/10 hover:bg-bear-blue/20 text-xl transition-colors"
            title="Refrescar datos"
            aria-label="Refrescar datos"
          >
            🔄
          </button>
        </div>
      </div>
    </div>
  )
}
