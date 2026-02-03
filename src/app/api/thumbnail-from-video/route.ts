import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignedUrl, isBunnyConfigured, buildBunnyPath } from '@/lib/bunny'
import { uploadFile } from '@/lib/storage/bunny'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const MAX_VIDEO_CHUNK = 12 * 1024 * 1024 // 12 MB para poder extraer frame ~1s
const MAX_CONCURRENT_GENERATIONS = 3 // Evitar saturar el server con muchas peticiones ffmpeg a la vez

const activeGenerations = { count: 0 }
const pathsInProgress = new Set<string>()

function redirectToPlaceholder(req: NextRequest) {
  const artist = req.nextUrl.searchParams.get('artist') || ''
  const title = req.nextUrl.searchParams.get('title') || ''
  return NextResponse.redirect(
    new URL(`/api/placeholder/thumb?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`, req.url)
  )
}


/**
 * GET /api/thumbnail-from-video?path=Genre/Video.mp4
 * 1) Si hay thumbnail en DB → redirige al CDN.
 * 2) Si existe .jpg en Bunny (mismo path que el video) → redirige y guarda en DB.
 * 3) Si no: descarga video, extrae frame con ffmpeg, sube a Bunny, actualiza DB, redirige.
 * Si falla (Bunny no config, sin ffmpeg, error de red) → redirige al placeholder.
 */
export async function GET(req: NextRequest) {
  const pathParam = req.nextUrl.searchParams.get('path')
  if (!pathParam || pathParam.includes('..') || !/\.(mp4|mov|avi|mkv)$/i.test(pathParam)) {
    return NextResponse.redirect(new URL('/api/placeholder/thumb?text=V', req.url))
  }
  const sanitized = pathParam.replace(/^\//, '')
  const pathJpg = sanitized.replace(/\.(mp4|mov|avi|mkv)$/i, '.jpg')

  const tmpDir = os.tmpdir()
  const id = Math.random().toString(36).slice(2, 10)
  const tmpVideo = path.join(tmpDir, `bb-video-${id}.mp4`)
  const tmpThumb = path.join(tmpDir, `bb-thumb-${id}.jpg`)

  try {
    const admin = createAdminClient()

    // 1) Ya tiene thumbnail en DB? Redirigir directo al CDN
    const { data: existing } = await (admin as any)
      .from('videos')
      .select('id, thumbnail_url')
      .eq('file_path', sanitized)
      .limit(1)
      .maybeSingle()
    if (existing?.thumbnail_url) {
      const thumbPath = existing.thumbnail_url.startsWith('http') ? null : existing.thumbnail_url
      if (thumbPath) {
        return NextResponse.redirect(new URL(`/api/thumbnail-cdn?path=${encodeURIComponent(thumbPath)}`, req.url))
      }
      return NextResponse.redirect(existing.thumbnail_url)
    }

    // 2) ¿Existe ya el .jpg en Bunny? Portadas en raíz (Genre/foto.jpg)
    if (isBunnyConfigured()) {
      const bunnyJpgPath = buildBunnyPath(pathJpg, false)
      const jpgSignedUrl = bunnyJpgPath ? generateSignedUrl(bunnyJpgPath, 300) : ''
      const headRes = jpgSignedUrl ? await fetch(jpgSignedUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) }) : { ok: false }
      if (headRes.ok) {
        await (admin as any)
          .from('videos')
          .update({ thumbnail_url: pathJpg, updated_at: new Date().toISOString() })
          .eq('file_path', sanitized)
        return NextResponse.redirect(new URL(`/api/thumbnail-cdn?path=${encodeURIComponent(pathJpg)}`, req.url))
      }
    }

    // Sin Bunny no podemos generar (necesitamos descargar video y subir imagen)
    if (!isBunnyConfigured()) {
      return redirectToPlaceholder(req)
    }

    // 3) Generar con ffmpeg: límite de concurrencia (solo el finally de este bloque limpia pathsInProgress)
    if (pathsInProgress.has(sanitized)) return redirectToPlaceholder(req)
    if (activeGenerations.count >= MAX_CONCURRENT_GENERATIONS) return redirectToPlaceholder(req)
    pathsInProgress.add(sanitized)
    activeGenerations.count += 1

    try {
      const bunnyVideoPath = buildBunnyPath(sanitized, true)
      const signedUrl = bunnyVideoPath ? generateSignedUrl(bunnyVideoPath, 300) : ''
      const res = await fetch(signedUrl, {
        headers: { Range: `bytes=0-${MAX_VIDEO_CHUNK - 1}` },
        signal: AbortSignal.timeout(18000),
      })
      if (!signedUrl) throw new Error('Invalid video path')
      if (!res.ok) throw new Error(`Video fetch: ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      await fs.promises.writeFile(tmpVideo, buf)

      // Extraer frame a 1s (evita segundo 0, que suele ser negro); fallback 0.5s y luego frame 0 si video muy corto
      try {
        await execAsync(
          `ffmpeg -ss 1 -i "${tmpVideo}" -vframes 1 -q:v 2 -y "${tmpThumb}"`,
          { timeout: 15000 }
        )
      } catch {
        try {
          await execAsync(
            `ffmpeg -ss 0.5 -i "${tmpVideo}" -vframes 1 -q:v 2 -y "${tmpThumb}"`,
            { timeout: 15000 }
          )
        } catch {
          await execAsync(
            `ffmpeg -i "${tmpVideo}" -vframes 1 -q:v 2 -y "${tmpThumb}"`,
            { timeout: 15000 }
          )
        }
      }

      if (!fs.existsSync(tmpThumb)) throw new Error('No se generó thumbnail')
      const thumbBuffer = await fs.promises.readFile(tmpThumb)
      const bunnyThumbPath = buildBunnyPath(pathJpg, false)
      const upload = bunnyThumbPath ? await uploadFile(bunnyThumbPath, thumbBuffer) : { success: false, error: 'Invalid path' }
      if (!upload.success) throw new Error(upload.error || 'Upload failed')

      await (admin as any)
        .from('videos')
        .update({ thumbnail_url: pathJpg, updated_at: new Date().toISOString() })
        .eq('file_path', sanitized)

      return NextResponse.redirect(new URL(`/api/thumbnail-cdn?path=${encodeURIComponent(pathJpg)}`, req.url))
    } catch (e) {
      console.warn('thumbnail-from-video:', e)
      return redirectToPlaceholder(req)
    } finally {
      pathsInProgress.delete(sanitized)
      activeGenerations.count = Math.max(0, activeGenerations.count - 1)
      try {
        if (fs.existsSync(tmpVideo)) fs.unlinkSync(tmpVideo)
      } catch {
        // ignore
      }
      try {
        if (fs.existsSync(tmpThumb)) fs.unlinkSync(tmpThumb)
      } catch {
        // ignore
      }
    }
  } catch (e) {
    console.warn('thumbnail-from-video:', e)
    return redirectToPlaceholder(req)
  }
}
