'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

/** Logos de software compatible. Añade en /public/logos/ los PNG (o SVG) oficiales con estos nombres. */
const LOGOS = [
  { slug: 'serato', label: 'Serato' },
  { slug: 'rekordbox', label: 'Rekordbox' },
  { slug: 'virtualdj', label: 'VirtualDJ' },
  { slug: 'pioneer-dj', label: 'Pioneer DJ' },
  { slug: 'denon-dj', label: 'DENON DJ' },
] as const

export type CompatibleLogosVariant = 'all' | 'hero'

interface CompatibleLogosProps {
  /** 'all' = 5 logos (StatsSection), 'hero' = 3 primeros (Hero) */
  variant?: CompatibleLogosVariant
  className?: string
  /** Altura de cada logo en px */
  logoHeight?: number
  /** Más sutil (hero) o más destacado (stats) */
  subtle?: boolean
}

export function CompatibleLogos({ variant = 'all', className, logoHeight = 40, subtle = false }: CompatibleLogosProps) {
  const list = variant === 'hero' ? LOGOS.slice(0, 3) : LOGOS
  // Por logo: 'svg' → intentar .svg, 'png' → intentar .png, 'text' → mostrar texto
  const [ext, setExt] = useState<Record<string, 'svg' | 'png' | 'text'>>({})

  const handleError = (slug: string) => {
    setExt((p) => {
      const current = p[slug] ?? 'svg'
      if (current === 'svg') return { ...p, [slug]: 'png' }
      return { ...p, [slug]: 'text' }
    })
  }

  return (
    <div
      className={cn(
        'flex flex-wrap justify-center items-center gap-8 md:gap-12',
        subtle ? 'opacity-70 grayscale' : 'opacity-50 grayscale',
        'hover:grayscale-0 transition-all duration-500',
        className
      )}
      style={{ minHeight: logoHeight }}
    >
      {list.map(({ slug, label }) => {
        const state = ext[slug] ?? 'svg'
        if (state === 'text') {
          return (
            <span
              key={slug}
              className="text-base md:text-lg font-bold text-white/90 tracking-tight"
              style={{ height: logoHeight, lineHeight: `${logoHeight}px` }}
            >
              {label}
            </span>
          )
        }
        const extension = state === 'svg' ? 'svg' : 'png'
        return (
          <div
            key={slug}
            className="relative flex items-center justify-center shrink-0"
            style={{ height: logoHeight, minWidth: 70 }}
          >
            <Image
              src={`/logos/${slug}.${extension}`}
              alt={label}
              width={140}
              height={logoHeight}
              className="w-auto max-w-[120px] h-full object-contain object-center"
              onError={() => handleError(slug)}
              unoptimized
            />
          </div>
        )
      })}
    </div>
  )
}
