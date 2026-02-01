'use client'

import { useState, useEffect } from 'react'

export interface VideoInventory {
  count: number
  totalSizeFormatted: string
  genreCount: number
  totalPurchases: number
  loading: boolean
  error: string | null
}

/**
 * Inventario en tiempo real desde /api/videos (misma fuente que el listado).
 * Así totalVideos y genreCount coinciden con lo que se muestra (géneros por carpeta/file_path).
 */
export function useVideoInventory(): VideoInventory {
  const [count, setCount] = useState(0)
  const [totalSizeFormatted, setTotalSizeFormatted] = useState('0 B')
  const [genreCount, setGenreCount] = useState(0)
  const [totalPurchases, setTotalPurchases] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`/api/videos?pack=enero-2026&_=${Date.now()}`, { cache: 'no-store', headers: { Pragma: 'no-cache' } })
        const data = await res.json()

        if (!data.success || !data.pack) {
          setCount(0)
          setTotalSizeFormatted('0 B')
          setGenreCount(0)
          setTotalPurchases(0)
          if (data.error) setError(data.error)
          return
        }

        setCount(data.pack.totalVideos ?? 0)
        setTotalSizeFormatted(data.pack.totalSizeFormatted ?? '0 B')
        setGenreCount(data.pack.genreCount ?? 0)
        setTotalPurchases(data.pack.totalPurchases ?? 0)
      } catch (e: any) {
        setError(e?.message || 'Error cargando inventario')
        setCount(0)
        setTotalSizeFormatted('0 B')
        setGenreCount(0)
        setTotalPurchases(0)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return {
    count,
    totalSizeFormatted,
    genreCount,
    totalPurchases,
    loading,
    error,
  }
}
