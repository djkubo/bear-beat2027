import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, isBunnyConfigured, buildBunnyPath, getBunnyConfigStatus } from '@/lib/bunny'
import { isFtpConfigured, streamFileFromFtp, getContentType } from '@/lib/ftp-stream'
import { Readable } from 'stream'

export const dynamic = 'force-dynamic'

const PLACEHOLDER_URL = '/api/placeholder/thumb?text=V'

/**
 * GET /api/thumbnail-cdn?path=Genre/filename.jpg
 * Bunny: redirige a URL firmada. Si Bunny no está configurado: no redirigir a URL inválida (evita 502); usar placeholder o FTP.
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

    if (!isBunnyConfigured()) {
      const status = getBunnyConfigStatus()
      console.warn('[thumbnail-cdn] Bunny no configurado o inválido:', { missing: status.missing, invalid: status.invalid })
      if (isFtpConfigured()) {
        try {
          const stream = await streamFileFromFtp(pathNorm, 'thumb')
          const webStream = Readable.toWeb(stream) as ReadableStream
          const contentType = getContentType(pathNorm)
          return new NextResponse(webStream, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400',
              'X-Content-Type-Options': 'nosniff',
            },
          })
        } catch (e) {
          console.error('[thumbnail-cdn] FTP stream failed:', (e as Error)?.message || e, 'path:', pathNorm)
        }
      }
      return NextResponse.redirect(new URL(PLACEHOLDER_URL, req.url))
    }

    try {
      // Portadas en la raíz del CDN: SIN prefijo (Genre/foto.jpg)
      const bunnyPath = buildBunnyPath(pathNorm, false)
      if (!bunnyPath) {
        return NextResponse.redirect(new URL(PLACEHOLDER_URL, req.url))
      }
      const signedUrl = generateSignedUrl(bunnyPath, 3600)
      if (signedUrl && signedUrl.startsWith('http') && signedUrl.length > 20) {
        return NextResponse.redirect(signedUrl)
      }
      console.warn('[thumbnail-cdn] URL firmada inválida (vacía o corta). No redirigir para evitar 502.')
    } catch (e) {
      console.warn('[thumbnail-cdn] Bunny signed URL failed:', (e as Error)?.message || e)
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
            'X-Content-Type-Options': 'nosniff',
          },
        })
      } catch (e) {
        console.error('[thumbnail-cdn] FTP stream failed:', (e as Error)?.message || e, 'path:', pathNorm)
        return NextResponse.redirect(new URL(PLACEHOLDER_URL, req.url))
      }
    }

    return NextResponse.redirect(new URL(PLACEHOLDER_URL, req.url))
  } catch (e) {
    console.error('[thumbnail-cdn] Unhandled:', (e as Error)?.message || e)
    return NextResponse.redirect(new URL(PLACEHOLDER_URL, req.url))
  }
}
