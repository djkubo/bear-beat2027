import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, isBunnyConfigured, buildBunnyPath } from '@/lib/bunny'

// ==========================================
// API DE DEMOS – Solo 307 a BunnyCDN (Cloud Native)
// Solo videos: con prefijo "Videos Enero 2026" (BUNNY_PACK_PATH_PREFIX).
// ==========================================

const DEMO_EXPIRY_SECONDS = 1800 // 30 min

/**
 * GET /api/demo/Genre%2FVideo.mp4
 * Redirige 307 a URL firmada de BunnyCDN. El navegador pide el MP4 al CDN (200).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    const rawPath = pathSegments.join('/')
    if (!rawPath || rawPath.includes('..')) {
      return NextResponse.json({ error: 'path required' }, { status: 400 })
    }

    const decoded = decodeURIComponent(rawPath).replace(/\u2013/g, '-')
    const pathNorm = decoded.replace(/^\//, '').trim()

    if (!isBunnyConfigured()) {
      return NextResponse.json(
        {
          error: 'Demos no disponibles',
          reason: 'bunny_not_configured',
          message: 'Configura NEXT_PUBLIC_BUNNY_CDN_URL y BUNNY_TOKEN_KEY en el servidor.',
        },
        { status: 503 }
      )
    }

    const bunnyPath = buildBunnyPath(pathNorm, true)
    if (!bunnyPath) {
      return NextResponse.json({ error: 'Path inválido', reason: 'empty_path' }, { status: 400 })
    }
    const signedUrl = generateSignedUrl(bunnyPath, DEMO_EXPIRY_SECONDS, process.env.NEXT_PUBLIC_APP_URL)

    const res = NextResponse.redirect(signedUrl, 307)
    res.headers.set('Cache-Control', 'private, max-age=300')
    return res
  } catch (error: unknown) {
    console.error('Demo redirect error:', error)
    return NextResponse.json({ error: 'Error al obtener demo' }, { status: 500 })
  }
}
