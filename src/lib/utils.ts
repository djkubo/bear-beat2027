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

/** Patrón para detectar orígenes no públicos (evitar Mixed Content / Connection Refused en producción). */
const LOCAL_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i

/**
 * Devuelve la URL base pública de la app para redirects y enlaces en el servidor.
 * NUNCA devuelve 0.0.0.0 ni localhost; en ese caso devuelve '' (rutas relativas).
 */
export function getPublicAppOrigin(request?: { headers?: Headers; nextUrl?: { origin: string }; url?: string }): string {
  const app = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  if (app && !LOCAL_ORIGIN_REGEX.test(app)) return app
  const headers = request?.headers
  if (headers) {
    const host = headers.get('x-forwarded-host') || headers.get('host') || ''
    if (host && !/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(host)) return `https://${host}`
  }
  const origin = request?.nextUrl?.origin || (request?.url ? new URL(request.url).origin : '')
  if (origin && !LOCAL_ORIGIN_REGEX.test(origin)) return origin
  return app || origin || ''
}

/**
 * URL de demo: CDN primero (baseUrl), si no → API local con ruta relativa.
 * Con baseUrl (CDN): no se elimina ningún prefijo del path (ej. "Videos Enero 2026") para que coincida con la estructura del CDN.
 * Sin baseUrl: se normaliza el path para /api/demo/... (compatible con redirección a Bunny desde la API).
 */
export function getDemoCdnUrl(path: string, baseUrl?: string | null): string {
  const base =
    (typeof baseUrl === 'string' && baseUrl && baseUrl.replace(/\/$/, '')) ||
    (typeof process.env.NEXT_PUBLIC_BUNNY_CDN_URL === 'string' && process.env.NEXT_PUBLIC_BUNNY_CDN_URL
      ? process.env.NEXT_PUBLIC_BUNNY_CDN_URL.replace(/\/$/, '')
      : '')
  // Con CDN: conservar prefijos (ej. "Videos Enero 2026"). Sin CDN: quitar ese prefijo para la API.
  const pathNorm = base
    ? path.replace(/^\/+|\/+$/g, '').replace(/\.\./g, '').trim()
    : (path.replace(/^Videos Enero 2026\/?/i, '').trim() || path.replace(/^\/+|\/+$/g, '').trim())
  const pathEncoded = pathNorm.split('/').filter(Boolean).map((seg) => encodeURIComponent(seg)).join('/')
  if (base && pathEncoded) return `${base}/${pathEncoded}`
  if (base) return base
  return pathEncoded ? `/api/demo/${pathEncoded}` : ''
}

/**
 * Si la URL es absoluta a localhost/0.0.0.0, devuelve solo pathname+search (ruta relativa).
 * Evita ERR_CONNECTION_REFUSED cuando el servidor devuelve 0.0.0.0 en redirects.
 */
export function toRelativeApiUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string' || url.startsWith('/')) return url || ''
  try {
    const u = new URL(url)
    if (LOCAL_ORIGIN_REGEX.test(u.origin)) return u.pathname + u.search
  } catch {
    // ignore
  }
  return url
}
