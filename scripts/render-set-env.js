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

// Cargar .env y luego .env.local (local sobreescribe)
const rootDir = path.join(__dirname, '..')
const envPaths = [
  path.join(rootDir, '.env'),
  path.join(rootDir, '.env.local'),
]
for (const envPath of envPaths) {
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
}
const envPath = path.join(rootDir, '.env.local')

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

async function getEnvVars(serviceId) {
  const res = await fetch(`${BASE}/services/${serviceId}/env-vars`, { headers: HEADERS })
  if (!res.ok) throw new Error(`List env vars: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return Array.isArray(data) ? data : data.envVars || []
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

// Solo para comprobar que existan en Render; la subida usa TODAS las vars de .env.local
const REQUIRED_KEYS = [
  'NEXT_PUBLIC_APP_URL',
  'NODE_ENV',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'NEXT_PUBLIC_STRIPE_PUBLIC_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'FIX_ADMIN_SECRET',
  'NEXT_PUBLIC_PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_USE_SANDBOX',
  'NEXT_PUBLIC_PAYPAL_USE_SANDBOX',
]

async function main() {
  console.log('🔑 Obteniendo service ID...')
  const serviceId = await getServiceId()
  console.log('   Service ID:', serviceId)

  console.log('📋 Comprobando variables en Render...')
  let renderVars = []
  try {
    renderVars = await getEnvVars(serviceId)
    const renderKeys = renderVars.map((v) => v.key ?? v.envVar?.key ?? v.name).filter(Boolean)
    console.log('   En Render:', renderKeys.length, 'variables')
    const missing = REQUIRED_KEYS.filter((k) => !renderKeys.includes(k))
    if (missing.length) {
      console.log('   ⚠️  Faltan en Render:', missing.join(', '))
    } else {
      console.log('   ✅ Todas las variables requeridas existen en Render')
    }
  } catch (e) {
    console.warn('   (No se pudo listar vars en Render:', e.message, ')')
  }

  const appUrl = 'https://bear-beat2027.onrender.com'
  const skipKeys = ['RENDER_API_KEY', 'RENDER_SERVICE_ID']
  const overrides = {
    NEXT_PUBLIC_APP_URL: appUrl,
    NODE_ENV: 'production',
    FIX_ADMIN_SECRET: process.env.FIX_ADMIN_SECRET || 'bearbeat-admin-2027-secreto',
  }
  const vars = []
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (!m) return
      const key = m[1].trim()
      const raw = m[2].trim().replace(/^["']|["']$/g, '')
      if (skipKeys.includes(key) || !raw) return
      vars.push({ key, value: overrides[key] ?? raw })
    })
  }

  // Bunny: si no están en .env.local, tomar de process.env (p. ej. .env)
  const BUNNY_KEYS = ['BUNNY_CDN_URL', 'NEXT_PUBLIC_BUNNY_CDN_URL', 'BUNNY_API_KEY', 'BUNNY_STORAGE_ZONE', 'BUNNY_STORAGE_PASSWORD', 'BUNNY_TOKEN_KEY', 'BUNNY_PACK_PATH_PREFIX']
  const hasKey = (k) => vars.some((v) => v.key === k)
  const isPlaceholder = (v) => !v || /^tu_|^xxx$|^\.\.\.$|clave_secreta|password_de|^re_$/i.test(String(v).trim())
  for (const key of BUNNY_KEYS) {
    if (hasKey(key)) continue
    const val = process.env[key]
    if (val && !isPlaceholder(val)) {
      vars.push({ key, value: val })
      console.log('   (Bunny desde .env)', key)
    }
  }

  // FIX_ADMIN_SECRET: siempre subir a Render (fix-admin?token=valor)
  if (!vars.some((v) => v.key === 'FIX_ADMIN_SECRET')) {
    vars.push({ key: 'FIX_ADMIN_SECRET', value: overrides.FIX_ADMIN_SECRET })
    console.log('   (FIX_ADMIN_SECRET fijo para /fix-admin)')
  }

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

  // Disparar deploy para que el build use las nuevas variables (NEXT_PUBLIC_* se inyectan en build)
  console.log('\n🚀 Disparando deploy en Render...')
  try {
    const deployRes = await fetch(`${BASE}/services/${serviceId}/deploys`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({}),
    })
    if (deployRes.ok) {
      const text = await deployRes.text()
      let deployId = null
      if (text) {
        try {
          const deployData = JSON.parse(text)
          deployId = deployData.id ?? deployData.deploy?.id
        } catch (_) {}
      }
      console.log('   ✅ Deploy iniciado.' + (deployId ? ` ID: ${deployId}` : ''))
      console.log('   En Render → Deploys verás el build en curso. Las NEXT_PUBLIC_* ya están en Environment.')
    } else {
      console.warn('   ⚠️ No se pudo disparar deploy:', deployRes.status, await deployRes.text())
      console.log('   Haz un Manual Deploy en Render para que el build use las nuevas variables.')
    }
  } catch (e) {
    console.warn('   ⚠️ Error al disparar deploy:', e.message)
    console.log('   Haz un Manual Deploy en Render para que el build use las nuevas variables.')
  }

  const bunnyPushed = vars.filter((v) => v.key.startsWith('BUNNY_') || v.key === 'NEXT_PUBLIC_BUNNY_CDN_URL').length
  if (bunnyPushed) {
    console.log('   🐰 Bunny:', bunnyPushed, 'variable(s) subidas (demos/descargas por CDN).')
  } else {
    console.log('   Para demos por Bunny: añade BUNNY_CDN_URL en .env.local y vuelve a ejecutar: npm run deploy:env')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
