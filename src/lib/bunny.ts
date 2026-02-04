/**
 * BunnyCDN – URLs firmadas (Token Authentication)
 * Origen: Hetzner Storage Box (WebDAV). La Pull Zone de Bunny debe tener como Origin URL
 * la URL de tu Storage Box (ej. https://u123456.your-storagebox.de) para que Bunny jale
 * todos los archivos de Hetzner; no hace falta subir nada a Bunny Storage.
 * Variables: NEXT_PUBLIC_BUNNY_CDN_URL, BUNNY_TOKEN_KEY, BUNNY_PACK_PATH_PREFIX
 * Fórmula: token = Base64(SHA256(BUNNY_TOKEN_KEY + path + expires))
 */

import crypto from 'crypto'

const BUNNY_CDN_URL = (
  process.env.NEXT_PUBLIC_BUNNY_CDN_URL ||
  process.env.BUNNY_CDN_URL ||
  ''
).trim().replace(/\/+$/, '')
const BUNNY_TOKEN_KEY = process.env.BUNNY_TOKEN_KEY || ''

/** Prefijo de ruta en el CDN (ej. "Videos Enero 2026"). Todo (videos, portadas, ZIPs) va bajo este prefijo en Bunny Storage. */
export function getBunnyPackPrefix(): string {
  let raw = (process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || '').trim()
  // Quitar comillas si las pusieron en Render (ej. "Videos Enero 2026" → Videos Enero 2026)
  raw = raw.replace(/^["']|["']$/g, '')
  return raw.replace(/\/+$/, '')
}

/**
 * Construye la ruta final en el CDN. usePrefix true = todo bajo BUNNY_PACK_PATH_PREFIX (videos, portadas, ZIPs).
 */
export function buildBunnyPath(relativePath: string, usePrefix: boolean = true): string {
  const pathNorm = (relativePath || '').replace(/^\/+/, '').replace(/\/+$/, '').trim()
  if (!pathNorm) return ''
  if (!usePrefix) return pathNorm
  const prefix = getBunnyPackPrefix()
  if (!prefix) return pathNorm
  return [prefix, pathNorm].join('/').replace(/\/+/g, '/')
}

/** URL debe ser https y parecer CDN de Bunny (ej. https://xxx.b-cdn.net). */
export function isValidBunnyCdnUrl(url: string): boolean {
  if (!url || url.length < 15) return false
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    const host = (u.hostname || '').toLowerCase()
    if (!host) return false
    if (host.includes('b-cdn.net')) return true
    if (host.includes('bunnycdn') || host.includes('bunny')) return true
    return host.length >= 8
  } catch {
    return false
  }
}

/** Token no vacío y longitud mínima (Bunny suele dar claves largas). */
export function isValidBunnyTokenKey(key: string): boolean {
  const k = (key || '').trim()
  return k.length >= 8 && k.length <= 500
}

export function isBunnyConfigured(): boolean {
  return isValidBunnyCdnUrl(BUNNY_CDN_URL) && isValidBunnyTokenKey(BUNNY_TOKEN_KEY)
}

/** Para mensajes 503: indica qué falta o qué está mal (no expone valores). */
export function getBunnyMissingVars(): string[] {
  const missing: string[] = []
  if (!BUNNY_CDN_URL) missing.push('NEXT_PUBLIC_BUNNY_CDN_URL o BUNNY_CDN_URL')
  if (!BUNNY_TOKEN_KEY) missing.push('BUNNY_TOKEN_KEY')
  return missing
}

export type BunnyConfigStatus = {
  ok: boolean
  missing: string[]
  invalid: string[]
  hints: string[]
}

/** Verifica que las variables existan Y estén correctas. */
export function getBunnyConfigStatus(): BunnyConfigStatus {
  const missing: string[] = []
  const invalid: string[] = []
  const hints: string[] = []

  if (!BUNNY_CDN_URL) {
    missing.push('NEXT_PUBLIC_BUNNY_CDN_URL o BUNNY_CDN_URL')
  } else if (!isValidBunnyCdnUrl(BUNNY_CDN_URL)) {
    invalid.push('NEXT_PUBLIC_BUNNY_CDN_URL / BUNNY_CDN_URL: debe ser https y una URL de Bunny (ej. https://tu-zona.b-cdn.net, sin barra final)')
    hints.push('En Render: sin barra final. En BunnyCDN → Pull Zone → Hostname.')
  }

  if (!BUNNY_TOKEN_KEY) {
    missing.push('BUNNY_TOKEN_KEY')
  } else if (!isValidBunnyTokenKey(BUNNY_TOKEN_KEY)) {
    invalid.push('BUNNY_TOKEN_KEY: debe tener entre 8 y 500 caracteres (Token Authentication Key de la Pull Zone)')
    hints.push('BunnyCDN → Pull Zone → Security → Token Authentication → copiar la clave.')
  }

  const prefix = getBunnyPackPrefix()
  if (BUNNY_CDN_URL && BUNNY_TOKEN_KEY && !prefix) {
    hints.push('BUNNY_PACK_PATH_PREFIX: si tus archivos están en una carpeta (ej. "Videos Enero 2026"), configúralo; si están en la raíz, está bien vacío.')
  }

  return {
    ok: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    hints,
  }
}

/**
 * Genera URL firmada para BunnyCDN (demos y descargas).
 * Fórmula oficial Bunny: token = Base64(SHA256(securityKey + path + expires)); path = decoded.
 * La URL se construye con path decoded; el navegador la codifica al hacer la petición.
 */
export function generateSignedUrl(
  filePath: string,
  expiresInSeconds: number = 3600,
  allowedReferrer?: string
): string {
  const pathNorm = (filePath || '').replace(/^\/+/, '').replace(/\.\./g, '').trim()
  if (!pathNorm) return ''
  const pathNormalized = '/' + pathNorm
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds

  const hashable = BUNNY_TOKEN_KEY + pathNormalized + expires.toString()
  const token = crypto
    .createHash('sha256')
    .update(hashable)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  const baseUrl = BUNNY_CDN_URL.replace(/\/+$/, '')
  const url = new URL(baseUrl)
  url.pathname = pathNormalized
  url.search = `?token=${token}&expires=${expires}`

  let signed = url.href
  if (allowedReferrer) {
    const refHash = crypto
      .createHash('sha256')
      .update(allowedReferrer)
      .digest('base64')
      .substring(0, 8)
    signed += `&token_countries=MX,US&token_referrer=${refHash}`
  }

  return signed
}
