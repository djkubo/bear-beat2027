import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, isBunnyConfigured, getBunnyPackPrefix } from '@/lib/bunny'
import { isFtpConfigured, streamFileFromFtp, getContentType } from '@/lib/ftp-stream'
import { Readable } from 'stream'

export const dynamic = 'force-dynamic'

/**
 * GET /api/thumbnail-cdn?path=Genre/filename.jpg
 * Bunny: redirige a URL firmada. Sin Bunny o si Bunny falla: stream desde FTP.
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
        const signedUrl = generateSignedUrl(bunnyPath, 3600)
        if (signedUrl && signedUrl.startsWith('http')) {
          return NextResponse.redirect(signedUrl)
        }
      } catch (e) {
        console.warn('[thumbnail-cdn] Bunny signed URL failed:', (e as Error)?.message || e)
      }
    }

    if (isFtpConfigured()) {
      try {
        const stream = await streamFileFromFtp(pathNorm, 'thumb')
        const webStream = Readable.toWeb(stream) as ReadableStream
        const contentType = getContentType(pathNorm)
        return new NextResponse(webStream, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
          },
        })
      } catch (e) {
        console.error('[thumbnail-cdn] FTP stream failed:', (e as Error)?.message || e, 'path:', pathNorm)
        return NextResponse.json({ error: 'Portada no disponible' }, { status: 503 })
      }
    }

    return NextResponse.json(
      { error: 'Thumbnails no configurados. Configura Bunny o FTP.' },
      { status: 503 }
    )
  } catch (e) {
    console.error('[thumbnail-cdn] Unhandled:', (e as Error)?.message || e)
    return NextResponse.json({ error: 'Portada no disponible' }, { status: 503 })
  }
}
