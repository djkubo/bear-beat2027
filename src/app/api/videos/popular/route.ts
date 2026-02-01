import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const DEMOS_ENABLED = true

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDuration(seconds: number): string {
  if (!seconds) return ''
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function buildThumbnailUrl(thumbnailUrlFromDb: string | null, relativePath: string, artist: string | null, title: string | null): string {
  if (thumbnailUrlFromDb) {
    if (thumbnailUrlFromDb.startsWith('http')) return thumbnailUrlFromDb
    return `/api/thumbnail-cdn?path=${encodeURIComponent(thumbnailUrlFromDb)}`
  }
  if (process.env.NODE_ENV === 'production') {
    const q = new URLSearchParams()
    q.set('path', relativePath)
    if (artist) q.set('artist', artist)
    if (title) q.set('title', title)
    return `/api/thumbnail-from-video?${q.toString()}`
  }
  return `/api/thumbnail/${encodeURIComponent(relativePath)}`
}

/**
 * GET /api/videos/popular?pack=enero-2026&limit=10
 * Los 10 videos más descargados (por file_path en downloads). Si no hay descargas, devuelve los primeros 10 por artista.
 */
export async function GET(req: NextRequest) {
  try {
    const packSlug = req.nextUrl.searchParams.get('pack') || 'enero-2026'
    const limit = Math.min(20, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '10', 10)))
    const supabase = await createServerClient()

    const { data: pack } = await supabase.from('packs').select('id').eq('slug', packSlug).single()
    if (!pack) {
      return NextResponse.json({ success: false, error: 'Pack no encontrado' }, { status: 404 })
    }

    let topPaths: string[] = []
    try {
      const { data: downloads } = await supabase
        .from('downloads')
        .select('file_path')
        .eq('pack_id', pack.id)
        .not('file_path', 'is', null)
        .limit(10000)
      const countByPath: Record<string, number> = {}
      for (const row of downloads || []) {
        const p = (row as { file_path: string }).file_path
        if (p) countByPath[p] = (countByPath[p] || 0) + 1
      }
      topPaths = Object.entries(countByPath)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([path]) => path)
    } catch {
      // downloads table puede no existir o no tener file_path
    }

    let videoRows: any[] = []
    if (topPaths.length > 0) {
      const { data } = await supabase
        .from('videos')
        .select('id, title, artist, duration, resolution, file_size, file_path, thumbnail_url, genre_id, key, bpm, genres(name, slug)')
        .eq('pack_id', pack.id)
        .in('file_path', topPaths)
      videoRows = (data || []).sort((a, b) => topPaths.indexOf(a.file_path) - topPaths.indexOf(b.file_path))
    }
    if (videoRows.length === 0) {
      const { data } = await supabase
        .from('videos')
        .select('id, title, artist, duration, resolution, file_size, file_path, thumbnail_url, genre_id, key, bpm, genres(name, slug)')
        .eq('pack_id', pack.id)
        .order('artist')
        .limit(limit)
      videoRows = data || []
    }

    const videos = videoRows.map((row: any) => {
      const genreName = row.genres?.name ?? row.file_path?.split('/')[0] ?? 'Sin género'
      const fileName = row.file_path?.split('/').pop() || row.title || `video-${row.id}`
      const relativePath = row.file_path || `${genreName}/${fileName}`
      const size = Number(row.file_size) || 0
      return {
        id: String(row.id),
        name: fileName,
        displayName: row.artist ? `${row.artist} - ${row.title}` : row.title,
        artist: row.artist || row.title,
        title: row.title,
        type: 'video' as const,
        size,
        sizeFormatted: formatBytes(size),
        path: relativePath,
        genre: genreName,
        thumbnailUrl: buildThumbnailUrl(row.thumbnail_url, relativePath, row.artist, row.title),
        canPreview: DEMOS_ENABLED,
        canDownload: false,
        durationSeconds: row.duration ?? undefined,
        duration: row.duration ? formatDuration(row.duration) : undefined,
        resolution: row.resolution ?? undefined,
        key: row.key ?? undefined,
        bpm: row.bpm ?? undefined,
      }
    })

    return NextResponse.json({
      success: true,
      videos,
    })
  } catch (e) {
    console.error('videos/popular:', e)
    return NextResponse.json({ success: false, error: 'Error al cargar populares' }, { status: 500 })
  }
}
