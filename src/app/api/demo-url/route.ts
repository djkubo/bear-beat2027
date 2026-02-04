import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, isBunnyConfigured, buildBunnyPath, getBunnyConfigStatus } from '@/lib/bunny'
import { isFtpConfigured, streamFileFromFtpOnceReady, getContentType } from '@/lib/ftp-stream'

export const dynamic = 'force-dynamic'

const DEMO_EXPIRY_SECONDS = 1800 // 30 min

/**
 * GET /api/demo-url?path=Genre/Video.mp4
 * Prioridad: 1) FTP (Hetzner), 2) Bunny CDN. Los archivos se sirven desde Hetzner si están ahí.
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

    // 1) Prioridad: FTP (Hetzner). Esperamos primer byte para que el reproductor no haga timeout.
    if (isFtpConfigured()) {
      try {
        const stream = await streamFileFromFtpOnceReady(pathNorm, 'video')
        const { Readable } = await import('stream')
        const webStream = Readable.toWeb(stream) as ReadableStream
        const contentType = getContentType(pathNorm)
        return new NextResponse(webStream, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'private, max-age=300',
            'Accept-Ranges': 'bytes',
            'X-Content-Type-Options': 'nosniff',
          },
        })
      } catch (e) {
        console.warn('[demo-url] FTP no tuvo el archivo, intentando Bunny:', (e as Error)?.message || e)
      }
    }

    // 2) Fallback: Bunny CDN (solo si el archivo existe allí; si no, evitamos redirigir a 404)
    if (isBunnyConfigured()) {
      const bunnyPath = buildBunnyPath(pathNorm, true)
      if (bunnyPath) {
        try {
          const signedUrl = generateSignedUrl(bunnyPath, DEMO_EXPIRY_SECONDS)
          if (signedUrl && signedUrl.startsWith('http') && signedUrl.length > 20) {
            const head = await fetch(signedUrl, { method: 'HEAD', cache: 'no-store' })
            if (head.ok) return NextResponse.redirect(signedUrl)
            if (head.status === 404) {
              console.warn('[demo-url] Archivo no existe en Bunny (404), path:', pathNorm)
              // no redirigir a una URL que devolverá 404
            } else {
              // 403 u otro: puede ser que Bunny no permita HEAD; redirigir igual
              return NextResponse.redirect(signedUrl)
            }
          }
        } catch (e) {
          console.warn('[demo-url] Bunny signed URL failed:', (e as Error)?.message || e, 'path:', pathNorm)
        }
      }
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
