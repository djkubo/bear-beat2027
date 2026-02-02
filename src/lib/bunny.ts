/**
 * BunnyCDN – URL firmadas para descargas (Token Authentication)
 * Usa BUNNY_PULL_ZONE y BUNNY_SECURITY_KEY.
 * Fórmula: token = Base64(SHA256(securityKey + path + expires))
 */

import crypto from 'crypto'

const BUNNY_PULL_ZONE = (process.env.BUNNY_PULL_ZONE || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
const BUNNY_SECURITY_KEY = process.env.BUNNY_SECURITY_KEY || ''

export function isBunnyDownloadConfigured(): boolean {
  return !!(BUNNY_PULL_ZONE && BUNNY_SECURITY_KEY)
}

/**
 * Genera una URL firmada para descarga en BunnyCDN.
 * @param filePath - Ruta del archivo (ej: Bachata/Video1.mp4 o _ZIPS/Cumbia.zip)
 * @param expiresInSeconds - Segundos hasta expiración (default 3600)
 * @returns URL completa con token y expires, o '' si no está configurado
 */
export function getSignedDownloadUrl(
  filePath: string,
  expiresInSeconds: number = 3600
): string {
  if (!BUNNY_PULL_ZONE || !BUNNY_SECURITY_KEY) return ''

  const pathNormalized = '/' + (filePath || '').replace(/^\/+/, '').replace(/\.\./g, '')
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds

  const hashable = BUNNY_SECURITY_KEY + pathNormalized + expires.toString()
  const token = crypto
    .createHash('sha256')
    .update(hashable)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  const base = BUNNY_PULL_ZONE.startsWith('http') ? BUNNY_PULL_ZONE : `https://${BUNNY_PULL_ZONE}`
  return `${base}${pathNormalized}?token=${token}&expires=${expires}`
}
