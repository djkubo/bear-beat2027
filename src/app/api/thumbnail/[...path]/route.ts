import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

// ==========================================
// API DE THUMBNAILS - Genera portadas de videos
// Usa ffmpeg para extraer un frame del video
// ==========================================

const VIDEOS_BASE_PATH = process.env.VIDEOS_PATH || path.join(process.cwd(), 'Videos Enero 2026')
const THUMBNAILS_CACHE_PATH = path.join(process.cwd(), 'public', 'thumbnails-cache')

// Asegurar que existe la carpeta de cache
if (!fs.existsSync(THUMBNAILS_CACHE_PATH)) {
  fs.mkdirSync(THUMBNAILS_CACHE_PATH, { recursive: true })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    const videoPath = decodeURIComponent(pathSegments.join('/'))
    const fullVideoPath = path.join(VIDEOS_BASE_PATH, videoPath)

    // Verificar que el video existe
    if (!fs.existsSync(fullVideoPath)) {
      return NextResponse.json({ error: 'Video no encontrado' }, { status: 404 })
    }

    // Generar nombre único para el thumbnail
    const thumbnailName = videoPath
      .replace(/[\/\\]/g, '_')
      .replace(/\.(mp4|mov|avi|mkv)$/i, '.jpg')
    const thumbnailPath = path.join(THUMBNAILS_CACHE_PATH, thumbnailName)

    // Si ya existe el thumbnail, servirlo
    if (fs.existsSync(thumbnailPath)) {
      const imageBuffer = fs.readFileSync(thumbnailPath)
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000', // Cache 1 año
        },
      })
    }

    // Generar thumbnail con ffmpeg
    // Extrae un frame del segundo 5 del video (o del inicio si es más corto)
    try {
      await execAsync(
        `ffmpeg -i "${fullVideoPath}" -ss 00:00:05 -vframes 1 -vf "scale=480:-1" -q:v 2 "${thumbnailPath}" -y`,
        { timeout: 30000 }
      )
    } catch (ffmpegError) {
      // Si falla en el segundo 5, intentar desde el inicio
      try {
        await execAsync(
          `ffmpeg -i "${fullVideoPath}" -ss 00:00:01 -vframes 1 -vf "scale=480:-1" -q:v 2 "${thumbnailPath}" -y`,
          { timeout: 30000 }
        )
      } catch {
        // Si ffmpeg no está disponible, devolver placeholder
        return NextResponse.redirect(new URL('/placeholder-video.jpg', req.url))
      }
    }

    // Verificar que se creó el thumbnail
    if (!fs.existsSync(thumbnailPath)) {
      return NextResponse.json({ error: 'No se pudo generar thumbnail' }, { status: 500 })
    }

    // Servir el thumbnail generado
    const imageBuffer = fs.readFileSync(thumbnailPath)
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
      },
    })

  } catch (error: any) {
    console.error('Error generating thumbnail:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
