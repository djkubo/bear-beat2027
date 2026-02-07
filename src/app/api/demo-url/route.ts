import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, isBunnyConfigured, buildBunnyPath, getBunnyConfigStatus } from '@/lib/bunny'
import { isFtpConfigured, streamFileFromFtpOnceReady, getContentType } from '@/lib/ftp-stream'
import { unicodePathVariants } from '@/lib/unicode-path'
import { Readable } from 'stream'

export const dynamic = 'force-dynamic'

const DEMO_EXPIRY_SECONDS = 1800 // 30 min
const LEGACY_VIDEOS_FOLDER = 'Videos Enero 2026'

/**
 * GET /api/demo-url?path=Genre/Video.mp4
 * Prioridad: 1) Bunny CDN (mejor para streaming sin 502/timeouts), 2) FTP (fallback).
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

    // 1) Prioridad: Bunny CDN (solo si el archivo existe; si no, evitamos redirigir a 404).
    if (isBunnyConfigured()) {
      // Demos pueden estar:
      // - En raíz: Genre/video.mp4
      // - Bajo prefijo del pack: BUNNY_PACK_PATH_PREFIX/Genre/video.mp4
      // - Bajo carpeta demos/: demos/Genre/video.mp4
      const pathVariants = unicodePathVariants(pathNorm, 'nfc')
      const rawCandidates = pathVariants.flatMap((p) => [
        buildBunnyPath(p, false),
        buildBunnyPath(`demos/${p}`, false),
        buildBunnyPath(p, true),
        buildBunnyPath(`demos/${p}`, true),
        // Variantes legacy fijas (por si BUNNY_PACK_PATH_PREFIX está mal configurado)
        buildBunnyPath(`${LEGACY_VIDEOS_FOLDER}/${p}`, false),
        buildBunnyPath(`${LEGACY_VIDEOS_FOLDER}/demos/${p}`, false),
      ]).filter(Boolean)
      const candidates = Array.from(new Set(rawCandidates))

      let firstNon404: string | null = null
      for (const bunnyPath of candidates) {
        try {
          const signedUrl = generateSignedUrl(bunnyPath, DEMO_EXPIRY_SECONDS)
          if (!signedUrl || !signedUrl.startsWith('http') || signedUrl.length < 20) continue
          const head = await fetch(signedUrl, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(5000) })
          if (head.ok) return NextResponse.redirect(signedUrl)
          if (head.status === 404) continue
          // 403 u otro: puede ser que Bunny no permita HEAD; guardar como fallback.
          if (!firstNon404) firstNon404 = signedUrl
        } catch (e) {
          // Timeout o error de red. No bloquear: permitir fallback.
          if (!firstNon404) {
            const signedUrl = generateSignedUrl(bunnyPath, DEMO_EXPIRY_SECONDS)
            if (signedUrl) firstNon404 = signedUrl
          }
          console.warn('[demo-url] Bunny check failed:', (e as Error)?.message || e, 'path:', bunnyPath)
        }
      }
      if (firstNon404) return NextResponse.redirect(firstNon404)
    }

    // 2) Fallback: FTP (Hetzner). Esperamos primer byte para que el reproductor no haga timeout.
    if (isFtpConfigured()) {
      const contentType = getContentType(pathNorm)
      const ftpVariants = unicodePathVariants(pathNorm, 'nfd')
      let lastErr: unknown = null
      for (const ftpPath of ftpVariants) {
        try {
          const stream = await streamFileFromFtpOnceReady(ftpPath, 'video')
          const webStream = Readable.toWeb(stream) as ReadableStream
          return new NextResponse(webStream, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'private, max-age=300',
              'Accept-Ranges': 'bytes',
              'X-Content-Type-Options': 'nosniff',
            },
          })
        } catch (e) {
          lastErr = e
        }
      }
      console.warn('[demo-url] FTP no tuvo el archivo:', (lastErr as Error)?.message || lastErr)
    }

    if (!isFtpConfigured() && !isBunnyConfigured()) {
      const status = getBunnyConfigStatus()
      return NextResponse.json(
        {
          error: 'Demos no disponibles',
          reason: 'no_source',
          message: 'Configura FTP (Hetzner) o Bunny CDN en Render (Environment).',
          missing: status.missing,
          invalid: status.invalid,
          hints: status.hints,
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        error: 'Demo no disponible',
        reason: 'file_not_found',
        path: pathNorm,
        hint: isFtpConfigured()
          ? 'El archivo no está en Bunny. Sube los videos a Bunny Storage o verifica la ruta en Hetzner.'
          : 'Configura FTP (Hetzner) en Render (FTP_HOST, FTP_USER, FTP_PASSWORD) para servir demos desde tu almacenamiento.',
      },
      { status: 503 }
    )
  } catch (e) {
    console.error('[demo-url] Unhandled:', (e as Error)?.message || e)
    return NextResponse.json({ error: 'Demo no disponible' }, { status: 503 })
  }
}
