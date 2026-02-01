import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { isHetznerWebDAVConfigured, getHetznerFileBuffer, streamHetznerToTempFile } from '@/lib/storage/hetzner-webdav'
import { isLocalVideos, resolveLocalVideoPath } from '@/lib/storage/videos-source'

const execAsync = promisify(exec)

// ==========================================
// API DE THUMBNAILS - Carpeta local o Hetzner: imagen con mismo nombre o frame del video
// ==========================================

const THUMBNAILS_CACHE_PATH = path.join(process.cwd(), 'public', 'thumbnails-cache')

if (typeof fs.existsSync === 'function' && !fs.existsSync(THUMBNAILS_CACHE_PATH)) {
  try { fs.mkdirSync(THUMBNAILS_CACHE_PATH, { recursive: true }) } catch (_) {}
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    const videoPath = decodeURIComponent(pathSegments.join('/'))
    const dir = path.dirname(videoPath)
    const base = path.basename(videoPath, path.extname(videoPath))

    // Origen local: imagen junto al video o generar con ffmpeg desde archivo local
    if (isLocalVideos()) {
      const localVideoPath = resolveLocalVideoPath(videoPath)
      if (!fs.existsSync(localVideoPath)) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
        return NextResponse.redirect(`${appUrl}/favicon.png`)
      }
      const localDir = path.dirname(localVideoPath)
      for (const ext of ['.jpg', '.jpeg', '.png']) {
        const imagePath = path.join(localDir, base + ext)
        if (fs.existsSync(imagePath)) {
          const imageBuffer = fs.readFileSync(imagePath)
          const contentType = ext === '.png' ? 'image/png' : 'image/jpeg'
          return new NextResponse(imageBuffer, {
            headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' },
          })
        }
      }
      const thumbnailName = videoPath.replace(/[\/\\]/g, '_').replace(/\.(mp4|mov|avi|mkv)$/i, '.jpg')
      const thumbnailPath = path.join(THUMBNAILS_CACHE_PATH, thumbnailName)
      if (fs.existsSync(thumbnailPath)) {
        const imageBuffer = fs.readFileSync(thumbnailPath)
        return new NextResponse(imageBuffer, {
          headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000' },
        })
      }
      try {
        await execAsync(
          `ffmpeg -i "${localVideoPath}" -ss 00:00:05 -vframes 1 -vf "scale=480:-1" -q:v 2 "${thumbnailPath}" -y`,
          { timeout: 30000 }
        )
      } catch {
        await execAsync(
          `ffmpeg -i "${localVideoPath}" -ss 00:00:01 -vframes 1 -vf "scale=480:-1" -q:v 2 "${thumbnailPath}" -y`,
          { timeout: 30000 }
        )
      }
      if (fs.existsSync(thumbnailPath)) {
        const imageBuffer = fs.readFileSync(thumbnailPath)
        return new NextResponse(imageBuffer, {
          headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000' },
        })
      }
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
      return NextResponse.redirect(`${appUrl}/favicon.png`)
    }

    if (!isHetznerWebDAVConfigured()) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
      return NextResponse.redirect(`${appUrl}/favicon.png`)
    }

    // 1) Imagen con mismo nombre en Hetzner
    for (const ext of ['.jpg', '.jpeg', '.png']) {
      const imagePath = dir ? `${dir}/${base}${ext}` : `${base}${ext}`
      const buf = await getHetznerFileBuffer(imagePath)
      if (buf && buf.length > 0) {
        const contentType = ext === '.png' ? 'image/png' : 'image/jpeg'
        return new NextResponse(buf, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
          },
        })
      }
    }

    // 2) Cache local (thumbnail generado antes)
    const thumbnailName = videoPath.replace(/[\/\\]/g, '_').replace(/\.(mp4|mov|avi|mkv)$/i, '.jpg')
    const thumbnailPath = path.join(THUMBNAILS_CACHE_PATH, thumbnailName)
    if (fs.existsSync(thumbnailPath)) {
      const imageBuffer = fs.readFileSync(thumbnailPath)
      return new NextResponse(imageBuffer, {
        headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000' },
      })
    }

    // 3) Descargar inicio del video desde Hetzner y generar thumbnail con ffmpeg
    let tempPath: string | null = null
    try {
      const result = await streamHetznerToTempFile(videoPath)
      if (result && result.bytesRead > 0) {
        tempPath = result.tempPath
        try {
          await execAsync(
            `ffmpeg -i "${tempPath}" -ss 00:00:05 -vframes 1 -vf "scale=480:-1" -q:v 2 "${thumbnailPath}" -y`,
            { timeout: 30000 }
          )
        } catch {
          await execAsync(
            `ffmpeg -i "${tempPath}" -ss 00:00:01 -vframes 1 -vf "scale=480:-1" -q:v 2 "${thumbnailPath}" -y`,
            { timeout: 30000 }
          )
        }
        if (fs.existsSync(thumbnailPath)) {
          const imageBuffer = fs.readFileSync(thumbnailPath)
          return new NextResponse(imageBuffer, {
            headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000' },
          })
        }
      }
    } finally {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    return NextResponse.redirect(`${appUrl}/favicon.png`)
  } catch (error: any) {
    console.error('Error generating thumbnail:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
