import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, isBunnyConfigured, getBunnyPackPrefix } from '@/lib/bunny'
import { isFtpConfigured, streamFileFromFtp, getContentType } from '@/lib/ftp-stream'

export const dynamic = 'force-dynamic'

const DEMO_EXPIRY_SECONDS = 1800 // 30 min

/**
 * GET /api/demo-url?path=Genre/Video.mp4
 * Bunny: redirige a URL firmada (el navegador carga desde CDN, evita timeout 502 en Render).
 * FTP: stream directo desde el servidor.
 */
export async function GET(req: NextRequest) {
  try {
    const pathParam = req.nextUrl.searchParams.get('path')
    if (!pathParam || pathParam.includes('..')) {
      return NextResponse.json({ error: 'path required' }, { status: 400 })
    }

    let pathNorm: string
    try {
      pathNorm = decodeURIComponent(pathParam).replace(/^\//, '').trim()
    } catch {
      pathNorm = pathParam.replace(/^\//, '').trim()
    }
    pathNorm = pathNorm.replace(/^Videos Enero 2026\/?/i, '').trim() || pathNorm

    if (isBunnyConfigured()) {
      try {
        const prefix = getBunnyPackPrefix()
        const bunnyPath = prefix ? `${prefix}/${pathNorm}` : pathNorm
        const signedUrl = generateSignedUrl(bunnyPath, DEMO_EXPIRY_SECONDS)
        if (!signedUrl || !signedUrl.startsWith('http')) {
          return NextResponse.json({ error: 'Demo no disponible' }, { status: 503 })
        }
        return NextResponse.redirect(signedUrl)
      } catch (e) {
        console.error('[demo-url] Bunny signed URL failed:', (e as Error)?.message || e, 'path:', pathNorm)
        return NextResponse.json({ error: 'Demo no disponible' }, { status: 503 })
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
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      {
        error: 'Demos no disponibles',
        reason: 'bunny_not_configured',
        message: 'Configura Bunny CDN o FTP en el servidor.',
      },
      { status: 503 }
    )
  } catch (e) {
    console.error('[demo-url] Unhandled:', (e as Error)?.message || e)
    return NextResponse.json({ error: 'Demo no disponible' }, { status: 503 })
  }
}
