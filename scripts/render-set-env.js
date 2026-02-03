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

// Lista canónica de variables que el proyecto usa (nombres exactos como en el código).
// Solo se suben a Render las keys que estén aquí; evita subir claves obsoletas o con typo.
const PROJECT_RENDER_KEYS = [
  'NODE_ENV',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_APP_NAME',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'NEXT_PUBLIC_STRIPE_PUBLIC_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_USE_SANDBOX',
  'NEXT_PUBLIC_PAYPAL_USE_SANDBOX',
  'FIX_ADMIN_SECRET',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_EMAIL',
  'NEXT_PUBLIC_ADMIN_EMAIL',
  'NEXT_PUBLIC_META_PIXEL_ID',
  'NEXT_PUBLIC_FB_PIXEL_ID',
  'NEXT_PUBLIC_META_PIXEL_DISABLED',
  'NEXT_PUBLIC_META_PIXEL_ENABLED',
  'FACEBOOK_CAPI_ACCESS_TOKEN',
  'FB_ACCESS_TOKEN',
  'NEXT_PUBLIC_WHATSAPP_NUMBER',
  'NEXT_PUBLIC_MANYCHAT_PAGE_ID',
  'NEXT_PUBLIC_MANYCHAT_ID',
  'MANYCHAT_API_KEY',
  'NEXT_PUBLIC_CLARITY_PROJECT_ID',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_VERIFY_SERVICE_SID',
  'TWILIO_PHONE_NUMBER',
  'TWILIO_WHATSAPP_NUMBER',
  'DEV_OTP_BYPASS_CODE',
  'BREVO_API_KEY',
  'BREVO_SMS_API_KEY',
  'BREVO_SMS_SENDER',
  'BREVO_SMS_WEBHOOK_URL',
  'BREVO_SMTP_KEY',
  'BREVO_MCP_TOKEN',
  'RESEND_API_KEY',
  'BUNNY_API_KEY',
  'BUNNY_STORAGE_ZONE',
  'BUNNY_STORAGE_PASSWORD',
  'BUNNY_CDN_URL',
  'NEXT_PUBLIC_BUNNY_CDN_URL',
  'BUNNY_TOKEN_KEY',
  'BUNNY_PACK_PATH_PREFIX',
  'BUNNY_PACK_PREFIX',
  'BUNNY_PULL_ZONE',
  'BUNNY_SECURITY_KEY',
  'BUNNY_STREAM_LIBRARY_ID',
  'BUNNY_STREAM_API_KEY',
  'FTP_HOST',
  'FTP_USER',
  'FTP_PASSWORD',
  'FTP_BASE_PATH',
  'FTP_VIDEOS_PATH',
  'FTP_SECURE',
  'FTP_USE_TLS',
  'FTP_INSECURE',
  'HETZNER_FTP_HOST',
  'HETZNER_FTP_USER',
  'HETZNER_FTP_PASSWORD',
  'HETZNER_ROBOT_USER',
  'HETZNER_ROBOT_PASSWORD',
  'HETZNER_STORAGEBOX_ID',
  'NEXT_PUBLIC_FTP_HOST',
  'VIDEOS_PATH',
  'USE_VIDEOS_FROM_DB',
  'OPENAI_API_KEY',
  'OPENAI_CHAT_MODEL',
  'ADMIN_EMAIL_WHITELIST',
  'CURRENCY_USD_TO_MXN_RATE',
  'NEXT_PUBLIC_URL',
]

// Mínimo imprescindible en Render para que la app funcione (login, checkout, webhooks).
// PayPal es opcional; si no usas PayPal, no hace falta tener esas 4 variables.
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
  const allowedKeys = new Set(PROJECT_RENDER_KEYS)
  const vars = []
  const skippedUnknown = []
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (!m) return
      const key = m[1].trim()
      const raw = m[2].trim().replace(/^["']|["']$/g, '')
      if (skipKeys.includes(key)) return
      if (!allowedKeys.has(key)) {
        if (raw) skippedUnknown.push(key)
        return
      }
      if (!raw) return
      vars.push({ key, value: overrides[key] ?? raw })
    })
  }
  if (skippedUnknown.length) {
    console.log('   ⚠️ En .env.local pero no en PROJECT_RENDER_KEYS (no se suben):', skippedUnknown.join(', '))
    console.log('   Si son del proyecto, añádelas en scripts/render-set-env.js → PROJECT_RENDER_KEYS')
  }

  // Bunny: si no están en .env.local, tomar de process.env (p. ej. .env)
  const BUNNY_KEYS = ['BUNNY_CDN_URL', 'NEXT_PUBLIC_BUNNY_CDN_URL', 'BUNNY_API_KEY', 'BUNNY_STORAGE_ZONE', 'BUNNY_STORAGE_PASSWORD', 'BUNNY_TOKEN_KEY', 'BUNNY_PACK_PATH_PREFIX']
  const hasKey = (k) => vars.some((v) => v.key === k)
  const isPlaceholder = (v) => !v || /^tu_|^xxx$|^\.\.\.$|clave_secreta|password_de|^re_$/i.test(String(v).trim())
  function isValidBunnyCdnUrl(url) {
    if (!url || url.length < 15) return false
    try {
      const u = new URL(url)
      if (u.protocol !== 'https:') return false
      return (u.hostname || '').length >= 8
    } catch { return false }
  }
  function isValidBunnyTokenKey(key) {
    const k = String(key || '').trim()
    return k.length >= 8 && k.length <= 500
  }
  for (const key of BUNNY_KEYS) {
    if (hasKey(key)) continue
    const val = process.env[key]
    if (val && !isPlaceholder(val)) {
      vars.push({ key, value: val })
      console.log('   (Bunny desde .env)', key)
    }
  }

  // Validar Bunny antes de subir: advertir si valores son inválidos
  const cdnVal = (process.env.NEXT_PUBLIC_BUNNY_CDN_URL || process.env.BUNNY_CDN_URL || '').trim().replace(/\/+$/, '')
  const tokenVal = (process.env.BUNNY_TOKEN_KEY || '').trim()
  if (vars.some((v) => v.key.startsWith('BUNNY_') || v.key === 'NEXT_PUBLIC_BUNNY_CDN_URL')) {
    if (cdnVal && !isValidBunnyCdnUrl(cdnVal)) {
      console.warn('   ⚠️ NEXT_PUBLIC_BUNNY_CDN_URL/BUNNY_CDN_URL parece inválida: debe ser https://tu-zona.b-cdn.net (sin barra final).')
    }
    if (tokenVal && !isValidBunnyTokenKey(tokenVal)) {
      console.warn('   ⚠️ BUNNY_TOKEN_KEY parece inválida: debe tener entre 8 y 500 caracteres (Token Auth de Bunny → Pull Zone → Security).')
    }
    if (!cdnVal || !tokenVal) {
      console.warn('   ⚠️ Para demos/thumbnails necesitas NEXT_PUBLIC_BUNNY_CDN_URL y BUNNY_TOKEN_KEY correctos en .env.local.')
    }
  }

  // ManyChat: igual, desde process.env si se pasa (ej. MANYCHAT_API_KEY=xxx npm run deploy:env)
  const MANYCHAT_KEYS = ['MANYCHAT_API_KEY', 'NEXT_PUBLIC_MANYCHAT_PAGE_ID']
  for (const key of MANYCHAT_KEYS) {
    if (hasKey(key)) continue
    const val = process.env[key]
    if (val && val.trim()) {
      vars.push({ key, value: val.trim() })
      console.log('   (ManyChat desde env)', key)
    }
  }

  // FIX_ADMIN_SECRET: siempre subir a Render (fix-admin?token=valor)
  if (!vars.some((v) => v.key === 'FIX_ADMIN_SECRET')) {
    vars.push({ key: 'FIX_ADMIN_SECRET', value: overrides.FIX_ADMIN_SECRET })
    console.log('   (FIX_ADMIN_SECRET fijo para /fix-admin)')
  }

  // REQUIRED_KEYS: si falta alguna en vars, subir con valor por defecto para que Render no quede incompleto
  const requiredDefaults = {
    NODE_ENV: 'production',
    NEXT_PUBLIC_APP_URL: appUrl,
  }
  for (const key of REQUIRED_KEYS) {
    if (vars.some((v) => v.key === key)) continue
    const val = requiredDefaults[key] || process.env[key]
    if (val) {
      vars.push({ key, value: val })
      console.log('   (Requerida por defecto)', key)
    }
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
    console.log('   🐰 Bunny:', bunnyPushed, 'variable(s) subidas.')
    console.log('   Tras el deploy, abre https://bear-beat2027.onrender.com/api/debug-config para verificar que la config sea correcta.')
  } else {
    console.log('   Para demos por Bunny: añade NEXT_PUBLIC_BUNNY_CDN_URL y BUNNY_TOKEN_KEY en .env.local y vuelve a ejecutar: npm run deploy:env')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
