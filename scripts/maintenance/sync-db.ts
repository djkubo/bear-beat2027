#!/usr/bin/env npx tsx
/**
 * Sincronizador de metadata: lista MP4 del FTP, parsea nombres (Genero/Artista - Titulo (Clave - BPM).mp4),
 * hace upsert en Supabase (videos) y marca como active: false los que ya no existen en FTP.
 *
 * Requisitos:
 *   - .env.local: FTP_HOST, FTP_USER, FTP_PASSWORD (o HETZNER_FTP_*)
 *   - .env.local: SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 *   - FTP_BASE_PATH (ej. "Videos Enero 2026")
 *   - Tabla videos con file_path único; opcional columna active (BOOLEAN DEFAULT true).
 *
 * Uso: npx tsx scripts/maintenance/sync-db.ts
 *      npm run maintenance:sync-db
 */

import { Client } from 'basic-ftp'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { loadEnv } from './load-env'

loadEnv()

const FTP_HOST = process.env.FTP_HOST || process.env.HETZNER_FTP_HOST
const FTP_USER = process.env.FTP_USER || process.env.HETZNER_FTP_USER
const FTP_PASSWORD = process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD
const FTP_BASE = process.env.FTP_BASE_PATH || process.env.FTP_VIDEOS_PATH || 'Videos Enero 2026'
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const PACK_SLUG = process.env.PACK_SLUG || 'enero-2026'
const VIDEO_EXT = /\.(mp4|mov|avi|mkv)$/i
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5000
const BATCH_SIZE = 100

/** Formato: Genero/Artista - Titulo (Clave - BPM).mp4 → extrae genero, artista, titulo, key, bpm (titulo puede contener " - ") */
const KEY_BPM_REGEX = /\s*\((\d{1,2}[AB]?)\s*[–\-]\s*(\d+)\s*BPM\)\.(mp4|mov|avi|mkv)$/i

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

interface ParsedVideo {
  file_path: string
  genero: string
  artista: string
  titulo: string
  key: string
  bpm: string
  thumbnail_url: string | null
}

function parseFilePath(filePath: string): ParsedVideo | null {
  const normalized = filePath.replace(/\\/g, '/')
  const keyBpmMatch = normalized.match(KEY_BPM_REGEX)
  if (!keyBpmMatch) return null
  const key = (keyBpmMatch[1] || '').toUpperCase()
  const bpm = (keyBpmMatch[2] || '').trim()
  const beforeKeyBpm = normalized.slice(0, normalized.length - keyBpmMatch[0].length).trim()
  const slashIdx = beforeKeyBpm.indexOf('/')
  if (slashIdx < 0) return null
  const genero = beforeKeyBpm.slice(0, slashIdx).trim()
  const artistTitle = beforeKeyBpm.slice(slashIdx + 1).trim()
  const dashIdx = artistTitle.indexOf(' - ')
  const artista = dashIdx >= 0 ? artistTitle.slice(0, dashIdx).trim() : artistTitle
  const titulo = dashIdx >= 0 ? artistTitle.slice(dashIdx + 3).trim() : ''
  const thumbPath = normalized.replace(VIDEO_EXT, '.jpg')
  return {
    file_path: normalized,
    genero,
    artista,
    titulo,
    key,
    bpm,
    thumbnail_url: thumbPath,
  }
}

async function listFtpRecursive(client: Client, basePath: string): Promise<string[]> {
  const files: string[] = []
  const list = await client.list(basePath)
  for (const item of list) {
    const remotePath = basePath ? `${basePath}/${item.name}` : item.name
    if (item.isDirectory && !item.name.startsWith('.')) {
      files.push(...(await listFtpRecursive(client, remotePath)))
    } else if (VIDEO_EXT.test(item.name)) {
      files.push(remotePath)
    }
  }
  return files
}

async function main(): Promise<void> {
  if (!FTP_HOST || !FTP_USER || FTP_PASSWORD === undefined) {
    console.error('❌ Configura FTP_HOST, FTP_USER y FTP_PASSWORD en .env.local')
    process.exit(1)
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local')
    process.exit(1)
  }

  const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { data: pack, error: packErr } = await supabase.from('packs').select('id').eq('slug', PACK_SLUG).single()
  if (packErr || !pack) {
    console.error('❌ Pack no encontrado (slug:', PACK_SLUG, '). Ejecuta npm run db:setup antes.')
    process.exit(1)
  }
  const packId = pack.id

  const { data: genresRows } = await supabase.from('genres').select('id, name')
  const genreByName = new Map<string, number>((genresRows || []).map((g) => [g.name.toLowerCase(), g.id]))

  const client = new Client(60 * 1000)
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[${attempt}/${MAX_RETRIES}] Conectando FTP ${FTP_HOST}...`)
      await client.access({
        host: FTP_HOST,
        user: FTP_USER,
        password: FTP_PASSWORD,
        secure: process.env.FTP_SECURE === 'true',
      })
      await client.cd(FTP_BASE)
      break
    } catch (e: unknown) {
      console.error('Error FTP:', (e as Error).message)
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS)
      } else {
        process.exit(1)
      }
    }
  }

  const ftpPaths = await listFtpRecursive(client, '.')
  client.close()
  console.log('✓ Archivos MP4 en FTP:', ftpPaths.length)

  const ftpSet = new Set(ftpPaths)
  const parsed: ParsedVideo[] = []
  let skipped = 0
  for (const p of ftpPaths) {
    const row = parseFilePath(p)
    if (row) {
      parsed.push(row)
    } else {
      skipped++
    }
  }
  if (skipped > 0) console.log('⚠ No parseados (formato distinto):', skipped)

  const rows = parsed.map((p) => {
    const genreId = genreByName.get(p.genero.toLowerCase()) ?? null
    return {
      pack_id: packId,
      genre_id: genreId,
      title: p.titulo,
      artist: p.artista,
      file_path: p.file_path,
      thumbnail_url: p.thumbnail_url,
      key: p.key || null,
      bpm: p.bpm || null,
      updated_at: new Date().toISOString(),
    }
  })

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from('videos').upsert(batch, {
      onConflict: 'pack_id,file_path',
      ignoreDuplicates: false,
    })
    if (error) {
      console.error('Error upsert batch:', error.message)
      throw error
    }
    console.log(`Upsert ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`)
  }

  const { data: dbVideos } = await supabase.from('videos').select('file_path').eq('pack_id', packId)
  const inDb = (dbVideos || []).map((v) => v.file_path)
  const missingInFtp = inDb.filter((fp) => !ftpSet.has(fp))
  if (missingInFtp.length > 0) {
    const { error: upErr } = await supabase
      .from('videos')
      .update({ active: false, updated_at: new Date().toISOString() } as Record<string, unknown>)
      .eq('pack_id', packId)
      .in('file_path', missingInFtp)
    if (upErr) {
      console.warn('⚠ Videos en DB que ya no están en FTP:', missingInFtp.length, '(añade columna active si quieres marcarlos). Error:', upErr.message)
    } else {
      console.log('✓ Marcados active: false (no están en FTP):', missingInFtp.length)
    }
  }

  console.log('✓ Sync DB listo')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
