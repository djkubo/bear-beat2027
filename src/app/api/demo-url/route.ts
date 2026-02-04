import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, isBunnyConfigured, buildBunnyPath, getBunnyConfigStatus } from '@/lib/bunny'
import { isFtpConfigured, streamFileFromFtp, getContentType } from '@/lib/ftp-stream'

export const dynamic = 'force-dynamic'

const DEMO_EXPIRY_SECONDS = 1800 // 30 min

/**
 * GET /api/demo-url?path=Genre/Video.mp4
 * Prioridad: 1) FTP (Hetzner), 2) Bunny CDN. Los archivos se sirven desde Hetzner si están ahí.
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

    // 1) Prioridad: FTP (Hetzner)
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
            'X-Content-Type-Options': 'nosniff',
          },
        })
      } catch (e) {
        console.warn('[demo-url] FTP no tuvo el archivo, intentando Bunny:', (e as Error)?.message || e)
      }
    }

    // 2) Fallback: Bunny CDN
    if (isBunnyConfigured()) {
      const bunnyPath = buildBunnyPath(pathNorm, true)
      if (bunnyPath) {
        try {
          const signedUrl = generateSignedUrl(bunnyPath, DEMO_EXPIRY_SECONDS)
          if (signedUrl && signedUrl.startsWith('http') && signedUrl.length > 20) {
            return NextResponse.redirect(signedUrl)
          }
        } catch (e) {
          console.warn('[demo-url] Bunny signed URL failed:', (e as Error)?.message || e, 'path:', pathNorm)
        }
      }
    }

    if (!isFtpConfigured() && !isBunnyConfigured()) {
      const status = getBunnyConfigStatus()
      return NextResponse.json(
        {
          error: 'Demos no disponibles',
          reason: 'no_source',
          message: 'Configura FTP (Hetzner) o Bunny CDN en Render (Environment).',
          missing: status.missing,
          invalid: status.invalid,
          hints: status.hints,
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Demo no disponible', reason: 'file_not_found', path: pathNorm },
      { status: 503 }
    )
  } catch (e) {
    console.error('[demo-url] Unhandled:', (e as Error)?.message || e)
    return NextResponse.json({ error: 'Demo no disponible' }, { status: 503 })
  }
}
