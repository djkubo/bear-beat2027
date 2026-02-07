import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, isBunnyConfigured, buildBunnyPath } from '@/lib/bunny'
import { getPublicAppOrigin } from '@/lib/utils'
import { getContentType, isFtpConfigured, streamFileFromFtpOnceReady } from '@/lib/ftp-stream'
import { unicodePathVariants } from '@/lib/unicode-path'
import { Readable } from 'stream'

export const dynamic = 'force-dynamic'

const PLACEHOLDER_URL = '/api/placeholder/thumb?text=V'
const LEGACY_VIDEOS_FOLDER = 'Videos Enero 2026'
const BUNNY_SIGNED_TTL_SECONDS = 3600
const MODE_CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6h: reduce HEAD masivo en listados

type BunnyThumbMode = 'withPrefix' | 'noPrefix' | 'legacyNoPrefix'

let cachedThumbMode: BunnyThumbMode | null = null
let cachedThumbModeAt = 0

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

function isThumbModeFresh(): boolean {
  return !!cachedThumbMode && Date.now() - cachedThumbModeAt < MODE_CACHE_TTL_MS
}

function setThumbMode(mode: BunnyThumbMode) {
  cachedThumbMode = mode
  cachedThumbModeAt = Date.now()
}

function buildBunnyThumbPath(pathThumb: string, mode: BunnyThumbMode): string {
  switch (mode) {
    case 'noPrefix':
      return buildBunnyPath(pathThumb, false)
    case 'legacyNoPrefix':
      return buildBunnyPath(`${LEGACY_VIDEOS_FOLDER}/${pathThumb}`.replace(/\/+/g, '/'), false)
    case 'withPrefix':
    default:
      return buildBunnyPath(pathThumb, true)
  }
}

function withThumbCacheHeaders(res: NextResponse) {
  // Cachear el redirect un poco: evita que 1000 thumbnails golpeen el server en scroll rápido.
  // Es seguro porque el signed URL dura 1h y este cache es corto.
  res.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  return res
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
      // Evitar hacer HEAD por cada thumbnail (mata performance). Resolvemos el "modo" (con prefijo / sin prefijo / legacy)
      // una vez por proceso y luego solo firmamos y redirigimos.
      const hasNonAscii = /[^\x00-\x7F]/.test(pathThumb)
      const variants = hasNonAscii ? unicodePathVariants(pathThumb, 'nfc') : [pathThumb.normalize('NFC')]

      // Si ya tenemos modo cacheado y el path es ASCII, no hacemos HEAD: solo firmar + redirect.
      if (isThumbModeFresh() && cachedThumbMode && !hasNonAscii) {
        const bunnyPath = buildBunnyThumbPath(variants[0], cachedThumbMode)
        const signedUrl = bunnyPath ? generateSignedUrl(bunnyPath, BUNNY_SIGNED_TTL_SECONDS) : ''
        if (signedUrl) return withThumbCacheHeaders(NextResponse.redirect(signedUrl))
      }

      // Para paths con unicode (ñ/acentos) o sin modo resuelto: hacer pocas HEADs para elegir variante correcta.
      const modeOrder: BunnyThumbMode[] = cachedThumbMode ? [cachedThumbMode] : ['withPrefix', 'noPrefix', 'legacyNoPrefix']
      let firstNon404: { url: string; mode: BunnyThumbMode } | null = null

      for (const mode of modeOrder) {
        for (const p of variants) {
          const bunnyPath = buildBunnyThumbPath(p, mode)
          if (!bunnyPath) continue
          const signedUrl = generateSignedUrl(bunnyPath, BUNNY_SIGNED_TTL_SECONDS)
          if (!signedUrl?.startsWith('http') || signedUrl.length < 20) continue
          try {
            const head = await fetch(signedUrl, {
              method: 'HEAD',
              cache: 'no-store',
              signal: AbortSignal.timeout(4000),
            })
            if (head.ok) {
              // Solo cachear el modo si confirmamos existencia (no por 403).
              if (!cachedThumbMode || !isThumbModeFresh()) setThumbMode(mode)
              return withThumbCacheHeaders(NextResponse.redirect(signedUrl))
            }
            if (head.status === 404) continue
            // 403 u otro: puede ser que Bunny no permita HEAD; guardar como fallback.
            if (!firstNon404) firstNon404 = { url: signedUrl, mode }
          } catch {
            if (!firstNon404) firstNon404 = { url: signedUrl, mode }
          }
        }
      }

      if (firstNon404) {
        // Si nunca pudimos confirmar con HEAD, cachear el mejor intento para reducir futuros HEADs.
        if (!cachedThumbMode || !isThumbModeFresh()) setThumbMode(firstNon404.mode)
        return withThumbCacheHeaders(NextResponse.redirect(firstNon404.url))
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
