import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateSignedUrl, isBunnyConfigured } from '@/lib/bunny'
import { isFtpConfigured, streamFileFromFtp, getContentType } from '@/lib/ftp-stream'
import { Readable } from 'stream'

// Prefijo opcional en Bunny (ej. packs/enero-2026). file = Genre/video.mp4 o Banda.zip (raíz o bajo prefijo).
const BUNNY_PACK_PREFIX = (process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || '').replace(/\/$/, '')

const EXPIRY_VIDEO = 3600 // 1 h
const EXPIRY_ZIP = 10800 // 3 h (los ZIP tardan más en bajar)

/**
 * GET /api/download?file=Genre/video.mp4 | Banda.zip
 * Solo usuarios con compras activas. Hace proxy del archivo desde Bunny o FTP
 * con Content-Disposition: attachment para forzar descarga (no abrir en pestaña).
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

    const sanitizedPath = filePath.replace(/\.\./g, '').replace(/^\//, '').trim()
    if (!sanitizedPath) {
      return NextResponse.json({ error: 'Path inválido' }, { status: 400 })
    }

    const isZip = sanitizedPath.toLowerCase().endsWith('.zip')

    const filename = sanitizedPath.split('/').pop() || 'download'
    const contentType = getContentType(sanitizedPath)
    const disposition = `attachment; filename="${filename.replace(/"/g, '\\"')}"`

    if (isBunnyConfigured()) {
      const expiresIn = isZip ? EXPIRY_ZIP : EXPIRY_VIDEO
      const bunnyPath = BUNNY_PACK_PREFIX ? `${BUNNY_PACK_PREFIX}/${sanitizedPath}` : sanitizedPath
      const signedUrl = generateSignedUrl(bunnyPath, expiresIn, process.env.NEXT_PUBLIC_APP_URL)
      try {
        const range = req.headers.get('range') || ''
        const res = await fetch(signedUrl, {
          method: 'GET',
          headers: range ? { Range: range } : {},
        })
        if (res.ok || res.status === 206) {
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
          const headers = new Headers({
            'Content-Type': res.headers.get('content-type') || contentType,
            'Cache-Control': 'private, max-age=' + expiresIn,
            'Content-Disposition': disposition,
            'Accept-Ranges': 'bytes',
          })
          const contentLength = res.headers.get('content-length')
          if (contentLength) headers.set('Content-Length', contentLength)
          if (res.status === 206) {
            const cr = res.headers.get('content-range')
            if (cr) headers.set('Content-Range', cr)
          }
          return new NextResponse(res.body ?? undefined, { status: res.status, headers })
        }
      } catch (e) {
        console.error('download Bunny proxy:', e)
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
              'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
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
            'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
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
