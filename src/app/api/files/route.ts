import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateSignedUrl, getBunnyPackPrefix, buildBunnyPath } from '@/lib/bunny'
import { generateStreamUrl, listFiles, listFilesRecursive } from '@/lib/storage/bunny'

/** Carpeta en Bunny Storage para el pack. Mismo valor que /api/download. */
function getPackFolderPath(packId: string | null): string {
  if (!packId || packId === '1') return getBunnyPackPrefix()
  return `packs/${packId}`
}

// ==========================================
// API DE ARCHIVOS - URLs firmadas y listado
// ==========================================

/**
 * GET /api/files
 * Listar archivos de un pack (requiere compra)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const packId = searchParams.get('pack')
    const demoOnly = searchParams.get('demo') === 'true'

    // Si es solo demo, devolver estructura sin verificación
    if (demoOnly) {
      const demoFiles = await listFiles('demos').catch(() => [])
      return NextResponse.json({
        success: true,
        files: demoFiles.map(f => ({
          id: f.Guid,
          name: f.ObjectName,
          type: f.IsDirectory ? 'folder' : getFileType(f.ObjectName),
          size: f.Length,
          sizeFormatted: formatBytes(f.Length),
          path: f.Path,
          isDemo: true
        }))
      })
    }

    // Si pide pack completo, verificar autenticación y compra
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar que compró el pack
    if (packId) {
      const { data: purchase } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('pack_id', packId)
        .single()

      if (!purchase) {
        return NextResponse.json(
          { success: false, error: 'No tienes acceso a este pack' },
          { status: 403 }
        )
      }
    }

    // Listar archivos del pack de forma recursiva (misma carpeta que usa /api/download)
    const folderPath = getPackFolderPath(packId)
    const files = await listFilesRecursive(folderPath).catch((err) => {
      console.error('Bunny listFilesRecursive error:', err)
      return []
    })

    // Árbol con rutas relativas al pack para que download?file=X funcione
    const fileTree = buildFileTree(files, folderPath)

    return NextResponse.json({
      success: true,
      files: fileTree
    })

  } catch (error: any) {
    console.error('Error listing files:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/files
 * Obtener URL firmada para descarga o streaming
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, filePath, videoId, packId } = body

    // Si es demo, devolver URL de streaming
    if (action === 'demo_stream' && videoId) {
      const streamUrl = generateStreamUrl(videoId, 1800) // 30 min
      return NextResponse.json({
        success: true,
        url: streamUrl,
        type: 'iframe',
        expiresIn: 1800
      })
    }

    // Para descargas, verificar autenticación
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Inicia sesión para descargar' },
        { status: 401 }
      )
    }

    // Verificar compra del pack
    if (packId) {
      const { data: purchase } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('pack_id', packId)
        .single()

      if (!purchase) {
        return NextResponse.json(
          { success: false, error: 'No tienes acceso a este contenido' },
          { status: 403 }
        )
      }
    }

    // Todo bajo el mismo prefijo en Bunny (BUNNY_PACK_PATH_PREFIX)
    const pathNorm = filePath.replace(/^\//, '').trim()
    const fullPath = buildBunnyPath(pathNorm, true)
    if (!fullPath) {
      return NextResponse.json({ success: false, error: 'Invalid file path' }, { status: 400 })
    }
    const signedUrl = generateSignedUrl(
      fullPath,
      3600, // 1 hora
      process.env.NEXT_PUBLIC_APP_URL // Solo desde nuestro dominio
    )

    // Registrar descarga
    await supabase.from('downloads').insert({
      user_id: user.id,
      file_path: filePath,
      pack_id: packId,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json({
      success: true,
      url: signedUrl,
      type: 'download',
      expiresIn: 3600
    })

  } catch (error: any) {
    console.error('Error generating URL:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// Helpers
function getFileType(filename: string): 'video' | 'audio' | 'file' {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) return 'video'
  if (['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(ext || '')) return 'audio'
  return 'file'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * Construye árbol con rutas relativas al pack para que /api/download?file=Genre/video.mp4 funcione.
 * Bunny devuelve Path (carpeta padre) y ObjectName; la ruta relativa es la que usamos en download.
 */
function buildFileTree(files: any[], basePath: string): any[] {
  const base = basePath.replace(/\/$/, '')
  const baseEscaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return files.map(f => {
    const fullPath = `${(f.Path || base).replace(/\/$/, '')}/${f.ObjectName}`.replace(/\/+/g, '/')
    const relativePath = fullPath.replace(new RegExp(`^${baseEscaped}/?`), '') || f.ObjectName
    return {
      id: f.Guid,
      name: f.ObjectName,
      type: f.IsDirectory ? 'folder' : getFileType(f.ObjectName),
      size: f.Length,
      sizeFormatted: formatBytes(f.Length),
      path: relativePath,
      downloadUrl: f.IsDirectory ? undefined : relativePath
    }
  })
}
