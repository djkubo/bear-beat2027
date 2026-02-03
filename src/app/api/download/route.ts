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
 * Solo usuarios con compras activas. Servidor solo autentica y redirige 307 a URL firmada de BunnyCDN.
 * Sin lectura de disco ni FTP. Cloud Native.
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

    if (isBunnyConfigured()) {
      const expiresIn = isZip ? EXPIRY_ZIP : EXPIRY_VIDEO
      const bunnyPath = BUNNY_PACK_PREFIX ? `${BUNNY_PACK_PREFIX}/${sanitizedPath}` : sanitizedPath
      const signedUrl = generateSignedUrl(bunnyPath, expiresIn, process.env.NEXT_PUBLIC_APP_URL)
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
      const res = NextResponse.redirect(signedUrl, 307)
      res.headers.set('Cache-Control', 'private, max-age=' + expiresIn)
      return res
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
