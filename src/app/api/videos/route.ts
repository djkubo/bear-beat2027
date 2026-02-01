import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { isHetznerWebDAVConfigured, listHetznerDirectory, getHetznerFileBuffer, streamHetznerToTempFile } from '@/lib/storage/hetzner-webdav'
import { isLocalVideos, getVideosBasePath, getHetznerVideosBasePath } from '@/lib/storage/videos-source'

const execAsync = promisify(exec)

const METADATA_CACHE_PATH = path.join(process.cwd(), 'metadata-cache')

// ==========================================
// API DE VIDEOS - Carpeta local (VIDEOS_BASE_PATH) o Hetzner WebDAV
// ==========================================

const DEMOS_ENABLED = true

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

/**
 * GET /api/videos
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const packId = searchParams.get('pack') || 'enero-2026'
    const genre = searchParams.get('genre')
    const withMetadata = searchParams.get('metadata') === 'true'
    
    // Verificar acceso del usuario
    let hasAccess = false
    let userId: string | null = null
    let userName: string | null = null
    let userEmail: string | null = null
    const supabase = createServerClient()
    
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

    // Origen: carpeta local en el servidor o Hetzner
    let structure: GenreFolder[]
    if (isLocalVideos()) {
      structure = await readVideoStructureFromLocal(hasAccess)
    } else if (isHetznerWebDAVConfigured()) {
      structure = await readVideoStructureFromHetzner(hasAccess)
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'VIDEOS_SOURCE_REQUIRED',
          message: 'Configura VIDEOS_BASE_PATH (carpeta local, ej. Videos Enero 2026) o Hetzner Storage Box en .env.',
        },
        { status: 503 }
      )
    }

    const filtered = genre 
      ? structure.filter(g => g.id === genre.toLowerCase())
      : structure

    const totalVideos = structure.reduce((sum, g) => sum + g.videoCount, 0)
    const totalSize = structure.reduce((sum, g) => sum + g.totalSize, 0)

    return NextResponse.json({
      success: true,
      pack: {
        id: packId,
        name: 'Pack Enero 2026',
        totalVideos,
        totalSize,
        totalSizeFormatted: formatBytes(totalSize),
        genreCount: structure.length
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

  } catch (error: any) {
    console.error('Error reading videos:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * Lee estructura desde carpeta local del servidor (VIDEOS_BASE_PATH)
 */
async function readVideoStructureFromLocal(hasAccess: boolean): Promise<GenreFolder[]> {
  const basePath = getVideosBasePath()
  const genres: GenreFolder[] = []
  try {
    const entries = fs.readdirSync(basePath, { withFileTypes: true })
    const folders = entries.filter((e) => e.isDirectory())
    for (const folder of folders) {
      const genreName = folder.name
      const genrePath = path.join(basePath, genreName)
      const fileNames = fs.readdirSync(genrePath)
      const videoFiles = fileNames.filter((n) => /\.(mp4|mov|avi|mkv)$/i.test(n))
      const fileNamesSet = new Set(fileNames)
      const videos: VideoFile[] = await Promise.all(
        videoFiles.map(async (basename) => {
          const fullPath = path.join(genrePath, basename)
          const stat = fs.statSync(fullPath)
          const parsed = parseVideoName(basename)
          const relativePath = `${genreName}/${basename}`
          let duration: string | undefined
          let durationSeconds: number | undefined
          let resolution: string | undefined
          const jsonPath = path.join(genrePath, basename + '.json')
          if (fileNamesSet.has(basename + '.json') && fs.existsSync(jsonPath)) {
            try {
              const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as {
                duration?: string
                durationSeconds?: number
                resolution?: string
              }
              duration = meta.duration
              durationSeconds = meta.durationSeconds
              resolution = meta.resolution
            } catch (_) {}
          }
          if (duration === undefined && resolution === undefined) {
            const cacheDir = path.join(METADATA_CACHE_PATH, genreName)
            const cachePath = path.join(cacheDir, basename + '.json')
            if (fs.existsSync(cachePath)) {
              try {
                const meta = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as {
                  duration?: string
                  durationSeconds?: number
                  resolution?: string
                }
                duration = meta.duration
                durationSeconds = meta.durationSeconds
                resolution = meta.resolution
              } catch (_) {}
            } else {
              try {
                const meta = await getVideoMetadata(fullPath)
                if (meta.duration !== undefined || meta.resolution !== undefined) {
                  duration = meta.duration
                  durationSeconds = meta.durationSeconds
                  resolution = meta.resolution
                  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })
                  fs.writeFileSync(
                    cachePath,
                    JSON.stringify({ duration, durationSeconds, resolution }, null, 0),
                    'utf8'
                  )
                }
              } catch (_) {}
            }
          }
          return {
            id: Buffer.from(basename).toString('base64').substring(0, 20),
            name: basename,
            displayName: parsed.displayName,
            artist: parsed.artist,
            title: parsed.title,
            key: parsed.key,
            bpm: parsed.bpm,
            type: 'video',
            size: stat.size || 0,
            sizeFormatted: formatBytes(stat.size || 0),
            path: relativePath,
            genre: genreName,
            thumbnailUrl: `/api/thumbnail/${encodeURIComponent(relativePath)}`,
            canPreview: DEMOS_ENABLED,
            canDownload: hasAccess,
            duration,
            durationSeconds,
            resolution,
          }
        })
      )
      videos.sort((a, b) => a.artist.localeCompare(b.artist))
      const totalSize = videos.reduce((sum, v) => sum + v.size, 0)
      genres.push({
      id: genreName.toLowerCase().replace(/\s+/g, '-'),
      name: genreName,
      type: 'folder',
      videoCount: videos.length,
      totalSize,
      totalSizeFormatted: formatBytes(totalSize),
      videos,
    })
  }
  genres.sort((a, b) => a.name.localeCompare(b.name))
  } catch (e) {
    console.error('Error reading local videos:', e)
  }
  return genres
}

/**
 * Lee estructura desde Hetzner Storage Box (WebDAV).
 * Estructura: /Videos Enero 2026/Cumbia/video.mp4 (carpeta base = géneros = subcarpetas con videos).
 */
async function readVideoStructureFromHetzner(hasAccess: boolean): Promise<GenreFolder[]> {
  const genres: GenreFolder[] = []
  let basePath = getHetznerVideosBasePath()
  let rootToList = basePath ? `/${basePath}` : '/'
  try {
    let rootItems = await listHetznerDirectory(rootToList)
    let folders = rootItems.filter((f: { type: string }) => f.type === 'directory')
    // Si la carpeta base está vacía o no existe, intentar raíz (géneros directamente en /)
    if (folders.length === 0 && basePath) {
      rootItems = await listHetznerDirectory('/')
      folders = rootItems.filter((f: { type: string }) => f.type === 'directory')
      if (folders.length > 0) {
        basePath = ''
        rootToList = '/'
      }
    }
    for (const folder of folders) {
      const genreName = folder.basename
      const genrePath = basePath ? `/${basePath}/${genreName}` : `/${genreName}`
      const files = await listHetznerDirectory(genrePath)
      const videoFiles = files.filter(
        (f: { basename: string; type: string }) => f.type === 'file' && /\.(mp4|mov|avi|mkv)$/i.test(f.basename)
      )
      const fileNames = new Set((files as { basename: string }[]).map((x) => x.basename))
      const videos: VideoFile[] = await Promise.all(
        videoFiles.map(async (f: { basename: string; size: number; filename: string }) => {
          const parsed = parseVideoName(f.basename)
          const relativePath = basePath ? `${basePath}/${genreName}/${f.basename}` : `${genreName}/${f.basename}`
          let duration: string | undefined
          let durationSeconds: number | undefined
          let resolution: string | undefined
          const jsonName = f.basename + '.json'
          if (fileNames.has(jsonName)) {
            try {
              const buf = await getHetznerFileBuffer(`${genrePath}/${jsonName}`)
              if (buf) {
                const meta = JSON.parse(buf.toString('utf8')) as {
                  duration?: string
                  durationSeconds?: number
                  resolution?: string
                }
                duration = meta.duration
                durationSeconds = meta.durationSeconds
                resolution = meta.resolution
              }
            } catch (_) {}
          }
          if (duration === undefined && durationSeconds === undefined && resolution === undefined) {
            const cacheDir = path.join(METADATA_CACHE_PATH, genreName)
            const cachePath = path.join(cacheDir, f.basename + '.json')
            if (fs.existsSync(cachePath)) {
              try {
                const meta = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as {
                  duration?: string
                  durationSeconds?: number
                  resolution?: string
                }
                duration = meta.duration
                durationSeconds = meta.durationSeconds
                resolution = meta.resolution
              } catch (_) {}
            } else {
              let tempPath: string | null = null
              try {
                const result = await streamHetznerToTempFile(relativePath)
                if (result && result.bytesRead > 0) {
                  tempPath = result.tempPath
                  const meta = await getVideoMetadata(tempPath)
                  if (meta.duration !== undefined || meta.resolution !== undefined) {
                    duration = meta.duration
                    durationSeconds = meta.durationSeconds
                    resolution = meta.resolution
                    try {
                      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })
                      fs.writeFileSync(
                        cachePath,
                        JSON.stringify({ duration, durationSeconds, resolution }, null, 0),
                        'utf8'
                      )
                    } catch (_) {}
                  }
                }
              } finally {
                if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
              }
            }
          }
          return {
            id: Buffer.from(f.basename).toString('base64').substring(0, 20),
            name: f.basename,
            displayName: parsed.displayName,
            artist: parsed.artist,
            title: parsed.title,
            key: parsed.key,
            bpm: parsed.bpm,
            type: 'video',
            size: f.size || 0,
            sizeFormatted: formatBytes(f.size || 0),
            path: relativePath,
            genre: genreName,
            thumbnailUrl: `/api/thumbnail/${encodeURIComponent(relativePath)}`,
            canPreview: DEMOS_ENABLED,
            canDownload: hasAccess,
            duration,
            durationSeconds,
          resolution,
        }
      })
      )
      videos.sort((a, b) => a.artist.localeCompare(b.artist))
      const totalSize = videos.reduce((sum, v) => sum + v.size, 0)
      genres.push({
        id: genreName.toLowerCase().replace(/\s+/g, '-'),
        name: genreName,
        type: 'folder',
        videoCount: videos.length,
        totalSize,
        totalSizeFormatted: formatBytes(totalSize),
        videos,
      })
    }
    genres.sort((a, b) => a.name.localeCompare(b.name))
  } catch (e) {
    console.error('Error reading from Hetzner WebDAV:', e)
  }
  return genres
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
