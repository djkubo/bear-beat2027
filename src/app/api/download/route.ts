import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateSignedUrl, isBunnyConfigured, buildBunnyPath } from '@/lib/bunny'
import { isFtpConfigured, streamFileFromFtpOnceReady, getContentType } from '@/lib/ftp-stream'
import { unicodePathVariants } from '@/lib/unicode-path'
import { Readable } from 'stream'

export const dynamic = 'force-dynamic'

const EXPIRY_VIDEO = 3600 // 1 h
const EXPIRY_ZIP = 10800 // 3 h (los ZIP tardan más en bajar)
const LEGACY_VIDEOS_FOLDER = 'Videos Enero 2026'

/** Nombre de archivo seguro para Content-Disposition (evita caracteres problemáticos). */
function safeDownloadFilename(name: string): string {
  const base = (name || 'download').replace(/[\x00-\x1f\x7f"\\<>|*?]/g, '').trim() || 'download'
  return base.length > 200 ? base.slice(0, 200) : base
}

/**
 * GET /api/download?file=Genre/video.mp4 | Banda.zip
 * Solo usuarios con compras activas.
 * Bunny: redirige (302) a URL firmada para que el navegador descargue desde el CDN (sin timeout).
 * FTP: stream del archivo con Content-Disposition: attachment.
 */
export async function GET(req: NextRequest) {
  try {
    const filePath = req.nextUrl.searchParams.get('file')

    if (!filePath) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    let { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) session = { user } as typeof session
    }
    const user = session?.user
    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado. Inicia sesión.', loginUrl: '/login' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    const { data: purchases, error } = await supabase
      .from('purchases')
      .select('id, pack_id')
      .eq('user_id', user.id)

    if (error || !purchases || purchases.length === 0) {
      return NextResponse.json({
        error: 'No tienes acceso a las descargas. Compra el pack para descargar.',
        redirect: '/checkout'
      }, { status: 403 })
    }

    let sanitizedPath: string
    try {
      sanitizedPath = decodeURIComponent(filePath || '').replace(/\.\./g, '').replace(/^\//, '').trim()
    } catch {
      sanitizedPath = (filePath || '').replace(/\.\./g, '').replace(/^\//, '').trim()
    }
    sanitizedPath = sanitizedPath.replace(/^Videos Enero 2026\/?/i, '').trim() || sanitizedPath
    if (!sanitizedPath) {
      return NextResponse.json({ error: 'Path inválido' }, { status: 400 })
    }

    const isZip = sanitizedPath.toLowerCase().endsWith('.zip')
    const streamInline = req.nextUrl.searchParams.get('stream') === 'true' && !isZip

    const filename = safeDownloadFilename(sanitizedPath.split('/').pop() || 'download')
    const contentType = getContentType(sanitizedPath)
    const disposition = streamInline
      ? 'inline'
      : `attachment; filename="${filename.replace(/"/g, '\\"')}"`

    // 1) Prioridad: Bunny CDN. Probar varias rutas típicas (con/sin prefijo y legacy "Videos Enero 2026/").
    if (isBunnyConfigured()) {
      const expiresIn = isZip ? EXPIRY_ZIP : EXPIRY_VIDEO
      const pathUnicodeVariants = unicodePathVariants(sanitizedPath, 'nfc')

      // Orden heurístico:
      // - ZIP suele estar en raíz o bajo prefijo (packs o carpeta); video suele estar bajo prefijo.
      const rawVariants = pathUnicodeVariants.flatMap((p) => {
        const legacyPath = `${LEGACY_VIDEOS_FOLDER}/${p}`.replace(/\/+/g, '/')
        const withPrefix = buildBunnyPath(p, true)
        const noPrefix = buildBunnyPath(p, false)
        const legacyWithPrefix = buildBunnyPath(legacyPath, true)
        const legacyNoPrefix = buildBunnyPath(legacyPath, false)
        return isZip
          ? [noPrefix, withPrefix, legacyNoPrefix, legacyWithPrefix]
          : [withPrefix, noPrefix, legacyWithPrefix, legacyNoPrefix]
      })
      const pathVariants = Array.from(new Set(rawVariants.filter(Boolean)))

      let signedUrl = ''
      let signedUrlMaybe = ''
      for (const bunnyPath of pathVariants) {
        if (!bunnyPath) continue
        try {
          const url = generateSignedUrl(bunnyPath, expiresIn)
          const headRes = await fetch(url, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(5000) })
          if (headRes.ok) {
            signedUrl = url
            break
          }
          if (headRes.status !== 404 && !signedUrlMaybe) signedUrlMaybe = url
        } catch {
          if (!signedUrlMaybe) {
            try {
              signedUrlMaybe = generateSignedUrl(bunnyPath, expiresIn)
            } catch {
              // ignore
            }
          }
          continue
        }
      }

      if (signedUrl) {
        try {
          await supabase.from('downloads').insert({
            user_id: user.id,
            pack_id: purchases[0].pack_id,
            file_path: sanitizedPath,
            download_method: 'web',
          })
        } catch {
          // ignorar si la tabla no existe
        }

        // ZIP: redirigir a Bunny (evita 502 por timeout/memoria al hacer proxy de archivos grandes)
        if (isZip) return NextResponse.redirect(signedUrl, 302)

        // Video: proxy con Content-Disposition: attachment para forzar descarga (no abrir en pestaña)
        try {
          // No usamos timeout aquí: es un stream grande y el cliente puede tardar minutos descargando.
          const bunnyRes = await fetch(signedUrl, { cache: 'no-store' })
          if (bunnyRes.ok && bunnyRes.body) {
            return new NextResponse(bunnyRes.body, {
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'private, max-age=3600',
                'Content-Disposition': disposition,
                'X-Content-Type-Options': 'nosniff',
                ...(bunnyRes.headers.get('content-length') && {
                  'Content-Length': bunnyRes.headers.get('content-length')!,
                }),
              },
            })
          }
          // Si falló el proxy, intentar FTP más abajo; si no hay, redirigir a Bunny.
          console.warn('[download] Bunny proxy failed:', bunnyRes.status, 'path:', sanitizedPath)
          if (!isFtpConfigured()) return NextResponse.redirect(signedUrl, 302)
        } catch (proxyErr) {
          console.warn('[download] Proxy Bunny falló:', (proxyErr as Error)?.message || proxyErr, 'path:', sanitizedPath)
          if (!isFtpConfigured()) return NextResponse.redirect(signedUrl, 302)
        }
      } else if (signedUrlMaybe && !isFtpConfigured()) {
        // HEAD no confirmó pero tampoco fue 404; si no hay FTP, al menos intentar con Bunny.
        return NextResponse.redirect(signedUrlMaybe, 302)
      }
    }

    // 2) Fallback: FTP (Hetzner)
    if (isFtpConfigured()) {
      const typeVariants: Array<'video' | 'zip'> = isZip ? ['zip', 'video'] : ['video']
      for (const type of typeVariants) {
        const ftpVariants = unicodePathVariants(sanitizedPath, type === 'zip' ? 'nfc' : 'nfd')
        let lastErr: unknown = null
        for (const ftpPath of ftpVariants) {
          try {
            const stream = await streamFileFromFtpOnceReady(ftpPath, type)
            const webStream = Readable.toWeb(stream) as ReadableStream
            try {
              await supabase.from('downloads').insert({
                user_id: user.id,
                pack_id: purchases[0].pack_id,
                file_path: sanitizedPath,
                download_method: 'web',
              })
            } catch {
              // ignorar
            }
            return new NextResponse(webStream, {
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'private, max-age=3600',
                'Content-Disposition': disposition,
                'X-Content-Type-Options': 'nosniff',
              },
            })
          } catch (ftpErr) {
            lastErr = ftpErr
          }
        }
        console.warn('[download] FTP no tuvo el archivo:', (lastErr as Error)?.message || lastErr)
        // probar siguiente type (ej. ZIP en raíz vs dentro de FTP_BASE)
      }
    }

    const supportUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/contenido` : '/contenido'
    if (isFtpConfigured() || isBunnyConfigured()) {
      return NextResponse.json(
        {
          error: 'La descarga no está disponible en este momento.',
          message: 'El archivo no se encontró en FTP (Hetzner) ni en Bunny. Intenta más tarde o descarga por FTP desde tu panel.',
          supportUrl,
          redirect: '/dashboard',
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        error: 'Descargas no disponibles',
        reason: 'no_source',
        message: 'Configura FTP (Hetzner) o Bunny CDN (FTP_HOST, FTP_USER, FTP_PASSWORD o BUNNY_*) en Render.',
      },
      { status: 503 }
    )
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('Download error:', err.message, err.stack)
    return NextResponse.json(
      {
        error: 'Error al descargar',
        message: err.message || 'Error interno. Revisa los logs en Render o descarga por FTP desde tu panel.',
      },
      { status: 500 }
    )
  }
}
