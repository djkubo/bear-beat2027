import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, isBunnyConfigured, buildBunnyPath } from '@/lib/bunny'
import { getPublicAppOrigin } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const PLACEHOLDER_URL = '/api/placeholder/thumb?text=V'

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
 * Solo redirecciones (nunca stream) para evitar 502 en Render.
 * Prioridad: 1) Bunny CDN, 2) placeholder.
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
        // Probar con y sin prefijo: portadas en FTP están en raíz (Genre/file.jpg); algunos setups tienen bajo carpeta
        const pathWithPrefix = buildBunnyPath(pathThumb, true)
        const pathNoPrefix = buildBunnyPath(pathThumb, false)
        const variants = [pathNoPrefix, pathWithPrefix].filter(Boolean)
        if (variants.length === 0) variants.push(pathThumb)
        for (const bunnyPath of variants) {
          if (!bunnyPath) continue
          const signedUrl = generateSignedUrl(bunnyPath, 3600)
          if (!signedUrl?.startsWith('http') || signedUrl.length < 20) continue
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 4000)
          try {
            const head = await fetch(signedUrl, {
              method: 'HEAD',
              cache: 'no-store',
              signal: controller.signal,
            })
            clearTimeout(timeoutId)
            if (head.ok) return NextResponse.redirect(signedUrl)
          } catch {
            clearTimeout(timeoutId)
          }
        }
      } catch {
        // timeout, red o Bunny no disponible → placeholder
      }
    }

    return redirectToPlaceholder(req)
  } catch (e) {
    console.error('[thumbnail-cdn] Unhandled:', (e as Error)?.message || e)
    return redirectToPlaceholder(req)
  }
}
