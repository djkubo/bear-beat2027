import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Client } from 'basic-ftp'

const PACK_SLUG = 'enero-2026'
const FTP_BASE = process.env.FTP_BASE_PATH || process.env.FTP_VIDEOS_PATH || 'Videos Enero 2026'
const BATCH = 100

/** Extrae key y BPM del nombre de archivo. Ej: "Artist - Title (10A – 124 BPM).mp4" o "Title (124 BPM) (10A).mp4" */
function parseKeyBpmFromFilename(filename: string): { key: string | null; bpm: string | null; nameWithoutKeyBpm: string } {
  const nameWithoutExt = filename.replace(/\.(mp4|mov|avi|mkv)$/i, '').trim()
  let key: string | null = null
  let bpm: string | null = null
  let nameWithoutKeyBpm = nameWithoutExt

  // (10A – 124 BPM) o (10A - 124 BPM) al final
  const keyBpmEnd = nameWithoutExt.match(/\((\d{1,2}[AB])\s*[–-]\s*(\d+)\s*BPM\)\s*$/i)
  if (keyBpmEnd) {
    key = keyBpmEnd[1].toUpperCase()
    bpm = keyBpmEnd[2]
    nameWithoutKeyBpm = nameWithoutExt.replace(keyBpmEnd[0], '').trim().replace(/\s*-\s*$/, '').trim()
  } else {
    const bpmMatch = nameWithoutExt.match(/\((\d+)\s*BPM\)/i)
    if (bpmMatch) {
      bpm = bpmMatch[1]
      nameWithoutKeyBpm = nameWithoutKeyBpm.replace(bpmMatch[0], '').trim().replace(/\s*-\s*$/, '').trim()
    }
    const keyMatch = nameWithoutExt.match(/\((\d{1,2}[AB])\)/i)
    if (keyMatch) {
      key = keyMatch[1].toUpperCase()
      nameWithoutKeyBpm = nameWithoutKeyBpm.replace(keyMatch[0], '').trim().replace(/\s*-\s*$/, '').trim()
    }
  }

  return { key, bpm, nameWithoutKeyBpm }
}

/**
 * POST /api/admin/sync-videos-ftp
 * Solo admin. Sincroniza el listado de videos desde el FTP (Hetzner Storage Box)
 * a la tabla videos de Supabase usando las variables de entorno del servidor.
 * Así no hace falta tener FTP en .env.local: las credenciales están en Render.
 */
export async function POST() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
    }

    const ftpHost = process.env.FTP_HOST || process.env.HETZNER_FTP_HOST
    const ftpUser = process.env.FTP_USER || process.env.HETZNER_FTP_USER
    const ftpPassword = process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD

    if (!ftpHost || !ftpUser || !ftpPassword) {
      return NextResponse.json(
        {
          error: 'Falta configuración FTP en el servidor. Añade FTP_HOST, FTP_USER y FTP_PASSWORD (o HETZNER_FTP_*) en Render → Environment.',
        },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const { data: packData, error: packErr } = await (admin as any).from('packs').select('id').eq('slug', PACK_SLUG).single()
    if (packErr || !packData) {
      return NextResponse.json({ error: 'Pack no encontrado (slug: ' + PACK_SLUG + ')' }, { status: 400 })
    }
    const packId = (packData as { id: number }).id

    const { data: genresRows } = await (admin as any).from('genres').select('id, name')
    const genreByName = new Map<string, number>(
      (genresRows || []).map((g: { id: number; name: string }) => [g.name.toLowerCase(), g.id])
    )

    const { error: delErr } = await (admin as any).from('videos').delete().eq('pack_id', packId)
    if (delErr) {
      return NextResponse.json({ error: 'Error borrando videos anteriores: ' + delErr.message }, { status: 500 })
    }

    const ftpClient = new Client(60 * 1000)
    try {
      await ftpClient.access({
        host: ftpHost,
        user: ftpUser,
        password: ftpPassword,
        secure: false,
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return NextResponse.json({ error: 'Error conectando al FTP: ' + msg }, { status: 502 })
    }

    let total = 0
    let totalSizeBytes = 0
    const batch: Array<{
      pack_id: number
      genre_id: number | null
      title: string
      artist: string | null
      file_path: string
      file_size: number
      resolution: string
      key: string | null
      bpm: string | null
    }> = []

    try {
      try {
        await ftpClient.cd(FTP_BASE)
      } catch {
        await ftpClient.close()
        return NextResponse.json({
          error: 'No se encontró la carpeta "' + FTP_BASE + '" en el FTP. Configura FTP_BASE_PATH si usas otro nombre.',
        }, { status: 400 })
      }

      const rootList = await ftpClient.list()
      const dirs = rootList.filter((f) => f.isDirectory)
      if (dirs.length === 0) {
        await ftpClient.close()
        return NextResponse.json({
          error: 'No hay carpetas (géneros) dentro de /' + FTP_BASE + '/',
        }, { status: 400 })
      }

      for (const dir of dirs) {
        const genreName = dir.name
        if (genreName.startsWith('.')) continue
        try {
          const fileList = await ftpClient.list(genreName)
          const videoFiles = fileList.filter((f) => !f.isDirectory && /\.(mp4|mov|avi|mkv)$/i.test(f.name))
          const genreId: number | null = genreByName.get(genreName.toLowerCase()) ?? null

          for (const file of videoFiles) {
            const relativePath = `${genreName}/${file.name}`
            const { key, bpm, nameWithoutKeyBpm } = parseKeyBpmFromFilename(file.name)
            const parts = nameWithoutKeyBpm.split(' - ')
            const artist = parts.length >= 2 ? parts[0].trim() : nameWithoutKeyBpm
            const title = parts.length >= 2 ? parts.slice(1).join(' - ').trim() : ''

            const fileSize = file.size || 0
            totalSizeBytes += fileSize
            batch.push({
              pack_id: packId,
              genre_id: genreId,
              title: title || nameWithoutKeyBpm,
              artist: artist || null,
              file_path: relativePath,
              file_size: fileSize,
              resolution: '1080p',
              key,
              bpm,
            })

            if (batch.length >= BATCH) {
              const { error } = await (admin as any).from('videos').insert(batch)
              if (error) {
                await ftpClient.close()
                return NextResponse.json({ error: 'Error insertando batch: ' + error.message }, { status: 500 })
              }
              total += batch.length
              batch.length = 0
            }
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          console.warn('Sync FTP: no se pudo listar carpeta', genreName, msg)
        }
      }

      if (batch.length > 0) {
        const { error } = await (admin as any).from('videos').insert(batch)
        if (error) {
          await ftpClient.close()
          return NextResponse.json({ error: 'Error insertando último batch: ' + error.message }, { status: 500 })
        }
        total += batch.length
      }

      // Actualizar pack con total real (total_videos y total_size_gb)
      const totalSizeGb = totalSizeBytes / (1024 * 1024 * 1024)
      await (admin as any).from('packs').update({
        total_videos: total,
        total_size_gb: Math.round(totalSizeGb * 100) / 100,
        updated_at: new Date().toISOString(),
      }).eq('id', packId)

      await ftpClient.close()
      return NextResponse.json({ ok: true, total, message: 'Catálogo sincronizado desde FTP. Total: ' + total + ' videos.' })
    } finally {
      try {
        ftpClient.close()
      } catch {
        // ignore
      }
    }
  } catch (e: unknown) {
    console.error('Sync videos FTP:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    )
  }
}
