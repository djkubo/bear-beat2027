import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// ==========================================
// API DE VIDEOS - Estructura + Metadata real
// ==========================================

/** Evitar caché: tras sync FTP los números deben actualizarse de inmediato */
export const dynamic = 'force-dynamic'

const VIDEOS_BASE_PATH = process.env.VIDEOS_PATH || path.join(process.cwd(), 'Videos Enero 2026')
const DEMOS_ENABLED = true
const VIDEO_EXT = /\.(mp4|mov|avi|mkv|webm)$/i

function normalizeTextNfc(input: string): string {
  const s = String(input ?? '')
  try {
    return s.normalize('NFC').trim()
  } catch {
    return s.trim()
  }
}

function slugifyGenreId(input: string): string {
  const base = normalizeTextNfc(input)
  if (!base) return ''
  try {
    return base
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  } catch {
    return base
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9-]+/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
}

interface VideoMetadata {
  duration: string
  durationSeconds: number
  resolution: string
  width: number
  height: number
  bitrate: string
  codec: string
}

interface VideoFile {
  id: string
  name: string
  displayName: string
  artist: string
  title: string
  key?: string
  bpm?: string
  type: 'video'
  size: number
  sizeFormatted: string
  path: string
  genre: string
  thumbnailUrl: string
  canPreview: boolean
  canDownload: boolean
  // Metadata real
  duration?: string
  durationSeconds?: number
  resolution?: string
}

interface GenreFolder {
  id: string
  name: string
  type: 'folder'
  videoCount: number
  totalSize: number
  totalSizeFormatted: string
  totalDuration?: string
  videos: VideoFile[]
}

/** URLs relativas: el navegador resuelve contra el origen actual (funciona en cualquier dominio sin hardcodear). */
function getBaseUrlForThumbnails(): string {
  return ''
}

/** Construye URL de portada. Con thumbnail en DB → thumbnail-cdn. Sin thumbnail en DB: por convención usa .jpg junto al video (Bunny o FTP fallback). Local: thumbnail desde disco. */
function buildThumbnailUrl(
  thumbnailUrlFromDb: string | null,
  relativePath: string,
  artist: string | null,
  title: string | null,
  baseUrl: string
): string {
  let urlPath: string
  if (thumbnailUrlFromDb) {
    if (thumbnailUrlFromDb.startsWith('http://') || thumbnailUrlFromDb.startsWith('https://')) {
      return thumbnailUrlFromDb
    }
    urlPath = `/api/thumbnail-cdn?path=${encodeURIComponent(thumbnailUrlFromDb)}`
  } else if (process.env.NODE_ENV === 'production') {
    // Sin portada en DB: usar la convención "mismo nombre .jpg" (rápido y evita depender de ffmpeg en prod)
    const jpgPath = (relativePath || '').replace(VIDEO_EXT, '.jpg')
    urlPath = `/api/thumbnail-cdn?path=${encodeURIComponent(jpgPath)}`
  } else {
    urlPath = `/api/thumbnail/${encodeURIComponent(relativePath)}`
  }
  // Rutas internas /api/placeholder y /api/thumbnail*: siempre relativas (baseUrl debe ser '' en cliente/servidor).
  return baseUrl ? `${baseUrl}${urlPath}` : urlPath
}

/**
 * Ruta ligera: solo conteos + 6 videos de preview (para landing). Evita cargar 1000+ filas y construir thumbnails.
 */
async function getStatsAndPreview(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  packId: string,
  hasAccess: boolean,
  baseUrl: string
): Promise<{ packName: string; totalVideos: number; totalSize: number; genreCount: number; totalPurchases: number; previewGenres: GenreFolder[] }> {
  const { data: pack } = await supabase.from('packs').select('id, name').eq('slug', packId).single()
  if (!pack) return { packName: packId, totalVideos: 0, totalSize: 0, genreCount: 0, totalPurchases: 0, previewGenres: [] }

  const [videosRes, purchasesRes] = await Promise.all([
    supabase.from('videos').select('*', { count: 'exact', head: true }).eq('pack_id', pack.id),
    supabase.from('purchases').select('*', { count: 'exact', head: true }).eq('pack_id', pack.id),
  ])
  const totalVideos = videosRes.count ?? 0
  const totalPurchasesCount = purchasesRes.count ?? 0

  let totalSize = 0
  const byGenre: Record<string, { id: string; name: string; count: number; size: number }> = {}
  const PAGE_SIZE = 1000
  let offset = 0
  let hasMore = true
  while (hasMore) {
    const { data: page } = await supabase
      .from('videos')
      .select('file_size, file_path')
      .eq('pack_id', pack.id)
      .range(offset, offset + PAGE_SIZE - 1)
    if (!page?.length) break
    for (const row of page) {
      const size = Number(row.file_size) || 0
      totalSize += size
      const folder = normalizeTextNfc(String(row.file_path || '').split('/')[0] || 'Sin género')
      const genreId = slugifyGenreId(folder) || 'sin-genero'
      if (!byGenre[genreId]) byGenre[genreId] = { id: genreId, name: folder || 'Sin género', count: 0, size: 0 }
      byGenre[genreId].count += 1
      byGenre[genreId].size += size
    }
    hasMore = page.length === PAGE_SIZE
    offset += PAGE_SIZE
    if (offset >= 10000) break
  }

  const { data: previewRows } = await supabase
    .from('videos')
    .select('id, title, artist, duration, resolution, file_size, file_path, thumbnail_url, genre_id, key, bpm, genres(name, slug)')
    .eq('pack_id', pack.id)
    .order('artist')
    .limit(6)

  // Supabase puede devolver genres como objeto o como array según la relación
  const previewVideos: VideoFile[] = (previewRows || []).map((row: any) => {
    const genreObj = Array.isArray(row.genres) ? row.genres[0] : row.genres
    const folderFromPath = row.file_path?.split('/')[0]
    const genreName = genreObj?.name ?? folderFromPath ?? 'Sin género'
    const genreSlug = (genreObj?.slug ?? genreName.toLowerCase().replace(/\s+/g, '-').replace(/ñ/g, 'n')) as string
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
      thumbnailUrl: buildThumbnailUrl(row.thumbnail_url, relativePath, row.artist, row.title, baseUrl),
      canPreview: DEMOS_ENABLED,
      canDownload: hasAccess,
      durationSeconds: row.duration ?? undefined,
      duration: row.duration ? formatDuration(row.duration) : undefined,
      resolution: row.resolution ?? undefined,
      key: row.key ?? undefined,
      bpm: row.bpm ?? undefined,
    }
  })

  // Mostrar géneros reales por carpeta/file_path (source of truth para el catálogo).
  // Esto evita "carpetas 0" cuando la tabla `genres` no coincide con el almacenamiento.
  const marqueeGenres: GenreFolder[] = Object.values(byGenre)
    .filter((g) => g.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((g) => ({
      id: g.id,
      name: g.name,
      type: 'folder' as const,
      videoCount: g.count,
      totalSize: g.size,
      totalSizeFormatted: formatBytes(g.size),
      videos: [],
    }))
  const previewGenres: GenreFolder[] = previewVideos.length
    ? [{
        id: 'preview',
        name: 'Preview',
        type: 'folder' as const,
        videoCount: previewVideos.length,
        totalSize: previewVideos.reduce((s, v) => s + v.size, 0),
        totalSizeFormatted: formatBytes(previewVideos.reduce((s, v) => s + v.size, 0)),
        videos: previewVideos,
      }]
    : []

  return {
    packName: pack.name || packId,
    totalVideos,
    totalSize,
    genreCount: marqueeGenres.length,
    totalPurchases: totalPurchasesCount,
    previewGenres: [...marqueeGenres, ...previewGenres],
  }
}

/**
 * GET /api/videos
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const packId = searchParams.get('pack') || 'enero-2026'
    const genre = searchParams.get('genre')
    const withMetadata = searchParams.get('metadata') === 'true'
    const statsOnly = searchParams.get('statsOnly') === '1'

    // Verificar acceso del usuario
    let hasAccess = false
    let userId: string | null = null
    let userName: string | null = null
    let userEmail: string | null = null
    const supabase = await createServerClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id || null
      userEmail = user?.email || null

      if (user) {
        // Buscar nombre del usuario
        const { data: userProfile } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single()

        userName = userProfile?.name || user.email?.split('@')[0] || null

        // Buscar si tiene alguna compra
        const { data: purchases, error } = await supabase
          .from('purchases')
          .select('id, pack_id')
          .eq('user_id', user.id)

        if (!error && purchases && purchases.length > 0) {
          hasAccess = true
          console.log('Usuario tiene acceso:', user.email, 'Compras:', purchases.length)
        }
      }
    } catch (e) {
      console.log('Error verificando acceso:', e)
    }

    const baseUrl = getBaseUrlForThumbnails()

    if (statsOnly) {
      // Estructura espejo: géneros = carpetas del servidor (sync FTP → DB). Todas las carpetas se listan aquí.
      const stats = await getStatsAndPreview(supabase, packId, hasAccess, baseUrl)
      const res = NextResponse.json({
        success: true,
        pack: {
          id: packId,
          name: stats.packName || packId,
          totalVideos: stats.totalVideos,
          totalSize: stats.totalSize,
          totalSizeFormatted: formatBytes(stats.totalSize),
          genreCount: stats.genreCount,
          totalPurchases: stats.totalPurchases,
        },
        genres: stats.previewGenres,
        userId,
        userName,
        userEmail,
        hasAccess,
        userAccess: {
          isAuthenticated: !!userId,
          hasPurchased: hasAccess,
          canPreview: DEMOS_ENABLED,
          canDownload: hasAccess,
        },
      })
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      res.headers.set('Pragma', 'no-cache')
      return res
    }

    // En producción (Render) OBLIGATORIAMENTE solo DB; en local, DB si USE_VIDEOS_FROM_DB o no hay carpeta
    let structure: GenreFolder[]
    if (process.env.NODE_ENV === 'production') {
      structure = await readVideoStructureFromDb(supabase, packId, hasAccess, baseUrl)
    } else if (process.env.USE_VIDEOS_FROM_DB === 'true' || !fs.existsSync(VIDEOS_BASE_PATH)) {
      structure = await readVideoStructureFromDb(supabase, packId, hasAccess, baseUrl)
    } else {
      structure = await readVideoStructure(VIDEOS_BASE_PATH, hasAccess, withMetadata)
    }

    const filteredGenreId = genre ? slugifyGenreId(genre) : null
    const filtered = filteredGenreId
      ? structure.filter((g) => g.id === filteredGenreId)
      : structure

    const totalVideos = structure.reduce((sum, g) => sum + g.videoCount, 0)
    const totalSize = structure.reduce((sum, g) => sum + g.totalSize, 0)

    let totalPurchases = 0
    let packName = packId
    try {
      const { data: packRow } = await supabase.from('packs').select('id, name').eq('slug', packId).single()
      if (packRow) {
        packName = packRow.name || packName
        const { count } = await supabase.from('purchases').select('*', { count: 'exact', head: true }).eq('pack_id', packRow.id)
        totalPurchases = count ?? 0
      }
    } catch {
      // ignore
    }

    const res = NextResponse.json({
      success: true,
      pack: {
        id: packId,
        name: packName,
        totalVideos,
        totalSize,
        totalSizeFormatted: formatBytes(totalSize),
        genreCount: structure.length,
        totalPurchases
      },
      genres: filtered,
      // Info del usuario para el frontend
      userId,
      userName,
      userEmail,
      hasAccess,
      userAccess: {
        isAuthenticated: !!userId,
        hasPurchased: hasAccess,
        canPreview: DEMOS_ENABLED,
        canDownload: hasAccess
      }
    })
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    res.headers.set('Pragma', 'no-cache')
    return res

  } catch (error: any) {
    console.error('Error reading videos:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * Lee estructura desde Supabase (producción: no hay carpeta local)
 */
async function readVideoStructureFromDb(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  packSlug: string,
  hasAccess: boolean,
  baseUrl: string
): Promise<GenreFolder[]> {
  try {
    const { data: pack } = await supabase.from('packs').select('id, name').eq('slug', packSlug).single()
    if (!pack) {
      console.warn('Pack not found:', packSlug)
      return []
    }

    // Supabase limita a 1000 filas por petición; paginar para traer todos los videos del pack
    const PAGE_SIZE = 1000
    const videosRows: any[] = []
    let offset = 0
    let hasMore = true
    while (hasMore) {
      const { data: page, error } = await supabase
        .from('videos')
        .select('id, title, artist, duration, resolution, file_size, file_path, thumbnail_url, genre_id, key, bpm, genres(name, slug)')
        .eq('pack_id', pack.id)
        .order('artist')
        .range(offset, offset + PAGE_SIZE - 1)
      if (error) {
        console.error('Error fetching videos from DB:', error)
        return []
      }
      if (!page?.length) break
      videosRows.push(...page)
      hasMore = page.length === PAGE_SIZE
      offset += PAGE_SIZE
      if (videosRows.length >= 10000) break
    }

    if (!videosRows?.length) {
      // Sin videos en DB: devolver géneros con lista vacía para que la página muestre al menos los géneros
      const { data: genresRows } = await supabase.from('genres').select('id, name, slug').order('name')
      return (genresRows || []).map((g) => ({
        id: slugifyGenreId(g.slug || g.name) || 'sin-genero',
        name: normalizeTextNfc(g.name),
        type: 'folder' as const,
        videoCount: 0,
        totalSize: 0,
        totalSizeFormatted: '0 B',
        videos: [] as VideoFile[],
      }))
    }

    type Row = (typeof videosRows)[0] & { genres: { name: string; slug: string } | null }
    const byGenre = new Map<string, { name: string; slug: string; videos: VideoFile[] }>()

    for (const row of videosRows as Row[]) {
      const folderFromPath = row.file_path?.split('/')[0]
      const genreName = normalizeTextNfc(row.genres?.name ?? folderFromPath ?? 'Sin género')
      const genreSlug = slugifyGenreId(row.genres?.slug ?? folderFromPath ?? genreName) || 'sin-genero'
      const fileName = row.file_path?.split('/').pop() || row.title || `video-${row.id}`
      const relativePath = row.file_path || `${genreName}/${fileName}`

      if (!byGenre.has(genreSlug)) {
        byGenre.set(genreSlug, { name: genreName, slug: genreSlug, videos: [] })
      }
      const g = byGenre.get(genreSlug)!
      const size = Number(row.file_size) || 0
      g.videos.push({
        id: String(row.id),
        name: fileName,
        displayName: row.artist ? `${row.artist} - ${row.title}` : row.title,
        artist: row.artist || row.title,
        title: row.title,
        type: 'video',
        size,
        sizeFormatted: formatBytes(size),
        path: relativePath,
        genre: genreName,
        // Portada: 1) URL en DB (absoluta o path); 2) en prod intentar imagen en CDN (mismo path .jpg); 3) placeholder o local ffmpeg.
        thumbnailUrl: buildThumbnailUrl(row.thumbnail_url, relativePath, row.artist, row.title, baseUrl),
        canPreview: DEMOS_ENABLED,
        canDownload: hasAccess,
        durationSeconds: row.duration ?? undefined,
        duration: row.duration ? formatDuration(row.duration) : undefined,
        resolution: row.resolution ?? undefined,
        key: row.key ?? undefined,
        bpm: row.bpm ?? undefined,
      })
    }

    const genres: GenreFolder[] = []
    for (const [, g] of byGenre) {
      const totalSize = g.videos.reduce((sum, v) => sum + v.size, 0)
      const totalDurationSeconds = g.videos.reduce((sum, v) => sum + (v.durationSeconds || 0), 0)
      genres.push({
        id: g.slug,
        name: g.name,
        type: 'folder',
        videoCount: g.videos.length,
        totalSize,
        totalSizeFormatted: formatBytes(totalSize),
        totalDuration: formatDuration(totalDurationSeconds),
        videos: g.videos,
      })
    }
    genres.sort((a, b) => a.name.localeCompare(b.name))
    return genres
  } catch (err) {
    console.error('readVideoStructureFromDb:', err)
    return []
  }
}

/**
 * Lee estructura de carpetas
 */
async function readVideoStructure(basePath: string, hasAccess: boolean, withMetadata: boolean): Promise<GenreFolder[]> {
  const genres: GenreFolder[] = []

  try {
    if (!fs.existsSync(basePath)) {
      console.warn('Videos folder not found:', basePath)
      return []
    }

    const entries = fs.readdirSync(basePath, { withFileTypes: true })
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const genrePath = path.join(basePath, entry.name)
        const videos = await readVideosInFolder(genrePath, entry.name, hasAccess, withMetadata)
        
        const totalSize = videos.reduce((sum, v) => sum + v.size, 0)
        const totalDurationSeconds = videos.reduce((sum, v) => sum + (v.durationSeconds || 0), 0)
        
        genres.push({
          id: slugifyGenreId(entry.name) || 'sin-genero',
          name: normalizeTextNfc(entry.name),
          type: 'folder',
          videoCount: videos.length,
          totalSize,
          totalSizeFormatted: formatBytes(totalSize),
          totalDuration: formatDuration(totalDurationSeconds),
          videos
        })
      }
    }

    genres.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('Error reading video structure:', error)
  }

  return genres
}

/**
 * Lee videos en una carpeta
 */
async function readVideosInFolder(folderPath: string, genre: string, hasAccess: boolean, withMetadata: boolean): Promise<VideoFile[]> {
  const videos: VideoFile[] = []

  try {
    const files = fs.readdirSync(folderPath)
    
    for (const file of files) {
      if (file.match(/\.(mp4|mov|avi|mkv)$/i)) {
        const filePath = path.join(folderPath, file)
        const stats = fs.statSync(filePath)
        const parsed = parseVideoName(file)
        const relativePath = `${genre}/${file}`
        
        // Metadata básica o extendida
        let metadata: Partial<VideoMetadata> = {}
        if (withMetadata) {
          metadata = await getVideoMetadata(filePath)
        }
        
        videos.push({
          id: Buffer.from(file).toString('base64').substring(0, 20),
          name: file,
          displayName: parsed.displayName,
          artist: parsed.artist,
          title: parsed.title,
          key: parsed.key,
          bpm: parsed.bpm,
          type: 'video',
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          path: relativePath,
          genre: genre,
          thumbnailUrl: `/api/thumbnail/${encodeURIComponent(relativePath)}`,
          canPreview: DEMOS_ENABLED,
          canDownload: hasAccess,
          duration: metadata.duration,
          durationSeconds: metadata.durationSeconds,
          resolution: metadata.resolution,
        })
      }
    }

    videos.sort((a, b) => a.artist.localeCompare(b.artist))
  } catch (error) {
    console.error('Error reading folder:', folderPath, error)
  }

  return videos
}

/**
 * Extrae metadata real del video con ffprobe
 */
async function getVideoMetadata(filePath: string): Promise<Partial<VideoMetadata>> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`,
      { timeout: 10000 }
    )
    
    const data = JSON.parse(stdout)
    const videoStream = data.streams?.find((s: any) => s.codec_type === 'video')
    const format = data.format
    
    const durationSeconds = Math.floor(parseFloat(format?.duration || '0'))
    
    return {
      duration: formatDuration(durationSeconds),
      durationSeconds,
      resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : undefined,
      width: videoStream?.width,
      height: videoStream?.height,
      bitrate: format?.bit_rate ? formatBitrate(parseInt(format.bit_rate)) : undefined,
      codec: videoStream?.codec_name,
    }
  } catch {
    // ffprobe no disponible o error
    return {}
  }
}

/**
 * Parsea nombre del archivo
 */
function parseVideoName(filename: string): {
  displayName: string
  artist: string
  title: string
  key?: string
  bpm?: string
} {
  const nameWithoutExt = filename.replace(/\.(mp4|mov|avi|mkv)$/i, '')
  const keyBpmMatch = nameWithoutExt.match(/\((\d+[AB])\s*[–-]\s*(\d+)\s*BPM\)$/i)
  
  let key: string | undefined
  let bpm: string | undefined
  let nameWithoutKeyBpm = nameWithoutExt
  
  if (keyBpmMatch) {
    key = keyBpmMatch[1]
    bpm = keyBpmMatch[2]
    nameWithoutKeyBpm = nameWithoutExt.replace(keyBpmMatch[0], '').trim()
  }
  
  const parts = nameWithoutKeyBpm.split(' - ')
  
  if (parts.length >= 2) {
    return {
      displayName: nameWithoutKeyBpm,
      artist: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim(),
      key,
      bpm
    }
  }
  
  return { displayName: nameWithoutKeyBpm, artist: nameWithoutKeyBpm, title: '', key, bpm }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDuration(seconds: number): string {
  if (!seconds) return ''
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function formatBitrate(bitrate: number): string {
  if (bitrate > 1000000) {
    return `${(bitrate / 1000000).toFixed(1)} Mbps`
  }
  return `${(bitrate / 1000).toFixed(0)} Kbps`
}
