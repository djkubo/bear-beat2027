import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignedUrl, uploadFile } from '@/lib/storage/bunny'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const BUNNY_PACK_PREFIX = process.env.BUNNY_PACK_PATH_PREFIX || 'packs/enero-2026'
const MAX_VIDEO_CHUNK = 12 * 1024 * 1024 // 12 MB para poder extraer frame ~1s

/**
 * GET /api/thumbnail-from-video?path=Genre/Video.mp4
 * Descarga un trozo del video desde Bunny, extrae un frame con ffmpeg,
 * sube la imagen a Bunny Storage y actualiza thumbnail_url en la DB.
 * Luego redirige a la imagen. Si falla (sin ffmpeg, error de red), redirige al placeholder.
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

    // Ya tiene thumbnail en DB? Redirigir directo al CDN
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

    const signedUrl = generateSignedUrl(`${BUNNY_PACK_PREFIX}/${sanitized}`, 300)
    const res = await fetch(signedUrl, {
      headers: { Range: `bytes=0-${MAX_VIDEO_CHUNK - 1}` },
      signal: AbortSignal.timeout(25000),
    })
    if (!res.ok) throw new Error(`Video fetch: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await fs.promises.writeFile(tmpVideo, buf)

    // Extraer frame a 1s (o primer frame si falla)
    try {
      await execAsync(
        `ffmpeg -ss 1 -i "${tmpVideo}" -vframes 1 -q:v 2 -y "${tmpThumb}"`,
        { timeout: 15000 }
      )
    } catch {
      await execAsync(
        `ffmpeg -i "${tmpVideo}" -vframes 1 -q:v 2 -y "${tmpThumb}"`,
        { timeout: 15000 }
      )
    }

    if (!fs.existsSync(tmpThumb)) throw new Error('No se generó thumbnail')
    const thumbBuffer = await fs.promises.readFile(tmpThumb)
    const bunnyThumbPath = `${BUNNY_PACK_PREFIX}/${pathJpg}`
    const upload = await uploadFile(bunnyThumbPath, thumbBuffer)
    if (!upload.success) throw new Error(upload.error || 'Upload failed')

    await (admin as any)
      .from('videos')
      .update({ thumbnail_url: pathJpg, updated_at: new Date().toISOString() })
      .eq('file_path', sanitized)

    return NextResponse.redirect(new URL(`/api/thumbnail-cdn?path=${encodeURIComponent(pathJpg)}`, req.url))
  } catch (e) {
    console.warn('thumbnail-from-video:', e)
    const artist = req.nextUrl.searchParams.get('artist') || ''
    const title = req.nextUrl.searchParams.get('title') || ''
    return NextResponse.redirect(
      new URL(`/api/placeholder/thumb?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`, req.url)
    )
  } finally {
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
}
