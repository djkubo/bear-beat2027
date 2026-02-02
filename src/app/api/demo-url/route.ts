import { NextRequest, NextResponse } from 'next/server'
import { getSignedDownloadUrl, isBunnyDownloadConfigured } from '@/lib/bunny'

const BUNNY_PACK_PREFIX = (process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || '').replace(/\/$/, '')
const DEMO_EXPIRY_SECONDS = 1800 // 30 min para demos

/**
 * GET /api/demo-url?path=Genre/Video.mp4
 * Redirige a URL firmada de Bunny CDN para que el demo cargue rápido desde el CDN.
 * Si Bunny no está configurado, redirige a /api/demo/... (proxy).
 * El cliente usa esta URL como src del <video> para que el primer request sea ligero
 * y el streaming venga directo del CDN.
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

  // Fallback: proxy vía /api/demo
  const pathEncoded = pathNorm.split('/').map((s) => encodeURIComponent(s)).join('/')
  const origin = req.nextUrl.origin
  const proxyUrl = `${origin}/api/demo/${pathEncoded}`
  const resProxy = NextResponse.redirect(proxyUrl, 302)
  resProxy.headers.set('Cache-Control', 'private, max-age=60')
  return resProxy
}
