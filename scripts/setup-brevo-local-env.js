#!/usr/bin/env node
/**
 * Añade BREVO_SENDER_EMAIL y BREVO_SENDER_NAME a .env.local si no existen.
 * Uso: node scripts/setup-brevo-local-env.js
 * La API key (BREVO_API_KEY) debes pegarla tú en .env.local desde Brevo → SMTP & API → API Keys.
 */

const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
const lines = [
  '',
  '# Brevo (remitente thebearbeat.com)',
  'BREVO_SENDER_EMAIL=noreply@thebearbeat.com',
  'BREVO_SENDER_NAME=Bear Beat',
  '# BREVO_API_KEY=xkeysib-...  (pega tu API key de Brevo aquí)',
]

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, lines.join('\n').trimStart() + '\n', 'utf8')
  console.log('Creado .env.local con BREVO_SENDER_EMAIL y BREVO_SENDER_NAME.')
  console.log('Añade BREVO_API_KEY con tu clave de Brevo (Settings → SMTP & API → API Keys).')
  process.exit(0)
}

const content = fs.readFileSync(envPath, 'utf8')
const hasSenderEmail = /^\s*BREVO_SENDER_EMAIL\s*=/m.test(content)
const hasSenderName = /^\s*BREVO_SENDER_NAME\s*=/m.test(content)

if (hasSenderEmail && hasSenderName) {
  console.log('.env.local ya tiene BREVO_SENDER_EMAIL y BREVO_SENDER_NAME.')
  process.exit(0)
}

const toAppend = []
if (!hasSenderEmail) toAppend.push('BREVO_SENDER_EMAIL=noreply@thebearbeat.com')
if (!hasSenderName) toAppend.push('BREVO_SENDER_NAME=Bear Beat')
if (toAppend.length === 0) process.exit(0)

const append = '\n# Brevo (thebearbeat.com)\n' + toAppend.join('\n') + '\n'
fs.appendFileSync(envPath, append, 'utf8')
console.log('Añadido a .env.local:', toAppend.join(', '))
console.log('Si falta BREVO_API_KEY, pégala desde Brevo → Settings → SMTP & API → API Keys.')
