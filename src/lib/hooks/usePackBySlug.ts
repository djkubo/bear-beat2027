'use client'

import { useEffect, useState } from 'react'
import type { FeaturedPack } from '@/lib/hooks/useFeaturedPack'

/**
 * Carga un pack por slug desde la API pública.
 * Si no existe, devuelve null (para que el caller haga fallback).
 */
export function usePackBySlug(slug: string | null | undefined) {
  const [pack, setPack] = useState<FeaturedPack | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const s = (slug || '').trim()
    if (!s) {
      setPack(null)
      return
    }
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const res = await fetch(`/api/packs?slug=${encodeURIComponent(s)}`, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        const next = data?.pack
        if (!cancelled && next?.slug) {
          setPack({
            ...next,
            slug: String(next.slug),
            name: String(next.name || next.slug),
            price_mxn: Number(next.price_mxn) || 0,
            price_usd: next.price_usd != null ? Number(next.price_usd) || null : null,
          })
        } else if (!cancelled) {
          setPack(null)
        }
      } catch {
        if (!cancelled) setPack(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  return { pack, loading }
}

