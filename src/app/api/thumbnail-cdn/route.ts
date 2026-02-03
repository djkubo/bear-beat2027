import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, isBunnyConfigured } from '@/lib/bunny'
import { isFtpConfigured, streamFileFromFtp, getContentType } from '@/lib/ftp-stream'
import { Readable } from 'stream'

// Mismo prefijo que /api/download para consistencia con Bunny
const BUNNY_PACK_PREFIX = (process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || 'packs/enero-2026').replace(/\/$/, '')

/**
 * GET /api/thumbnail-cdn?path=Genre/filename.jpg
 * Con Bunny: redirige a URL firmada. Sin Bunny o si Bunny falla: stream desde FTP (raíz: Genre/file.jpg).
 */
export async function GET(req: NextRequest) {
  const pathParam = req.nextUrl.searchParams.get('path')
  if (!pathParam || pathParam.includes('..')) {
    return NextResponse.json({ error: 'path required' }, { status: 400 })
  }
  const sanitized = pathParam.replace(/^\//, '').trim()

  if (isBunnyConfigured()) {
    try {
      const decoded = decodeURIComponent(sanitized)
      const bunnyPath = BUNNY_PACK_PREFIX ? `${BUNNY_PACK_PREFIX}/${decoded}` : decoded
      // Sin allowedReferrer para que las imágenes carguen desde cualquier origen (evita 403/502)
      const signedUrl = generateSignedUrl(bunnyPath, 3600)
      return NextResponse.redirect(signedUrl)
    } catch (e) {
      console.warn('[thumbnail-cdn] Bunny signed URL failed, falling back to FTP:', (e as Error)?.message || e)
    }
  }

  if (isFtpConfigured()) {
    try {
      const stream = await streamFileFromFtp(sanitized, 'thumb')
      const webStream = Readable.toWeb(stream) as ReadableStream
      const contentType = getContentType(sanitized)
      return new NextResponse(webStream, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      })
    } catch (e) {
      console.error('[thumbnail-cdn] FTP stream failed:', (e as Error)?.message || e, 'path:', sanitized)
      return NextResponse.json({ error: 'Portada no disponible' }, { status: 502 })
    }
  }

  return NextResponse.json(
    { error: 'Thumbnails no configurados. Configura Bunny o FTP.' },
    { status: 503 }
  )
}
