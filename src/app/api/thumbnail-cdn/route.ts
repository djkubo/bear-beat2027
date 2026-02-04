import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, isBunnyConfigured, buildBunnyPath } from '@/lib/bunny'
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
 * Prioridad: 1) FTP (Hetzner), 2) Bunny CDN. Portadas desde Hetzner si están ahí.
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
        console.warn('[thumbnail-cdn] FTP no tuvo la portada, intentando Bunny:', (e as Error)?.message || e)
      }
    }

    // 2) Fallback: Bunny CDN
    if (isBunnyConfigured()) {
      try {
        // Las portadas están en la raíz, así que pasamos 'false' para NO usar el prefijo.
        const bunnyPath = buildBunnyPath(pathNorm, false)
        if (bunnyPath) {
          const signedUrl = generateSignedUrl(bunnyPath, 3600)
          if (signedUrl && signedUrl.startsWith('http') && signedUrl.length > 20) {
            return NextResponse.redirect(signedUrl)
          }
        }
      } catch (e) {
        console.warn('[thumbnail-cdn] Bunny signed URL failed:', (e as Error)?.message || e)
      }
    }

    return redirectToPlaceholder(req)
  } catch (e) {
    console.error('[thumbnail-cdn] Unhandled:', (e as Error)?.message || e)
    return redirectToPlaceholder(req)
  }
}
