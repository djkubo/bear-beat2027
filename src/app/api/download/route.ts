import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'
import { isHetznerWebDAVConfigured, createHetznerReadStream } from '@/lib/storage/hetzner-webdav'
import { isBunnyCDNConfigured, generateSignedUrl } from '@/lib/storage/bunny'
import { isLocalVideos, resolveLocalVideoPath } from '@/lib/storage/videos-source'

/**
 * GET /api/download?file=genre/filename.mp4&stream=true
 * Solo usuarios con compras activas pueden descargar/ver.
 * Si Bunny CDN está configurado → redirect a URL firmada (escala a muchas descargas).
 * Si no → stream desde Hetzner WebDAV (límite ~10 conexiones).
 */
export async function GET(req: NextRequest) {
  try {
    const filePath = req.nextUrl.searchParams.get('file')
    const isStream = req.nextUrl.searchParams.get('stream') === 'true'

    if (!filePath) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado. Inicia sesión.' }, { status: 401 })
    }

    const { data: purchases, error } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)

    if (error || !purchases || purchases.length === 0) {
      return NextResponse.json({
        error: 'No tienes acceso a las descargas. Compra el pack para descargar.',
        redirect: '/checkout?pack=enero-2026'
      }, { status: 403 })
    }

    const sanitizedPath = filePath.replace(/\.\./g, '').replace(/^\//, '')
    const fileName = path.basename(sanitizedPath)

    // Prioridad: Bunny CDN (escala; sin límite de 10 conexiones)
    if (isBunnyCDNConfigured()) {
      const signedUrl = generateSignedUrl(sanitizedPath, 3600) // 1 h
      const res = NextResponse.redirect(signedUrl, 302)
      res.headers.set(
        'Content-Disposition',
        isStream
          ? `inline; filename="${encodeURIComponent(fileName)}"`
          : `attachment; filename="${encodeURIComponent(fileName)}"`
      )
      return res
    }

    // Carpeta local en el servidor
    if (isLocalVideos()) {
      const localPath = resolveLocalVideoPath(sanitizedPath)
      if (!fs.existsSync(localPath) || !fs.statSync(localPath).isFile()) {
        return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
      }
      const readStream = fs.createReadStream(localPath)
      const webStream = new ReadableStream({
        start(controller) {
          readStream.on('data', (chunk: Buffer) => controller.enqueue(chunk))
          readStream.on('end', () => controller.close())
          readStream.on('error', (err) => controller.error(err))
        },
      })
      return new NextResponse(webStream, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': isStream
            ? `inline; filename="${encodeURIComponent(fileName)}"`
            : `attachment; filename="${encodeURIComponent(fileName)}"`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }

    if (!isHetznerWebDAVConfigured()) {
      return NextResponse.json(
        { error: 'Configura VIDEOS_BASE_PATH, Hetzner Storage Box o Bunny CDN en .env para habilitar descargas.' },
        { status: 503 }
      )
    }

    const remotePath = `/${sanitizedPath}`
    const readStream = createHetznerReadStream(remotePath)
    if (!readStream) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
    }
    const webStream = new ReadableStream({
      start(controller) {
        readStream.on('data', (chunk: Buffer) => controller.enqueue(chunk))
        readStream.on('end', () => controller.close())
        readStream.on('error', (err) => controller.error(err))
      },
    })
    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': isStream
          ? `inline; filename="${encodeURIComponent(fileName)}"`
          : `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error: any) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Error al descargar' }, { status: 500 })
  }
}
