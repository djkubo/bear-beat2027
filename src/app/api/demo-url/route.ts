import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, isBunnyConfigured } from '@/lib/bunny'
import { isFtpConfigured, streamFileFromFtp, getContentType } from '@/lib/ftp-stream'

const BUNNY_PACK_PREFIX = (process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || '').replace(/\/$/, '')
const DEMO_EXPIRY_SECONDS = 1800 // 30 min

/**
 * GET /api/demo-url?path=Genre/Video.mp4
 * Con Bunny: redirige 307 a URL firmada. Sin Bunny pero con FTP: hace stream del video desde FTP.
 */
export async function GET(req: NextRequest) {
  const pathParam = req.nextUrl.searchParams.get('path')
  if (!pathParam || pathParam.includes('..')) {
    return NextResponse.json({ error: 'path required' }, { status: 400 })
  }

  const sanitized = pathParam.replace(/^\//, '').trim()
  const pathNorm = sanitized.replace(/^Videos Enero 2026\/?/i, '').trim() || sanitized

  if (isBunnyConfigured()) {
    const bunnyPath = BUNNY_PACK_PREFIX ? `${BUNNY_PACK_PREFIX}/${pathNorm}` : pathNorm
    const signedUrl = generateSignedUrl(bunnyPath, DEMO_EXPIRY_SECONDS, process.env.NEXT_PUBLIC_APP_URL)
    const res = NextResponse.redirect(signedUrl, 307)
    res.headers.set('Cache-Control', 'private, max-age=300')
    return res
  }

  if (isFtpConfigured()) {
    try {
      const stream = await streamFileFromFtp(pathNorm, 'video')
      const { Readable } = await import('stream')
      const webStream = Readable.toWeb(stream) as ReadableStream
      const contentType = getContentType(pathNorm)
      return new NextResponse(webStream, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=300',
          'Accept-Ranges': 'bytes',
        },
      })
    } catch (e) {
      console.error('demo-url FTP:', e)
      return NextResponse.json(
        { error: 'Error al cargar el demo', reason: 'ftp_error' },
        { status: 502 }
      )
    }
  }

  return NextResponse.json(
    {
      error: 'Demos no disponibles',
      reason: 'bunny_not_configured',
      message: 'Configura Bunny CDN (NEXT_PUBLIC_BUNNY_CDN_URL, BUNNY_TOKEN_KEY) o FTP (FTP_HOST, FTP_USER, FTP_PASSWORD) en el servidor.',
    },
    { status: 503 }
  )
}
