#!/usr/bin/env node
/**
 * Sync de ZIPs en la RAÍZ del FTP (Hetzner) hacia Bunny Storage.
 *
 * Problema típico:
 * - Los videos están en Bunny (Videos Enero 2026/Genero/*.mp4) pero algunos ZIP (Genero.zip)
 *   siguen viviendo en el FTP root → /api/download?file=Genero.zip falla en Bunny y/o es lento.
 *
 * Este script:
 * 1) Lista *.zip en el root del FTP
 * 2) Lista *.zip en Bunny Storage bajo BUNNY_PACK_PATH_PREFIX/
 * 3) Sube SOLO los que faltan (streaming: FTP → Bunny, sin guardar a disco)
 *
 * Requisitos (.env.local):
 * - FTP_HOST, FTP_USER, FTP_PASSWORD
 * - BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD
 * - BUNNY_PACK_PATH_PREFIX (ej. "Videos Enero 2026")
 *
 * Uso:
 *   node scripts/sync-root-zips-to-bunny.js --dry-run
 *   node scripts/sync-root-zips-to-bunny.js
 *   node scripts/sync-root-zips-to-bunny.js --limit 2
 *   node scripts/sync-root-zips-to-bunny.js --include-pack-completo
 */

const path = require('path')
const fs = require('fs')
const stream = require('stream')
const { PassThrough } = stream

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

const FTP_HOST = process.env.FTP_HOST || process.env.HETZNER_FTP_HOST
const FTP_USER = process.env.FTP_USER || process.env.HETZNER_FTP_USER
const FTP_PASSWORD = process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD

const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || ''
const BUNNY_STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD || ''
const BUNNY_PACK_PREFIX = String(process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || '')
  .trim()
  .replace(/\/+$/, '')

const ZIP_EXT = /\.zip$/i
const FTP_SOCKET_TIMEOUT_MS = Number(process.env.FTP_SYNC_TIMEOUT_MS || 30 * 60 * 1000) // 30 min
const MAX_RETRIES = Number(process.env.FTP_SYNC_RETRIES || 3)
const RETRY_DELAY_MS = Number(process.env.FTP_SYNC_RETRY_DELAY_MS || 5000)

function formatGB(bytes) {
  return (Number(bytes || 0) / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function listBunnyZips() {
  const url = BUNNY_PACK_PREFIX
    ? `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${BUNNY_PACK_PREFIX}/`
    : `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/`
  const res = await fetch(url, {
    headers: { AccessKey: BUNNY_STORAGE_PASSWORD, Accept: 'application/json' },
  })
  const json = await res.json().catch(async () => ({ _text: await res.text().catch(() => '') }))
  if (!res.ok) {
    const msg = typeof json === 'string' ? json : JSON.stringify(json)
    throw new Error(`Bunny list failed (${res.status}): ${msg.slice(0, 300)}`)
  }
  const items = Array.isArray(json) ? json : []
  return items
    .filter((it) => !it.IsDirectory && ZIP_EXT.test(String(it.ObjectName || '')))
    .map((it) => String(it.ObjectName))
}

async function uploadZipStreamToBunny(zipName, size, readStream) {
  const bunnyPath = BUNNY_PACK_PREFIX ? `${BUNNY_PACK_PREFIX}/${zipName}` : zipName
  const url = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${bunnyPath}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: BUNNY_STORAGE_PASSWORD,
      'Content-Type': 'application/zip',
      'Content-Length': String(size),
    },
    body: readStream,
    duplex: 'half',
  })
  return res
}

async function connectFtp() {
  const { Client } = require('basic-ftp')
  const client = new Client(FTP_SOCKET_TIMEOUT_MS)
  client.ftp.verbose = false
  await client.access({
    host: FTP_HOST,
    user: FTP_USER,
    password: FTP_PASSWORD,
    secure: process.env.FTP_SECURE === 'true' || process.env.FTP_USE_TLS === 'true',
  })
  return client
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const includePackCompleto = args.includes('--include-pack-completo')
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null

  if (!FTP_HOST || !FTP_USER || !FTP_PASSWORD) {
    console.error('❌ Configura FTP_HOST, FTP_USER, FTP_PASSWORD en .env.local')
    process.exit(1)
  }
  if (!BUNNY_STORAGE_ZONE || !BUNNY_STORAGE_PASSWORD) {
    console.error('❌ Configura BUNNY_STORAGE_ZONE y BUNNY_STORAGE_PASSWORD en .env.local')
    process.exit(1)
  }
  if (!BUNNY_PACK_PREFIX) {
    console.warn('⚠️ BUNNY_PACK_PATH_PREFIX vacío. Se subirán los ZIP a la raíz del Storage Zone.')
  }

  let client = null
  try {
    client = await connectFtp()
    const rootList = await client.list()
    const ftpZips = rootList
      .filter((f) => f.isFile && ZIP_EXT.test(String(f.name || '')))
      .map((f) => ({ name: String(f.name), size: Number(f.size || 0) }))
      .sort((a, b) => a.name.localeCompare(b.name))

    const bunnyZips = await listBunnyZips()
    const bunnySet = new Set(bunnyZips)

    let missing = ftpZips.filter((z) => !bunnySet.has(z.name))
    if (!includePackCompleto) {
      missing = missing.filter((z) => z.name !== 'Pack_Completo_Enero_2026.zip')
    }
    if (limit) missing = missing.slice(0, limit)

    console.log('--- Sync ZIPs (FTP root → Bunny Storage)')
    console.log('FTP zips:', ftpZips.length)
    console.log('Bunny zips:', bunnyZips.length)
    console.log('Missing to upload:', missing.length, dryRun ? '(dry-run)' : '')
    console.log('')

    if (missing.length === 0) {
      console.log('✓ No hay ZIPs faltantes. Listo.')
      return
    }

    for (const z of missing) {
      const label = `${z.name} (${formatGB(z.size)})`
      if (dryRun) {
        console.log('  ', label)
        continue
      }

      let ok = false
      let lastErr = null
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        process.stdout.write(`→ Subiendo ${label} ... (${attempt}/${MAX_RETRIES}) `)
        const pass = new PassThrough()
        let ftpClient = null
        try {
          // Re-conectar por archivo: evita que un timeout cierre el cliente y rompa el resto.
          ftpClient = await connectFtp()

          const uploadPromise = uploadZipStreamToBunny(z.name, z.size, pass)
          const downloadPromise = ftpClient.downloadTo(pass, z.name)

          const [, res] = await Promise.all([downloadPromise, uploadPromise])
          if (!res.ok) {
            const txt = await res.text().catch(() => '')
            console.log(`ERROR (${res.status})`)
            if (txt) console.log('   ', txt.slice(0, 400))
            lastErr = new Error(`Bunny upload failed (${res.status})`)
          } else {
            console.log('OK')
            ok = true
            break
          }
        } catch (e) {
          console.log('ERROR')
          lastErr = e
          console.error('   ', (e && e.message) || e)
          // Esperar un poco antes de reintentar (red/FTP a veces corta).
          if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS)
        } finally {
          try { pass.destroy() } catch {}
          try { ftpClient?.close?.() } catch {}
        }
      }

      if (!ok) {
        console.warn('⊘ Falló:', z.name, '→', (lastErr && lastErr.message) || lastErr)
      }
    }

    console.log('')
    console.log('✓ Fin. Nota: el CDN puede tardar unos segundos en servir el ZIP la primera vez (cache warm).')
  } finally {
    try { client?.close?.() } catch {}
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
