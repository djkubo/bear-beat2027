import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const DEMOS_ENABLED = true
const VIDEO_EXT = /\.(mp4|mov|avi|mkv|webm)$/i

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
    const jpgPath = (relativePath || '').replace(VIDEO_EXT, '.jpg')
    return `/api/thumbnail-cdn?path=${encodeURIComponent(jpgPath)}`
  }
  return `/api/thumbnail/${encodeURIComponent(relativePath)}`
}

/**
 * GET /api/videos/last-downloaded
 * Última descarga del usuario (requiere auth). Para mostrar "Última canción descargada" al estilo VideoRemixesPack.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, video: null }, { status: 401 })
    }

    const { data: lastDownload } = await supabase
      .from('downloads')
      .select('file_path, pack_id, downloaded_at')
      .eq('user_id', user.id)
      .not('file_path', 'is', null)
      .order('downloaded_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!lastDownload?.file_path) {
      return NextResponse.json({ success: true, video: null })
    }

    const { data: pack } = await supabase.from('packs').select('id').eq('id', lastDownload.pack_id).single()
    if (!pack) {
      return NextResponse.json({ success: true, video: null })
    }

    const { data: row } = await supabase
      .from('videos')
      .select('id, title, artist, duration, resolution, file_size, file_path, thumbnail_url, genre_id, key, bpm, genres(name, slug)')
      .eq('pack_id', pack.id)
      .eq('file_path', lastDownload.file_path)
      .single()

    if (!row) {
      return NextResponse.json({ success: true, video: null })
    }

    const genreName = (row as any).genres?.name ?? (row as any).file_path?.split('/')[0] ?? 'Sin género'
    const fileName = (row as any).file_path?.split('/').pop() || (row as any).title || `video-${row.id}`
    const relativePath = (row as any).file_path || `${genreName}/${fileName}`
    const size = Number((row as any).file_size) || 0

    const video = {
      id: String(row.id),
      name: fileName,
      displayName: (row as any).artist ? `${(row as any).artist} - ${(row as any).title}` : (row as any).title,
      artist: (row as any).artist || (row as any).title,
      title: (row as any).title,
      type: 'video' as const,
      size,
      sizeFormatted: formatBytes(size),
      path: relativePath,
      genre: genreName,
      thumbnailUrl: buildThumbnailUrl((row as any).thumbnail_url, relativePath, (row as any).artist, (row as any).title),
      canPreview: DEMOS_ENABLED,
      canDownload: true,
      durationSeconds: (row as any).duration ?? undefined,
      duration: (row as any).duration ? formatDuration((row as any).duration) : undefined,
      resolution: (row as any).resolution ?? undefined,
      key: (row as any).key ?? undefined,
      bpm: (row as any).bpm ?? undefined,
      downloadedAt: lastDownload.downloaded_at,
    }

    return NextResponse.json({ success: true, video })
  } catch (e) {
    console.error('videos/last-downloaded:', e)
    return NextResponse.json({ success: false, video: null }, { status: 500 })
  }
}
