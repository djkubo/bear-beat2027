#!/usr/bin/env node
/**
 * Añade/actualiza variables de entorno en Render vía API.
 * Necesita RENDER_API_KEY en .env.local (y opcionalmente RENDER_SERVICE_ID).
 *
 * Uso: node scripts/render-set-env.js
 *
 * Lee de .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, etc.
 * y las sube al servicio bear-beat2027 en Render (Build + Runtime).
 */

const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) {
      const key = m[1].trim()
      const val = m[2].trim().replace(/^["']|["']$/g, '')
      process.env[key] = val
    }
  })
}

const RENDER_API_KEY = process.env.RENDER_API_KEY
if (!RENDER_API_KEY) {
  console.error('❌ Falta RENDER_API_KEY en .env.local')
  console.error('   Añade: RENDER_API_KEY=rnd_xxx (desde Render Dashboard → Account → API Keys)')
  process.exit(1)
}

const BASE = 'https://api.render.com/v1'
const HEADERS = {
  'Authorization': `Bearer ${RENDER_API_KEY}`,
  'Content-Type': 'application/json',
}

async function getServiceId() {
  const res = await fetch(`${BASE}/services?limit=100`, { headers: HEADERS })
  if (!res.ok) throw new Error(`List services: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const list = Array.isArray(data) ? data : data.services || []
  const svc = list.find((s) => (s.name && s.name.toLowerCase().includes('bear-beat2027')) || (s.service && s.service.name && s.service.name.toLowerCase().includes('bear-beat2027')))
  const id = svc?.id || svc?.service?.id
  if (id) return id
  if (process.env.RENDER_SERVICE_ID) return process.env.RENDER_SERVICE_ID
  throw new Error('No se encontró servicio bear-beat2027. Añade RENDER_SERVICE_ID en .env.local (ID del servicio en Render).')
}

async function setEnvVar(serviceId, key, value) {
  const res = await fetch(`${BASE}/services/${serviceId}/env-vars/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify({ value }),
  })
  if (!res.ok) {
    const text = await res.text()
    try {
      const err = JSON.parse(text)
      if (err.message) throw new Error(err.message)
    } catch (_) {}
    throw new Error(`PUT ${key}: ${res.status} ${text}`)
  }
  return res.json()
}

async function main() {
  console.log('🔑 Obteniendo service ID...')
  const serviceId = await getServiceId()
  console.log('   Service ID:', serviceId)

  const appUrl = 'https://bear-beat2027.onrender.com'
  const skipKeys = ['RENDER_API_KEY', 'RENDER_SERVICE_ID']
  const overrides = { NEXT_PUBLIC_APP_URL: appUrl, NODE_ENV: 'production' }
  const vars = []
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (!m) return
    const key = m[1].trim()
    const raw = m[2].trim().replace(/^["']|["']$/g, '')
    if (skipKeys.includes(key) || !raw) return
    vars.push({ key, value: overrides[key] ?? raw })
  })

  for (const { key, value } of vars) {
    if (!value) {
      console.log('⏭️  Omitiendo', key, '(sin valor en .env.local)')
      continue
    }
    try {
      await setEnvVar(serviceId, key, value)
      console.log('✅', key)
    } catch (e) {
      console.error('❌', key, e.message)
    }
  }

  console.log('\n✅ Listo. Haz un Manual Deploy en Render para que el build use las nuevas variables.')
  console.log('   Si usas FTP real (Hetzner) o descargas por Bunny, añade HETZNER_ROBOT_*, HETZNER_STORAGEBOX_ID y BUNNY_* en .env.local y vuelve a ejecutar deploy:env, o configúralas en Render → Environment.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
