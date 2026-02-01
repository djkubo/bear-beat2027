import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateSignedUrl } from '@/lib/storage/bunny'
import fs from 'fs'
import path from 'path'

const VIDEOS_BASE_PATH = process.env.VIDEOS_PATH || path.join(process.cwd(), 'Videos Enero 2026')

// Bunny: prefijo en Storage (ej. packs/enero-2026) — el file viene como Genre/filename.mp4
const BUNNY_PACK_PREFIX = process.env.BUNNY_PACK_PATH_PREFIX || 'packs/enero-2026'
const USE_BUNNY = !!(process.env.BUNNY_CDN_URL && process.env.BUNNY_TOKEN_KEY)

/**
 * GET /api/download?file=genre/filename.mp4&stream=true
 * Solo usuarios con compras activas pueden descargar/ver.
 * Si Bunny está configurado → redirección a URL firmada (producción).
 * Si no → sirve desde disco local (desarrollo).
 * stream=true para reproducción inline, sin él descarga el archivo
 */
export async function GET(req: NextRequest) {
  try {
    const filePath = req.nextUrl.searchParams.get('file')
    const isStream = req.nextUrl.searchParams.get('stream') === 'true'
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 })
    }
    
    // Verificar autenticación y compra
    const supabase = await createServerClient()
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
    
    // Producción: descarga vía Bunny CDN (URL firmada)
    if (USE_BUNNY) {
      const bunnyPath = `${BUNNY_PACK_PREFIX}/${sanitizedPath}`
      const signedUrl = generateSignedUrl(bunnyPath, 3600, process.env.NEXT_PUBLIC_APP_URL)
      return NextResponse.redirect(signedUrl)
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
