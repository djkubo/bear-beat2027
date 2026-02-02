import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSignedDownloadUrl, isBunnyDownloadConfigured } from '@/lib/bunny'
import { generateSignedUrl } from '@/lib/storage/bunny'
import fs from 'fs'
import path from 'path'

const VIDEOS_BASE_PATH = process.env.VIDEOS_PATH || path.join(process.cwd(), 'Videos Enero 2026')

// Prefijo opcional en Bunny (ej. packs/enero-2026). El file viene como Genre/filename.mp4 o Banda.zip (raíz o dentro del prefijo).
const BUNNY_PACK_PREFIX = (process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || '').replace(/\/$/, '')
const USE_BUNNY_LEGACY = !!(process.env.BUNNY_CDN_URL && process.env.BUNNY_TOKEN_KEY)

const EXPIRY_VIDEO = 3600 // 1 h
const EXPIRY_ZIP = 10800 // 3 h (los ZIP tardan más en bajar)

/**
 * GET /api/download?file=genre/filename.mp4 | Banda.zip
 * Solo usuarios con compras activas pueden descargar.
 * Si Bunny está configurado (BUNNY_PULL_ZONE + BUNNY_SECURITY_KEY): 307 redirect a URL firmada del CDN.
 * No lee archivos ni hace fetch al CDN desde el servidor; libera carga en Render.
 * Si no hay Bunny: sirve desde disco local (desarrollo).
 */
export async function GET(req: NextRequest) {
  try {
    const filePath = req.nextUrl.searchParams.get('file')
    const isStream = req.nextUrl.searchParams.get('stream') === 'true'

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
    const isZip = sanitizedPath.toLowerCase().endsWith('.zip')
    const expiresIn = isZip ? EXPIRY_ZIP : EXPIRY_VIDEO

    // Producción: BunnyCDN Token Auth → 307 redirect a URL firmada (sin fs ni fetch desde servidor)
    if (isBunnyDownloadConfigured()) {
      const bunnyPath = BUNNY_PACK_PREFIX ? `${BUNNY_PACK_PREFIX}/${sanitizedPath}` : sanitizedPath
      const signedUrl = getSignedDownloadUrl(bunnyPath, expiresIn)
      if (!signedUrl) {
        return NextResponse.json({ error: 'Bunny CDN no configurado' }, { status: 503 })
      }
      try {
        await supabase.from('downloads').insert({
          user_id: user.id,
          pack_id: purchases[0].pack_id,
          file_path: sanitizedPath,
          download_method: 'web',
        })
      } catch {
        // ignorar si falla (tabla no existe o RLS)
      }
      const res = NextResponse.redirect(signedUrl, 307)
      res.headers.set('Cache-Control', 'private, max-age=3600')
      return res
    }

    // Fallback: Bunny legacy (BUNNY_CDN_URL + BUNNY_TOKEN_KEY)
    if (USE_BUNNY_LEGACY) {
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
      const resLegacy = NextResponse.redirect(signedUrl, 307)
      resLegacy.headers.set('Cache-Control', 'private, max-age=3600')
      return resLegacy
    }
    
    // Desarrollo: servir desde disco
    const fullPath = path.join(VIDEOS_BASE_PATH, sanitizedPath)
    if (!fullPath.startsWith(VIDEOS_BASE_PATH)) {
      return NextResponse.json({ error: 'Path inválido' }, { status: 400 })
    }
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
    }
    
    // Leer el archivo
    const stats = fs.statSync(fullPath)
    const fileName = path.basename(fullPath)
    
    // Soporte para Range requests (video seeking)
    const range = req.headers.get('range')
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1
      const chunksize = (end - start) + 1
      
      const fileStream = fs.createReadStream(fullPath, { start, end })
      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk))
          fileStream.on('end', () => controller.close())
          fileStream.on('error', (err) => controller.error(err))
        },
      })
      
      return new NextResponse(webStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${stats.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': 'video/mp4',
        },
      })
    }
    
    // Stream completo
    const fileStream = fs.createReadStream(fullPath)
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk))
        fileStream.on('end', () => controller.close())
        fileStream.on('error', (err) => controller.error(err))
      },
    })

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'video/mp4',
        // inline para streaming, attachment para descarga
        'Content-Disposition': isStream 
          ? `inline; filename="${encodeURIComponent(fileName)}"` 
          : `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': stats.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      },
    })
    
  } catch (error: any) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Error al descargar' }, { status: 500 })
  }
}
