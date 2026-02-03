import { NextResponse } from 'next/server'
import { getBunnyConfigStatus, isValidBunnyCdnUrl, isValidBunnyTokenKey } from '@/lib/bunny'

/**
 * GET /api/debug-config
 * Verifica que las variables de Bunny existan Y estén correctas (formato URL, longitud token).
 * Devuelve ok, missing, invalid y hints. No expone valores secretos.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const cdnUrl = (process.env.NEXT_PUBLIC_BUNNY_CDN_URL || process.env.BUNNY_CDN_URL || '').trim()
  const tokenKey = (process.env.BUNNY_TOKEN_KEY || '').trim()
  const packPrefix = (process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || '').trim()

  const status = getBunnyConfigStatus()

  const detail = {
    NEXT_PUBLIC_BUNNY_CDN_URL_or_BUNNY_CDN_URL: cdnUrl
      ? (isValidBunnyCdnUrl(cdnUrl) ? 'OK (https, formato Bunny)' : 'INVÁLIDA (debe ser https://xxx.b-cdn.net sin barra final)')
      : 'VACÍA',
    BUNNY_TOKEN_KEY: tokenKey
      ? (isValidBunnyTokenKey(tokenKey) ? 'OK (8-500 caracteres)' : 'INVÁLIDA (entre 8 y 500 caracteres)')
      : 'VACÍA',
    BUNNY_PACK_PATH_PREFIX: packPrefix ? `definido (${packPrefix.length} caracteres)` : 'vacío (opcional si archivos en raíz)',
  }

  console.log('[debug-config] BunnyCDN:', JSON.stringify({ ...detail, ok: status.ok, missing: status.missing, invalid: status.invalid }, null, 2))

  return NextResponse.json({
    ok: status.ok,
    message: status.ok
      ? 'BunnyCDN configurado correctamente. Demos y thumbnails deberían funcionar.'
      : 'Revisa las variables en Render → Environment. No se exponen valores secretos.',
    missing: status.missing,
    invalid: status.invalid,
    hints: status.hints,
    detail,
  })
}
