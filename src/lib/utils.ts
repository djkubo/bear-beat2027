import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistance } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'dd MMM yyyy', { locale: es })
}

export function formatMonth(month: string) {
  // month format: '2026-01'
  const [year, monthNum] = month.split('-')
  const date = new Date(parseInt(year), parseInt(monthNum) - 1)
  return format(date, 'MMMM yyyy', { locale: es })
}

export function formatPrice(price: number, currency: 'MXN' | 'USD' = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function daysUntil(date: string | Date): number {
  const target = new Date(date)
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function timeAgo(date: string | Date): string {
  return formatDistance(new Date(date), new Date(), {
    addSuffix: true,
    locale: es,
  })
}

export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

/**
 * URL de demo: Bunny CDN (prioridad) o fallback a /api/demo (proxy Next.js).
 * Usa, en orden: baseUrl (desde /api/cdn-base → BUNNY_CDN_URL), o NEXT_PUBLIC_BUNNY_CDN_URL.
 * Si no hay CDN configurado, devuelve /api/demo/... para que los demos intenten cargar vía API (puede 503 en prod si FTP no está).
 */
export function getDemoCdnUrl(path: string, baseUrl?: string | null): string {
  const base =
    (typeof baseUrl === 'string' && baseUrl && baseUrl.replace(/\/$/, '')) ||
    (typeof process.env.NEXT_PUBLIC_BUNNY_CDN_URL === 'string' && process.env.NEXT_PUBLIC_BUNNY_CDN_URL
      ? process.env.NEXT_PUBLIC_BUNNY_CDN_URL.replace(/\/$/, '')
      : '')
  const pathNorm = path.replace(/^Videos Enero 2026\/?/i, '').trim()
  const pathEncoded = pathNorm.split('/').map((seg) => encodeURIComponent(seg)).join('/')
  if (base) return `${base}/${pathEncoded}`
  return pathEncoded ? `/api/demo/${pathEncoded}` : ''
}
