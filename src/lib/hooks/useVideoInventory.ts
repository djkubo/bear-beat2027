'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const PACK_SLUG = 'enero-2026'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export interface VideoInventory {
  count: number
  totalSizeFormatted: string
  genreCount: number
  loading: boolean
  error: string | null
}

/**
 * Inventario en tiempo real desde la tabla `videos` de Supabase.
 * Si agregas o borras filas, el número cambia al recargar.
 */
export function useVideoInventory(): VideoInventory {
  const [count, setCount] = useState(0)
  const [totalSizeFormatted, setTotalSizeFormatted] = useState('0 B')
  const [genreCount, setGenreCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const { data: pack, error: packErr } = await supabase
          .from('packs')
          .select('id')
          .eq('slug', PACK_SLUG)
          .single()

        if (packErr || !pack) {
          setCount(0)
          setTotalSizeFormatted('0 B')
          setGenreCount(0)
          return
        }

        const packId = pack.id

        const { count: videoCount, error: countErr } = await supabase
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .eq('pack_id', packId)

        if (countErr) {
          setError(countErr.message)
          setCount(0)
          return
        }

        setCount(videoCount ?? 0)

        const { data: rows, error: sizeErr } = await supabase
          .from('videos')
          .select('file_size, genre_id')
          .eq('pack_id', packId)

        if (!sizeErr && rows?.length) {
          const totalBytes = rows.reduce((sum, r) => sum + (Number(r.file_size) || 0), 0)
          setTotalSizeFormatted(formatBytes(totalBytes))
          const uniqueGenres = new Set(rows.map((r) => r.genre_id).filter(Boolean))
          setGenreCount(uniqueGenres.size)
        } else {
          setTotalSizeFormatted('0 B')
          setGenreCount(0)
        }
      } catch (e: any) {
        setError(e?.message || 'Error cargando inventario')
        setCount(0)
        setTotalSizeFormatted('0 B')
        setGenreCount(0)
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
    loading,
    error,
  }
}
