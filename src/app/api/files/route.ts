import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateSignedUrl, generateStreamUrl, listFiles } from '@/lib/storage/bunny'

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
      const demoFiles = await listFiles('demos')
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
        .eq('status', 'completed')
        .single()

      if (!purchase) {
        return NextResponse.json(
          { success: false, error: 'No tienes acceso a este pack' },
          { status: 403 }
        )
      }
    }

    // Listar archivos del pack
    const folderPath = packId ? `packs/${packId}` : 'packs'
    const files = await listFiles(folderPath)

    // Transformar a estructura de árbol
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
        .eq('status', 'completed')
        .single()

      if (!purchase) {
        return NextResponse.json(
          { success: false, error: 'No tienes acceso a este contenido' },
          { status: 403 }
        )
      }
    }

    // Generar URL firmada para descarga
    const signedUrl = generateSignedUrl(
      filePath,
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

function buildFileTree(files: any[], basePath: string): any[] {
  return files.map(f => ({
    id: f.Guid,
    name: f.ObjectName,
    type: f.IsDirectory ? 'folder' : getFileType(f.ObjectName),
    size: f.Length,
    sizeFormatted: formatBytes(f.Length),
    path: `${basePath}/${f.ObjectName}`,
    downloadUrl: f.IsDirectory ? undefined : `${basePath}/${f.ObjectName}`
  }))
}
