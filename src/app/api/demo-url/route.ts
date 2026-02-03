import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, isBunnyConfigured } from '@/lib/bunny'
import { isFtpConfigured, streamFileFromFtp, getContentType } from '@/lib/ftp-stream'

const BUNNY_PACK_PREFIX = (process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || '').replace(/\/$/, '')
const DEMO_EXPIRY_SECONDS = 1800 // 30 min

/**
 * GET /api/demo-url?path=Genre/Video.mp4
 * Proxy stream para que el <video> funcione sin problemas de redirect/CORS.
 * Bunny: hace fetch a la URL firmada y hace pipe al cliente. FTP: stream directo.
 */
export async function GET(req: NextRequest) {
  const pathParam = req.nextUrl.searchParams.get('path')
  if (!pathParam || pathParam.includes('..')) {
    return NextResponse.json({ error: 'path required' }, { status: 400 })
  }

  const sanitized = decodeURIComponent(pathParam).replace(/^\//, '').trim()
  const pathNorm = sanitized.replace(/^Videos Enero 2026\/?/i, '').trim() || sanitized

  if (isBunnyConfigured()) {
    const bunnyPath = BUNNY_PACK_PREFIX ? `${BUNNY_PACK_PREFIX}/${pathNorm}` : pathNorm
    const signedUrl = generateSignedUrl(bunnyPath, DEMO_EXPIRY_SECONDS, process.env.NEXT_PUBLIC_APP_URL)
    try {
      const range = req.headers.get('range') || ''
      const res = await fetch(signedUrl, {
        method: 'GET',
        headers: range ? { Range: range } : {},
      })
      if (!res.ok && res.status !== 206) {
        return NextResponse.json({ error: 'Demo no disponible' }, { status: res.status })
      }
      const contentType = res.headers.get('content-type') || getContentType(pathNorm)
      const headers = new Headers({
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
        'Accept-Ranges': 'bytes',
      })
      const contentLength = res.headers.get('content-length')
      if (contentLength) headers.set('Content-Length', contentLength)
      if (res.status === 206) {
        const cr = res.headers.get('content-range')
        if (cr) headers.set('Content-Range', cr)
      }
      return new NextResponse(res.body ?? undefined, {
        status: res.status,
        headers,
      })
    } catch (e) {
      console.error('demo-url Bunny proxy:', e)
      return NextResponse.json({ error: 'Error al cargar el demo' }, { status: 502 })
    }
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
