/**
 * Sube las variables de .env.local al servicio en Render.
 * Uso: RENDER_API_KEY=tu_api_key node scripts/upload-env-to-render.js
 * Requiere: tener .env.local en la raíz del proyecto.
 */

const fs = require('fs')
const path = require('path')

const API_KEY = process.env.RENDER_API_KEY
if (!API_KEY) {
  console.error('Falta RENDER_API_KEY. Uso: RENDER_API_KEY=xxx node scripts/upload-env-to-render.js')
  process.exit(1)
}

const envPath = path.join(__dirname, '..', '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('No existe .env.local en la raíz del proyecto.')
  process.exit(1)
}

const content = fs.readFileSync(envPath, 'utf8')
const envVars = []

for (const line of content.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq <= 0) continue
  const key = trimmed.slice(0, eq).trim()
  if (!key) continue
  let value = trimmed.slice(eq + 1).trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }
  envVars.push({ key, value })
}

async function main() {
  const base = 'https://api.render.com/v1'
  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }

  const listRes = await fetch(`${base}/services`, { headers })
  if (!listRes.ok) {
    console.error('Error listando servicios:', listRes.status, await listRes.text())
    process.exit(1)
  }
  const listData = await listRes.json()
  const items = Array.isArray(listData) ? listData : listData.items || []
  const serviceItem = items.find((item) => item.service?.name === 'bear-beat') || items.find((item) => item.service) || items[0]
  const service = serviceItem?.service || serviceItem
  if (!service || !service.id) {
    console.error('No se encontró ningún servicio en Render. Respuesta:', JSON.stringify(listData).slice(0, 200))
    process.exit(1)
  }
  console.log('Servicio:', service.name, '(id:', service.id + ')')

  const filtered = envVars.filter((e) => e.key && String(e.key).trim())
  const body = JSON.stringify(filtered)
  const putRes = await fetch(`${base}/services/${service.id}/env-vars`, {
    method: 'PUT',
    headers,
    body,
  })
  if (!putRes.ok) {
    const text = await putRes.text()
    console.error('Error subiendo variables:', putRes.status, text)
    process.exit(1)
  }
  console.log('Variables subidas:', filtered.length)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
