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

  if (isBunnyConfigured()) {
    try {
      const prefix = getBunnyPackPrefix()
      const bunnyPath = prefix ? `${prefix}/${pathNorm}` : pathNorm
      // Sin allowedReferrer para que las imágenes carguen desde cualquier origen (evita 403/502)
      const signedUrl = generateSignedUrl(bunnyPath, 3600)
      return NextResponse.redirect(signedUrl)
    } catch (e) {
      console.warn('[thumbnail-cdn] Bunny signed URL failed, falling back to FTP:', (e as Error)?.message || e)
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
      return NextResponse.json({ error: 'Portada no disponible' }, { status: 502 })
    }
  }

  return NextResponse.json(
    { error: 'Thumbnails no configurados. Configura Bunny o FTP.' },
    { status: 503 }
  )
}
