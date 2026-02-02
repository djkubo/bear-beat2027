import { NextRequest, NextResponse } from 'next/server'
import { getSignedDownloadUrl, isBunnyDownloadConfigured } from '@/lib/bunny'
import { generateSignedUrl } from '@/lib/storage/bunny'
import { getPublicAppOrigin } from '@/lib/utils'

const BUNNY_PACK_PREFIX = (process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || '').replace(/\/$/, '')
const DEMO_EXPIRY_SECONDS = 1800 // 30 min para demos
const USE_BUNNY_LEGACY = !!(process.env.BUNNY_CDN_URL && process.env.BUNNY_TOKEN_KEY)

/**
 * GET /api/demo-url?path=Genre/Video.mp4
 * Redirige a URL firmada de Bunny CDN para que el demo cargue rápido desde el CDN.
 * Soporta: (1) BUNNY_PULL_ZONE + BUNNY_SECURITY_KEY, (2) legacy BUNNY_CDN_URL + BUNNY_TOKEN_KEY.
 * Si Bunny no está configurado, redirige a /api/demo/... (proxy).
 * NUNCA usa req.nextUrl.origin en producción: puede ser 0.0.0.0:10000 (Connection Refused).
 */
export async function GET(req: NextRequest) {
  const pathParam = req.nextUrl.searchParams.get('path')
  if (!pathParam || pathParam.includes('..')) {
    return NextResponse.json({ error: 'path required' }, { status: 400 })
  }

  const sanitized = pathParam.replace(/^\//, '').trim()
  const pathNorm = sanitized.replace(/^Videos Enero 2026\/?/i, '').trim() || sanitized

  if (isBunnyDownloadConfigured()) {
    const bunnyPath = BUNNY_PACK_PREFIX ? `${BUNNY_PACK_PREFIX}/${pathNorm}` : pathNorm
    const signedUrl = getSignedDownloadUrl(bunnyPath, DEMO_EXPIRY_SECONDS)
    if (signedUrl) {
      const res = NextResponse.redirect(signedUrl, 302)
      res.headers.set('Cache-Control', 'private, max-age=300')
      return res
    }
  }

  if (USE_BUNNY_LEGACY) {
    const bunnyPath = BUNNY_PACK_PREFIX ? `${BUNNY_PACK_PREFIX}/${pathNorm}` : pathNorm
    const signedUrl = generateSignedUrl(bunnyPath, DEMO_EXPIRY_SECONDS, process.env.NEXT_PUBLIC_APP_URL)
    const res = NextResponse.redirect(signedUrl, 302)
    res.headers.set('Cache-Control', 'private, max-age=300')
    return res
  }

  // Fallback: proxy vía /api/demo (NextResponse.redirect exige URL absoluta; nunca 0.0.0.0/localhost)
  const pathEncoded = pathNorm.split('/').map((s) => encodeURIComponent(s)).join('/')
  const baseUrl = getPublicAppOrigin(req)
  if (!baseUrl) {
    return NextResponse.json(
      { error: 'Demo fallback no disponible. Configura NEXT_PUBLIC_APP_URL en el servidor (ej. https://tu-dominio.onrender.com).' },
      { status: 503 }
    )
  }
  const proxyUrl = `${baseUrl}/api/demo/${pathEncoded}`
  const resProxy = NextResponse.redirect(proxyUrl, 302)
  resProxy.headers.set('Cache-Control', 'private, max-age=60')
  return resProxy
}
