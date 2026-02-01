import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import archiver from 'archiver'
import {
  isHetznerWebDAVConfigured,
  listHetznerDirectory,
  createHetznerReadStream,
} from '@/lib/storage/hetzner-webdav'
import {
  isBunnyStorageConfigured,
  listFiles as listBunnyFiles,
  getBunnyFileStream,
  type BunnyFile,
} from '@/lib/storage/bunny'

/**
 * GET /api/download-zip?genre=xxx (opcional: un género) o sin params = todo el pack
 * Si Bunny Storage está configurado → ZIP desde Bunny (escala).
 * Si no → ZIP desde Hetzner (límite ~10 conexiones).
 */
export async function GET(req: NextRequest) {
  try {
    const genre = req.nextUrl.searchParams.get('genre') || null

    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado. Inicia sesión.' }, { status: 401 })
    }

    const { data: purchases, error } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)

    if (error || !purchases || purchases.length === 0) {
      return NextResponse.json({
        error: 'No tienes acceso. Compra el pack para descargar.',
        redirect: '/checkout?pack=enero-2026',
      }, { status: 403 })
    }

    const archive = archiver('zip', { zlib: { level: 6 } })

    const stream = new ReadableStream({
      start(controller) {
        archive.on('data', (chunk: Buffer) => controller.enqueue(chunk))
        archive.on('end', () => controller.close())
        archive.on('error', (err) => controller.error(err))
      },
    })

    const fileName = genre ? 'Bear-Beat-' + genre + '.zip' : 'Bear-Beat-Pack-Enero-2026.zip'

    if (isBunnyStorageConfigured()) {
      await addBunnyFilesToArchive(archive, genre)
    } else if (isHetznerWebDAVConfigured()) {
      await addHetznerFilesToArchive(archive, genre)
    } else {
      return NextResponse.json(
        { error: 'Configura Hetzner Storage Box o Bunny en .env para habilitar ZIP.' },
        { status: 503 }
      )
    }

    archive.finalize()

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (error: any) {
    console.error('Download ZIP error:', error)
    return NextResponse.json({ error: 'Error al generar ZIP' }, { status: 500 })
  }
}

async function addBunnyFilesToArchive(
  archive: archiver.Archiver,
  genreFilter: string | null
): Promise<void> {
  const rootItems = await listBunnyFiles('')
  const folders = rootItems.filter((f: BunnyFile) => f.IsDirectory)
  for (const folder of folders) {
    const genreName = folder.ObjectName || folder.Path || ''
    if (genreFilter && genreName.toLowerCase().replace(/\s+/g, '-') !== genreFilter.toLowerCase()) continue
    const files = await listBunnyFiles(genreName)
    const videoFiles = files.filter(
      (f: BunnyFile) => !f.IsDirectory && /\.(mp4|mov|avi|mkv)$/i.test(f.ObjectName || '')
    )
    for (const f of videoFiles) {
      const relPath = `${genreName}/${f.ObjectName}`
      const fileStream = await getBunnyFileStream(relPath)
      if (fileStream) {
        archive.append(fileStream, { name: relPath })
      }
    }
  }
}

async function addHetznerFilesToArchive(
  archive: archiver.Archiver,
  genreFilter: string | null
): Promise<void> {
  const rootItems = await listHetznerDirectory('/')
  const folders = rootItems.filter((f: { type: string }) => f.type === 'directory')
  for (const folder of folders) {
    const genreName = folder.basename
    if (genreFilter && genreName.toLowerCase().replace(/\s+/g, '-') !== genreFilter.toLowerCase()) continue
    const files = await listHetznerDirectory(`/${genreName}`)
    const videoFiles = files.filter(
      (f: { basename: string; type: string }) => f.type === 'file' && /\.(mp4|mov|avi|mkv)$/i.test(f.basename)
    )
    for (const f of videoFiles) {
      const remotePath = `/${genreName}/${f.basename}`
      const readStream = createHetznerReadStream(remotePath)
      if (readStream) {
        archive.append(readStream, { name: `${genreName}/${f.basename}` })
      }
    }
  }
}

