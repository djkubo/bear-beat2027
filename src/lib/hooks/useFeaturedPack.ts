'use client'

import { useEffect, useMemo, useState } from 'react'

export type FeaturedPack = {
  id?: string
  slug: string
  name: string
  description?: string | null
  price_mxn: number
  price_usd?: number | null
}

const FALLBACK_PACK: FeaturedPack = {
  slug: 'enero-2026',
  name: 'Pack Enero 2026',
  price_mxn: 350,
  price_usd: 19,
}

const CACHE_TTL_MS = 5 * 60 * 1000

function getCache() {
  const g = globalThis as unknown as {
    __bb_featured_pack_cache?: { value: FeaturedPack; expiresAt: number }
    __bb_featured_pack_promise?: Promise<FeaturedPack | null>
  }
  return g
}

function readCachedPack(): FeaturedPack | null {
  const g = getCache()
  const cached = g.__bb_featured_pack_cache
  if (!cached) return null
  if (Date.now() > cached.expiresAt) return null
  return cached.value
}

function writeCachedPack(value: FeaturedPack) {
  const g = getCache()
  g.__bb_featured_pack_cache = { value, expiresAt: Date.now() + CACHE_TTL_MS }
}

async function fetchFeaturedPack(): Promise<FeaturedPack | null> {
  const res = await fetch('/api/packs?featured=true', { cache: 'no-store' })
  const data = await res.json().catch(() => ({}))
  const next = data?.pack
  if (!next?.slug) return null
  const normalized: FeaturedPack = {
    ...FALLBACK_PACK,
    ...next,
    slug: String(next.slug),
    name: String(next.name || FALLBACK_PACK.name),
    price_mxn: Number(next.price_mxn) || FALLBACK_PACK.price_mxn,
    price_usd: next.price_usd != null ? Number(next.price_usd) || FALLBACK_PACK.price_usd : FALLBACK_PACK.price_usd,
  }
  writeCachedPack(normalized)
  return normalized
}

/**
 * Obtiene el pack destacado desde la API pública.
 * Importante: siempre devuelve un pack (fallback) para evitar UI rota.
 */
export function useFeaturedPack() {
  const cached = readCachedPack()
  const [pack, setPack] = useState<FeaturedPack>(cached || FALLBACK_PACK)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const fromCache = readCachedPack()
        if (fromCache) {
          if (!cancelled) setPack(fromCache)
          return
        }

        setLoading(true)
        const g = getCache()
        if (!g.__bb_featured_pack_promise) {
          g.__bb_featured_pack_promise = fetchFeaturedPack().finally(() => {
            // limpiar para permitir refresh tras TTL en futuras montadas
            g.__bb_featured_pack_promise = undefined
          })
        }
        const next = await g.__bb_featured_pack_promise
        if (!cancelled && next) setPack(next)
      } catch {
        // ignore: keep fallback
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const normalized = useMemo(() => {
    const mxn = Number(pack.price_mxn) || FALLBACK_PACK.price_mxn
    const usd = pack.price_usd != null ? Number(pack.price_usd) || FALLBACK_PACK.price_usd : FALLBACK_PACK.price_usd
    return { ...pack, price_mxn: mxn, price_usd: usd }
  }, [pack])

  return { pack: normalized, loading }
}
