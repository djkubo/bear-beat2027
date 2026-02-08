#!/usr/bin/env node
/**
 * Auditoria de sincronizacion del catalogo (FTP ↔ Supabase DB ↔ Bunny Storage).
 *
 * Objetivo:
 * - Detectar desfaces entre lo que existe en el storage (FTP/Bunny) y lo que la web lista (DB).
 * - Verificar que existan ZIPs por genero para descargas masivas.
 *
 * NO modifica nada. Solo imprime reporte.
 *
 * Requisitos (segun lo que quieras auditar):
 * - Para FTP: FTP_HOST, FTP_USER, FTP_PASSWORD, FTP_BASE_PATH (default "Videos Enero 2026")
 * - Para Supabase: SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 * - Para Bunny Storage list: BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD, BUNNY_PACK_PATH_PREFIX
 *
 * Uso:
 *   node scripts/audit-catalog-sync.js
 *   PACK_SLUG=enero-2026 node scripts/audit-catalog-sync.js
 */

const fs = require('fs')
const path = require('path')

function loadEnv(file) {
  const envPath = path.join(__dirname, '..', file)
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf8')
  content.split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (!m) return
    const key = m[1].trim()
    const val = m[2].trim().replace(/^["']|["']$/g, '')
    if (key && !key.startsWith('#')) process.env[key] = val
  })
}
loadEnv('.env')
loadEnv('.env.local')

const PACK_SLUG = String(process.env.PACK_SLUG || 'enero-2026')
const FTP_HOST = process.env.FTP_HOST || process.env.HETZNER_FTP_HOST
const FTP_USER = process.env.FTP_USER || process.env.HETZNER_FTP_USER
const FTP_PASSWORD = process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD
const FTP_BASE = (process.env.FTP_BASE_PATH || process.env.FTP_VIDEOS_PATH || 'Videos Enero 2026').replace(/\/+$/, '')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || ''
const BUNNY_STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD || ''
const BUNNY_PACK_PREFIX = String(process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || '').trim().replace(/\/+$/, '')

const VIDEO_EXT = /\.(mp4|mov|avi|mkv|webm)$/i

function normalizeNfc(input) {
  const s = String(input ?? '')
  try {
    return s.normalize('NFC').trim()
  } catch {
    return s.trim()
  }
}

function formatGB(bytes) {
  return (Number(bytes || 0) / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

function padRight(s, n) {
  const str = String(s)
  return str.length >= n ? str : str + ' '.repeat(n - str.length)
}

async function auditFtp() {
  if (!FTP_HOST || !FTP_USER || FTP_PASSWORD === undefined) {
    return { ok: false, reason: 'missing_ftp_env', genres: new Map(), rootZips: [] }
  }
  const { Client } = require('basic-ftp')
  const client = new Client(120 * 1000)
  client.ftp.verbose = false

  const genres = new Map() // name -> { count, bytes }
  const rootZips = [] // { name, bytes }

  try {
    await client.access({ host: FTP_HOST, user: FTP_USER, password: FTP_PASSWORD, secure: false })

    // ZIPs viven en root
    const rootList = await client.list()
    for (const it of rootList) {
      if (it.isFile && String(it.name || '').toLowerCase().endsWith('.zip')) {
        rootZips.push({ name: String(it.name), bytes: Number(it.size || 0) })
      }
    }

    // Videos viven en FTP_BASE
    await client.cd(FTP_BASE)
    const baseList = await client.list()
    const dirs = baseList.filter((f) => f.isDirectory && !String(f.name || '').startsWith('.'))
    for (const dir of dirs) {
      const genreName = String(dir.name)
      let count = 0
      let bytes = 0
      try {
        const files = await client.list(genreName)
        for (const f of files) {
          if (f.isFile && VIDEO_EXT.test(String(f.name || ''))) {
            count += 1
            bytes += Number(f.size || 0)
          }
        }
      } catch {
        // ignore per-folder failures
      }
      genres.set(genreName, { count, bytes })
    }

    return { ok: true, genres, rootZips }
  } catch (e) {
    return { ok: false, reason: (e && e.message) || String(e), genres, rootZips }
  } finally {
    client.close()
  }
}

async function auditSupabaseDb() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, reason: 'missing_supabase_env', genres: new Map(), total: 0, thumbnailsSet: 0, thumbsNull: 0 }
  }
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: pack, error: packErr } = await supabase.from('packs').select('id,name').eq('slug', PACK_SLUG).single()
  if (packErr || !pack) {
    return { ok: false, reason: `pack_not_found:${PACK_SLUG}`, genres: new Map(), total: 0, thumbnailsSet: 0, thumbsNull: 0 }
  }

  const genres = new Map() // name -> count
  let total = 0
  let thumbnailsSet = 0
  let thumbsNull = 0

  // Paginar para evitar limites (aunque suele ser < 10k)
  const PAGE = 1000
  let offset = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: rows, error } = await supabase
      .from('videos')
      .select('file_path,thumbnail_url', { count: 'exact' })
      .eq('pack_id', pack.id)
      .range(offset, offset + PAGE - 1)

    if (error) {
      return { ok: false, reason: `db_error:${error.message}`, genres, total, thumbnailsSet, thumbsNull }
    }
    if (!rows || rows.length === 0) break

    for (const r of rows) {
      total += 1
      const fp = String(r.file_path || '')
      const genre = fp.split('/')[0] || 'Sin genero'
      genres.set(genre, (genres.get(genre) || 0) + 1)
      if (r.thumbnail_url) thumbnailsSet += 1
      else thumbsNull += 1
    }

    if (rows.length < PAGE) break
    offset += PAGE
    if (offset > 20000) break
  }

  return { ok: true, pack: { id: pack.id, name: pack.name }, genres, total, thumbnailsSet, thumbsNull }
}

async function listBunnyZips() {
  if (!BUNNY_STORAGE_ZONE || !BUNNY_STORAGE_PASSWORD) {
    return { ok: false, reason: 'missing_bunny_env', zips: [] }
  }
  const url = BUNNY_PACK_PREFIX
    ? `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${BUNNY_PACK_PREFIX}/`
    : `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/`
  const res = await fetch(url, {
    headers: { AccessKey: BUNNY_STORAGE_PASSWORD, Accept: 'application/json' },
  })
  const json = await res.json().catch(async () => ({ _text: await res.text().catch(() => '') }))
  if (!res.ok) {
    const msg = typeof json === 'string' ? json : JSON.stringify(json)
    return { ok: false, reason: `bunny_list_failed:${res.status}:${msg.slice(0, 150)}`, zips: [] }
  }
  const items = Array.isArray(json) ? json : []
  const zips = items
    .filter((it) => !it.IsDirectory && String(it.ObjectName || '').toLowerCase().endsWith('.zip'))
    .map((it) => String(it.ObjectName))
  return { ok: true, zips }
}

function printSection(title) {
  console.log('')
  console.log('='.repeat(72))
  console.log(title)
  console.log('='.repeat(72))
}

async function main() {
  console.log('Bear Beat – Auditoria Catalogo/Storage')
  console.log('Pack:', PACK_SLUG)

  const [ftp, db, bunnyZips] = await Promise.all([auditFtp(), auditSupabaseDb(), listBunnyZips()])

  printSection('FTP')
  if (!ftp.ok) {
    console.log('No disponible:', ftp.reason)
  } else {
    console.log('FTP_BASE:', FTP_BASE)
    console.log('Generos en FTP_BASE:', ftp.genres.size)
    const top = Array.from(ftp.genres.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 15)
    console.log('')
    console.log(padRight('Genero', 28), padRight('Videos', 8), 'Tamano')
    for (const [name, s] of top) {
      console.log(padRight(name, 28), padRight(String(s.count), 8), formatGB(s.bytes))
    }
    if (ftp.rootZips.length) {
      console.log('')
      console.log('ZIPs en root FTP:', ftp.rootZips.length)
    } else {
      console.log('')
      console.log('ZIPs en root FTP: 0')
    }
  }

  printSection('Supabase DB')
  if (!db.ok) {
    console.log('No disponible:', db.reason)
  } else {
    console.log('Pack ID:', db.pack.id, '| Name:', db.pack.name || '(sin nombre)')
    console.log('Total videos en DB:', db.total)
    console.log('thumbnail_url:', db.thumbnailsSet, 'con valor |', db.thumbsNull, 'null/vacio')
    console.log('Generos (segun file_path):', db.genres.size)
  }

  // Comparaciones FTP vs DB
  printSection('Comparacion FTP ↔ DB (conteos por genero)')
  if (ftp.ok && db.ok) {
    const ftpNames = new Set(Array.from(ftp.genres.keys()))
    const dbNames = new Set(Array.from(db.genres.keys()))

    const inFtpNotDb = Array.from(ftpNames).filter((g) => !dbNames.has(g)).sort((a, b) => a.localeCompare(b))
    const inDbNotFtp = Array.from(dbNames).filter((g) => !ftpNames.has(g)).sort((a, b) => a.localeCompare(b))

    const mismatches = []
    for (const g of Array.from(new Set([...ftpNames, ...dbNames]))) {
      const ftpCount = ftp.genres.get(g)?.count ?? null
      const dbCount = db.genres.get(g) ?? null
      if (ftpCount == null || dbCount == null) continue
      if (ftpCount !== dbCount) {
        mismatches.push({ genre: g, ftp: ftpCount, db: dbCount })
      }
    }
    mismatches.sort((a, b) => Math.abs(b.ftp - b.db) - Math.abs(a.ftp - a.db))

    if (inFtpNotDb.length === 0 && inDbNotFtp.length === 0 && mismatches.length === 0) {
      console.log('✓ DB y FTP coinciden por genero.')
    } else {
      if (mismatches.length) {
        console.log('⚠ Diferencias de conteo (top 20):')
        for (const m of mismatches.slice(0, 20)) {
          console.log(`- ${m.genre}: FTP=${m.ftp} vs DB=${m.db}`)
        }
      }
      if (inFtpNotDb.length) {
        console.log('')
        console.log('⚠ Generos en FTP pero NO en DB:', inFtpNotDb.length)
        console.log(inFtpNotDb.join(', '))
      }
      if (inDbNotFtp.length) {
        console.log('')
        console.log('⚠ Generos en DB pero NO en FTP:', inDbNotFtp.length)
        console.log(inDbNotFtp.join(', '))
      }
    }
  } else {
    console.log('No se puede comparar (faltan credenciales de FTP o Supabase).')
  }

  // ZIPs: esperados segun FTP genres
  printSection('ZIPs por genero (FTP root ↔ Bunny)')
  const ftpZipNames = new Set((ftp.rootZips || []).map((z) => normalizeNfc(z.name)))
  if (!ftp.ok) {
    console.log('No se pudo leer FTP root zips.')
  } else {
    const expected = Array.from(ftp.genres.keys())
      .filter((g) => (ftp.genres.get(g)?.count || 0) > 0)
      .map((g) => `${normalizeNfc(g)}.zip`)
      .sort((a, b) => a.localeCompare(b))
    const missingZipInFtp = expected.filter((z) => !ftpZipNames.has(normalizeNfc(z)))
    console.log('Esperados (segun carpetas con videos):', expected.length)
    console.log('En FTP root:', ftpZipNames.size)
    console.log('Faltan en FTP root:', missingZipInFtp.length)
    if (missingZipInFtp.length) console.log(missingZipInFtp.join('\n'))
  }

  if (!bunnyZips.ok) {
    console.log('')
    console.log('Bunny: No disponible:', bunnyZips.reason)
  } else {
    const bunnySet = new Set(bunnyZips.zips.map((z) => normalizeNfc(z)))
    console.log('')
    console.log('Bunny zips (bajo prefijo):', bunnyZips.zips.length, 'prefijo=', BUNNY_PACK_PREFIX || '(root)')
    if (ftp.ok) {
      const expected = Array.from(ftp.genres.keys())
        .filter((g) => (ftp.genres.get(g)?.count || 0) > 0)
        .map((g) => `${normalizeNfc(g)}.zip`)
      const missing = expected.filter((z) => !bunnySet.has(normalizeNfc(z))).sort((a, b) => a.localeCompare(b))
      if (missing.length === 0) {
        console.log('✓ Bunny tiene todos los ZIP esperados.')
      } else {
        console.log('⚠ ZIPs faltantes en Bunny:', missing.length)
        console.log(missing.join('\n'))
      }
    }
  }

  console.log('')
  console.log('Fin.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
