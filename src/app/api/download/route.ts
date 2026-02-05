import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateSignedUrl, isBunnyConfigured, buildBunnyPath } from '@/lib/bunny'
import { isFtpConfigured, streamFileFromFtp, getContentType } from '@/lib/ftp-stream'
import { Readable } from 'stream'

export const dynamic = 'force-dynamic'

const EXPIRY_VIDEO = 3600 // 1 h
const EXPIRY_ZIP = 10800 // 3 h (los ZIP tardan más en bajar)

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
        redirect: '/checkout?pack=enero-2026'
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

    // 1) Prioridad: FTP (Hetzner)
    if (isFtpConfigured()) {
      try {
        const type = isZip ? 'zip' : 'video'
        const stream = await streamFileFromFtp(sanitizedPath, type)
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
        console.warn('[download] FTP no tuvo el archivo, intentando Bunny:', (ftpErr as Error)?.message || ftpErr)
      }
    }

    // 2) Fallback: Bunny CDN
    if (isBunnyConfigured()) {
      const expiresIn = isZip ? EXPIRY_ZIP : EXPIRY_VIDEO
      // ZIP: probar con prefijo y sin prefijo (en algunos setups está en raíz, en otros bajo la carpeta)
      const withPrefix = buildBunnyPath(sanitizedPath, true)
      const noPrefix = buildBunnyPath(sanitizedPath, false)
      const pathVariants = isZip
        ? [...new Set([withPrefix, noPrefix].filter(Boolean))]
        : [withPrefix].filter(Boolean)
      if (pathVariants.length === 0 && sanitizedPath) pathVariants.push(sanitizedPath)

      let signedUrl = ''
      for (const bunnyPath of pathVariants) {
        if (!bunnyPath) continue
        try {
          const url = generateSignedUrl(bunnyPath, expiresIn)
          const headRes = await fetch(url, { method: 'HEAD', cache: 'no-store' })
          if (headRes.ok) {
            signedUrl = url
            break
          }
        } catch {
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

        // Proxy con Content-Disposition: attachment para forzar descarga
        try {
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
          if (bunnyRes.status === 404) {
            console.warn('[download] Bunny GET 404 (HEAD había ok), path:', sanitizedPath)
          }
        } catch (proxyErr) {
          console.error('[download] Proxy Bunny falló:', (proxyErr as Error)?.message || proxyErr)
          return NextResponse.json(
            {
              error: 'Error al descargar',
              message: 'No se pudo obtener el archivo desde el CDN. Intenta de nuevo o descarga por FTP desde tu panel.',
            },
            { status: 503 }
          )
        }
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
