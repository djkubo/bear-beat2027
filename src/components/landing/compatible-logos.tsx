'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

/** Logos de software compatible. Usa placeholder único para evitar 404 si no existen serato.svg, etc. en /public/logos/. */
const PLACEHOLDER_SRC = '/logos/compatible-placeholder.svg'
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
      {list.map(({ slug, label }) => (
        <div
          key={slug}
          className="relative flex items-center justify-center shrink-0"
          style={{ height: logoHeight, minWidth: 70 }}
          title={label}
        >
          <Image
            src={PLACEHOLDER_SRC}
            alt={label}
            width={140}
            height={logoHeight}
            className="w-auto max-w-[120px] h-full object-contain object-center"
            unoptimized
          />
        </div>
      ))}
    </div>
  )
}
