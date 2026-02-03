import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, isBunnyConfigured, buildBunnyPath, getBunnyConfigStatus } from '@/lib/bunny'
import { isFtpConfigured, streamFileFromFtp, getContentType } from '@/lib/ftp-stream'
import { getPublicAppOrigin } from '@/lib/utils'
import { Readable } from 'stream'

export const dynamic = 'force-dynamic'

const PLACEHOLDER_URL = '/api/placeholder/thumb?text=V'

function redirectToPlaceholder(req: NextRequest) {
  const base = getPublicAppOrigin(req)
  const url = base ? `${base.replace(/\/$/, '')}${PLACEHOLDER_URL}` : PLACEHOLDER_URL
  return NextResponse.redirect(url)
}

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
      return redirectToPlaceholder(req)
    }

    try {
      // Mismo prefijo que videos (todo bajo BUNNY_PACK_PATH_PREFIX en Bunny Storage)
      const bunnyPath = buildBunnyPath(pathNorm, true)
      if (!bunnyPath) {
        return redirectToPlaceholder(req)
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
        return redirectToPlaceholder(req)
      }
    }

    return redirectToPlaceholder(req)
  } catch (e) {
    console.error('[thumbnail-cdn] Unhandled:', (e as Error)?.message || e)
    return redirectToPlaceholder(req)
  }
}
