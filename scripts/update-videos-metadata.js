#!/usr/bin/env node
/**
 * Actualiza duration (y opcionalmente más metadata) de la tabla videos
 * usando ffprobe sobre archivos locales. Ejecutar donde tengas la carpeta de videos.
 *
 * Requisitos: ffprobe en PATH, .env.local con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 * Opcional: VIDEOS_PATH o carpeta "Videos Enero 2026" en la raíz del proyecto.
 *
 * Uso: node scripts/update-videos-metadata.js
 *      npm run db:update-videos-metadata
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

function loadEnv(file) {
  const envPath = path.join(__dirname, '..', file)
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf8')
  content.split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) {
      const key = m[1].trim()
      const val = m[2].trim().replace(/^["']|["']$/g, '')
      process.env[key] = val
    }
  })
}
loadEnv('.env')
loadEnv('.env.local')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const VIDEOS_BASE = process.env.VIDEOS_PATH || path.join(__dirname, '..', 'Videos Enero 2026')
const PACK_SLUG = 'enero-2026'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

try {
  execSync('ffprobe -version', { stdio: 'ignore' })
} catch {
  console.error('❌ ffprobe no encontrado. Instala ffmpeg (incluye ffprobe).')
  process.exit(1)
}

async function main() {
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: pack, error: packErr } = await supabase.from('packs').select('id').eq('slug', PACK_SLUG).single()
  if (packErr || !pack) {
    console.error('❌ Pack no encontrado (slug:', PACK_SLUG, ')')
    process.exit(1)
  }

  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, file_path, duration')
    .eq('pack_id', pack.id)

  if (error || !videos?.length) {
    console.error('❌ No hay videos en la tabla o error:', error?.message)
    process.exit(1)
  }

  if (!fs.existsSync(VIDEOS_BASE)) {
    console.error('❌ Carpeta de videos no encontrada:', VIDEOS_BASE)
    console.error('   Configura VIDEOS_PATH en .env.local o coloca "Videos Enero 2026" en la raíz.')
    process.exit(1)
  }

  console.log('✓ Videos a revisar:', videos.length)
  console.log('✓ Carpeta base:', VIDEOS_BASE)

  let updated = 0
  let skipped = 0
  let notFound = 0

  for (const v of videos) {
    const fullPath = path.join(VIDEOS_BASE, v.file_path)
    if (!fs.existsSync(fullPath)) {
      notFound++
      continue
    }

    if (v.duration != null && v.duration > 0) {
      skipped++
      continue
    }

    try {
      const out = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${fullPath.replace(/"/g, '\\"')}"`,
        { encoding: 'utf8', maxBuffer: 1024 * 1024 }
      )
      const durationSec = Math.floor(parseFloat(out.trim()) || 0)
      if (durationSec <= 0) continue

      const { error: upErr } = await supabase.from('videos').update({ duration: durationSec }).eq('id', v.id)
      if (upErr) {
        console.warn('⚠ No se pudo actualizar', v.file_path, upErr.message)
      } else {
        updated++
        process.stdout.write(`\r  Actualizados: ${updated} | No encontrados: ${notFound} | Omitidos (ya tenían duration): ${skipped}`)
      }
    } catch (e) {
      // ffprobe falló (archivo corrupto, etc.)
    }
  }

  console.log('\n✅ Listo. Duration actualizada para', updated, 'videos.')
  if (notFound > 0) console.log('   Archivos no encontrados en', VIDEOS_BASE, ':', notFound)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
