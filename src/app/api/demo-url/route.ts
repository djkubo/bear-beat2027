import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, isBunnyConfigured } from '@/lib/bunny'

const BUNNY_PACK_PREFIX = (process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || '').replace(/\/$/, '')
const DEMO_EXPIRY_SECONDS = 1800 // 30 min

/**
 * GET /api/demo-url?path=Genre/Video.mp4
 * Redirige 307 a URL firmada de BunnyCDN. Sin Bunny configurado → 503.
 */
export async function GET(req: NextRequest) {
  const pathParam = req.nextUrl.searchParams.get('path')
  if (!pathParam || pathParam.includes('..')) {
    return NextResponse.json({ error: 'path required' }, { status: 400 })
  }

  const sanitized = pathParam.replace(/^\//, '').trim()
  const pathNorm = sanitized.replace(/^Videos Enero 2026\/?/i, '').trim() || sanitized

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

  const bunnyPath = BUNNY_PACK_PREFIX ? `${BUNNY_PACK_PREFIX}/${pathNorm}` : pathNorm
  const signedUrl = generateSignedUrl(bunnyPath, DEMO_EXPIRY_SECONDS, process.env.NEXT_PUBLIC_APP_URL)

  const res = NextResponse.redirect(signedUrl, 307)
  res.headers.set('Cache-Control', 'private, max-age=300')
  return res
}
