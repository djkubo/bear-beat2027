import { NextResponse } from 'next/server'
import { getBunnyConfigStatus, isValidBunnyCdnUrl, isValidBunnyTokenKey } from '@/lib/bunny'
import { isBrevoEmailConfigured } from '@/lib/brevo-email'

/**
 * GET /api/debug-config
 * Verifica Bunny CDN y Email (Brevo). No expone valores secretos.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const cdnUrl = (process.env.NEXT_PUBLIC_BUNNY_CDN_URL || process.env.BUNNY_CDN_URL || '').trim()
  const tokenKey = (process.env.BUNNY_TOKEN_KEY || '').trim()
  const packPrefix = (process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || '').trim()

  const status = getBunnyConfigStatus()
  const emailConfigured = isBrevoEmailConfigured()

  const detail = {
    NEXT_PUBLIC_BUNNY_CDN_URL_or_BUNNY_CDN_URL: cdnUrl
      ? (isValidBunnyCdnUrl(cdnUrl) ? 'OK (https, formato Bunny)' : 'INVÁLIDA (debe ser https://xxx.b-cdn.net sin barra final)')
      : 'VACÍA',
    BUNNY_TOKEN_KEY: tokenKey
      ? (isValidBunnyTokenKey(tokenKey) ? 'OK (8-500 caracteres)' : 'INVÁLIDA (entre 8 y 500 caracteres)')
      : 'VACÍA',
    BUNNY_PACK_PATH_PREFIX: packPrefix ? `definido (${packPrefix.length} caracteres)` : 'vacío (opcional si archivos en raíz)',
    email_brevo: emailConfigured
      ? 'OK (BREVO_API_KEY + BREVO_SENDER_EMAIL configurados; bienvenida y recuperación pago se envían por Brevo)'
      : 'NO CONFIGURADO (falta BREVO_API_KEY o BREVO_SENDER_EMAIL en Environment → no se envían emails de acceso ni recuperación)',
  }

  console.log('[debug-config]', JSON.stringify({ ...detail, ok: status.ok, emailOk: emailConfigured }, null, 2))

  return NextResponse.json({
    ok: status.ok,
    email_configured: emailConfigured,
    message: status.ok
      ? 'BunnyCDN configurado correctamente. Demos y thumbnails deberían funcionar.'
      : 'Revisa las variables en Render → Environment. No se exponen valores secretos.',
    missing: status.missing,
    invalid: status.invalid,
    hints: status.hints,
    detail,
  })
}
