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

    if (isBunnyConfigured()) {
      const expiresIn = isZip ? EXPIRY_ZIP : EXPIRY_VIDEO
      // Videos: con prefijo (Videos Enero 2026/Genre/video.mp4). ZIPs: en raíz (Genre.zip)
      const bunnyPath = buildBunnyPath(sanitizedPath, !isZip)
      let signedUrl: string
      try {
        signedUrl = bunnyPath ? generateSignedUrl(bunnyPath, expiresIn) : ''
      } catch (e) {
        console.error('[download] Bunny signed URL failed:', (e as Error)?.message || e, 'path:', sanitizedPath)
        signedUrl = ''
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
          // ignorar
        }
        // Redirect: el navegador descarga desde Bunny directamente (evita 502/timeout en Render)
        return NextResponse.redirect(signedUrl, 302)
      }
      // Bunny falló: fallback a FTP si está configurado
      if (isFtpConfigured()) {
        try {
          const type = isZip ? 'zip' : 'video'
          const stream = await streamFileFromFtp(sanitizedPath, type)
          const webStream = Readable.toWeb(stream) as ReadableStream
          const contentType = getContentType(sanitizedPath)
          const filename = sanitizedPath.split('/').pop() || 'download'
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
          console.error('download FTP fallback:', ftpErr)
        }
      }
      const supportUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/contenido` : '/contenido'
      return NextResponse.json(
        {
          error: 'La descarga no está disponible en este momento.',
          message: 'El servidor de descargas no respondió. Por favor intenta más tarde o descarga por FTP desde tu panel. Si el problema continúa, contacta a soporte.',
          supportUrl,
          redirect: '/dashboard',
        },
        { status: 503 }
      )
    }

    if (isFtpConfigured()) {
      try {
        const type = isZip ? 'zip' : 'video'
        const stream = await streamFileFromFtp(sanitizedPath, type)
        const webStream = Readable.toWeb(stream) as ReadableStream
        const contentType = getContentType(sanitizedPath)
        const filename = sanitizedPath.split('/').pop() || 'download'
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
      } catch (e) {
        console.error('download FTP:', e)
        return NextResponse.json(
          { error: 'Error al descargar. Intenta de nuevo o usa FTP.' },
          { status: 502 }
        )
      }
    }

    return NextResponse.json(
      {
        error: 'Descargas no disponibles',
        reason: 'bunny_not_configured',
        message: 'Configura Bunny CDN o FTP (FTP_HOST, FTP_USER, FTP_PASSWORD) en el servidor.',
      },
      { status: 503 }
    )
  } catch (error: unknown) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Error al descargar' }, { status: 500 })
  }
}
