import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, isBunnyConfigured } from '@/lib/bunny'
import { isFtpConfigured, streamFileFromFtp, getContentType } from '@/lib/ftp-stream'
import { Readable } from 'stream'

const BUNNY_PACK_PREFIX = (process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || 'packs/enero-2026').replace(/\/$/, '')

/**
 * GET /api/thumbnail-cdn?path=Genre/filename.jpg
 * Con Bunny: redirige a URL firmada. Sin Bunny pero con FTP: stream de la portada desde FTP (raíz: Genre/file.jpg).
 */
export async function GET(req: NextRequest) {
  const pathParam = req.nextUrl.searchParams.get('path')
  if (!pathParam || pathParam.includes('..')) {
    return NextResponse.json({ error: 'path required' }, { status: 400 })
  }
  const sanitized = pathParam.replace(/^\//, '').trim()

  if (isBunnyConfigured()) {
    const bunnyPath = `${BUNNY_PACK_PREFIX}/${sanitized}`
    const signedUrl = generateSignedUrl(bunnyPath, 3600, process.env.NEXT_PUBLIC_APP_URL)
    return NextResponse.redirect(signedUrl)
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
      console.error('thumbnail-cdn FTP:', e)
      return NextResponse.json({ error: 'Portada no disponible' }, { status: 502 })
    }
  }

  return NextResponse.json(
    { error: 'Thumbnails no configurados. Configura Bunny o FTP.' },
    { status: 503 }
  )
}
