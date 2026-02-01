'use client'

import { useVideoInventory } from '@/lib/hooks/useVideoInventory'

export interface VideoCounterProps {
  /** Mostrar solo el número (para Hero tipo "Descarga X Video Remixes") */
  countOnly?: boolean
  /** Formato: "X videos" / "X Video Remixes" / "X GB" */
  variant?: 'videos' | 'remixes' | 'gb' | 'full'
  /** Mientras carga */
  fallback?: React.ReactNode
  className?: string
}

/**
 * Muestra el inventario en tiempo real desde Supabase (tabla videos).
 * Si agregas o borras filas, el número cambia al recargar.
 */
export function VideoCounter({
  countOnly = false,
  variant = 'remixes',
  fallback = '...',
  className = '',
}: VideoCounterProps) {
  const { count, totalSizeFormatted, genreCount, loading } = useVideoInventory()

  if (loading && fallback !== null) {
    return <span className={className}>{fallback}</span>
  }

  if (countOnly) {
    return (
      <span className={className}>
        {variant === 'gb' ? totalSizeFormatted : count.toLocaleString()}
      </span>
    )
  }

  if (variant === 'gb') {
    return <span className={className}>{totalSizeFormatted}</span>
  }

  if (variant === 'videos') {
    return <span className={className}>{count.toLocaleString()} videos</span>
  }

  if (variant === 'remixes') {
    return (
      <span className={className}>
        {count.toLocaleString()} Video Remixes
      </span>
    )
  }

  // full: count + genreCount + totalSizeFormatted (para stats bar)
  return (
    <span className={className}>
      {count.toLocaleString()} videos • {genreCount} géneros • {totalSizeFormatted}
    </span>
  )
}
