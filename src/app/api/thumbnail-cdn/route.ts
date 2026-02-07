import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, isBunnyConfigured, buildBunnyPath } from '@/lib/bunny'
import { getPublicAppOrigin } from '@/lib/utils'
import { getContentType, isFtpConfigured, streamFileFromFtpOnceReady } from '@/lib/ftp-stream'
import { unicodePathVariants } from '@/lib/unicode-path'
import { Readable } from 'stream'

export const dynamic = 'force-dynamic'

const PLACEHOLDER_URL = '/api/placeholder/thumb?text=V'
const LEGACY_VIDEOS_FOLDER = 'Videos Enero 2026'

function redirectToPlaceholder(req: NextRequest) {
  const base = getPublicAppOrigin(req)
  const url = base ? `${base.replace(/\/$/, '')}${PLACEHOLDER_URL}` : PLACEHOLDER_URL
  return NextResponse.redirect(url)
}

/** Extensiones de video que se mapean a .jpg para portada. */
const VIDEO_EXT = /\.(mp4|mov|avi|mkv|webm)$/i

function toThumbPath(path: string): string {
  if (VIDEO_EXT.test(path)) return path.replace(VIDEO_EXT, '.jpg')
  return path
}

/**
 * GET /api/thumbnail-cdn?path=Genre/filename.jpg o Genre/filename.mp4
 * Prioridad: 1) Bunny CDN (redirect), 2) FTP (stream), 3) placeholder.
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
    const pathThumb = toThumbPath(pathNorm)

    if (isBunnyConfigured()) {
      try {
        // Probar con y sin prefijo, una variante legacy fija, y variantes Unicode (NFC/NFD) para evitar mismatches de "ñ".
        const thumbVariants = unicodePathVariants(pathThumb, 'nfc')
        const variants = Array.from(
          new Set(
            thumbVariants
              .flatMap((p) => [
                buildBunnyPath(p, false),
                buildBunnyPath(p, true),
                buildBunnyPath(`${LEGACY_VIDEOS_FOLDER}/${p}`, false),
              ])
              .filter(Boolean)
          )
        )
        if (variants.length === 0) variants.push(pathThumb)

        let firstNon404: string | null = null
        for (const bunnyPath of variants) {
          if (!bunnyPath) continue
          const signedUrl = generateSignedUrl(bunnyPath, 3600)
          if (!signedUrl?.startsWith('http') || signedUrl.length < 20) continue
          try {
            const head = await fetch(signedUrl, {
              method: 'HEAD',
              cache: 'no-store',
              signal: AbortSignal.timeout(4000),
            })
            if (head.ok) return NextResponse.redirect(signedUrl)
            if (head.status === 404) continue
            // 403 u otro: puede ser que Bunny no permita HEAD; guardar como fallback.
            if (!firstNon404) firstNon404 = signedUrl
          } catch {
            if (!firstNon404) firstNon404 = signedUrl
          }
        }
        if (firstNon404) return NextResponse.redirect(firstNon404)
      } catch {
        // timeout, red o Bunny no disponible → fallback a FTP o placeholder
      }
    }

    // Fallback: si no hay Bunny (o no encontró el archivo ahí) pero sí hay FTP, servir la imagen desde FTP.
    // Las imágenes son pequeñas y este proxy evita depender 100% de Bunny para portadas.
    if (isFtpConfigured()) {
      const contentType = getContentType(pathThumb)
      const variants: Array<'thumb' | 'video'> = ['thumb', 'video'] // root, y luego dentro de FTP_BASE
      for (const type of variants) {
        const ftpVariants = unicodePathVariants(pathThumb, type === 'thumb' ? 'nfc' : 'nfd')
        for (const ftpPath of ftpVariants) {
          try {
            const stream = await streamFileFromFtpOnceReady(ftpPath, type)
            const webStream = Readable.toWeb(stream) as ReadableStream
            return new NextResponse(webStream, {
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'private, max-age=3600',
                'X-Content-Type-Options': 'nosniff',
              },
            })
          } catch {
            // probar siguiente variante
          }
        }
      }
    }

    return redirectToPlaceholder(req)
  } catch (e) {
    console.error('[thumbnail-cdn] Unhandled:', (e as Error)?.message || e)
    return redirectToPlaceholder(req)
  }
}
