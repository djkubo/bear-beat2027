/**
 * BunnyCDN – URLs firmadas (Token Authentication)
 * Hetzner Storage Box como origen; BunnyCDN Pull Zone como entrega.
 * Variables: NEXT_PUBLIC_BUNNY_CDN_URL, BUNNY_TOKEN_KEY
 * Fórmula: token = Base64(SHA256(BUNNY_TOKEN_KEY + path + expires))
 */

import crypto from 'crypto'

const BUNNY_CDN_URL = (
  process.env.NEXT_PUBLIC_BUNNY_CDN_URL ||
  process.env.BUNNY_CDN_URL ||
  ''
).trim().replace(/\/+$/, '')
const BUNNY_TOKEN_KEY = process.env.BUNNY_TOKEN_KEY || ''

/** Prefijo de ruta en el CDN (ej. packs/enero-2026). Mismo valor en demo-url, download y thumbnail-cdn. */
export function getBunnyPackPrefix(): string {
  const raw = (process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || '').trim()
  return raw.replace(/\/+$/, '')
}

export function isBunnyConfigured(): boolean {
  return !!(BUNNY_CDN_URL && BUNNY_TOKEN_KEY)
}

/**
 * Genera URL firmada para BunnyCDN (demos y descargas).
 * Path normalizado sin ..; URL con segmentos codificados (encodeURIComponent).
 * Sin dobles slashes: base sin barra final, pathEncoded empieza con /.
 */
export function generateSignedUrl(
  filePath: string,
  expiresInSeconds: number = 3600,
  allowedReferrer?: string
): string {
  const pathNormalized = '/' + (filePath || '').replace(/^\/+/, '').replace(/\.\./g, '').trim()
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds

  const hashable = BUNNY_TOKEN_KEY + pathNormalized + expires.toString()
  const token = crypto
    .createHash('sha256')
    .update(hashable)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  const pathEncoded = '/' + pathNormalized.split('/').filter(Boolean).map(encodeURIComponent).join('/')
  const url = `${BUNNY_CDN_URL}${pathEncoded}?token=${token}&expires=${expires}`

  if (allowedReferrer) {
    const refHash = crypto
      .createHash('sha256')
      .update(allowedReferrer)
      .digest('base64')
      .substring(0, 8)
    return `${url}&token_countries=MX,US&token_referrer=${refHash}`
  }

  return url
}
