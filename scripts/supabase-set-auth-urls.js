#!/usr/bin/env node
/**
 * Configura en Supabase (vía Management API) el Site URL y las Redirect URLs
 * para que la sesión y los redirects funcionen en producción.
 *
 * Necesitas un Personal Access Token (PAT) de Supabase:
 * https://supabase.com/dashboard/account/tokens → Create token
 *
 * Añade en .env.local:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxx...
 *
 * Uso: node scripts/supabase-set-auth-urls.js
 *  o:  npm run supabase:set-auth-urls
 */

const fs = require('fs');
const path = require('path');

// Cargar .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  });
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!token) {
  console.error('❌ Falta SUPABASE_ACCESS_TOKEN en .env.local');
  console.error('   Genera uno en: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

if (!supabaseUrl) {
  console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL en .env.local');
  process.exit(1);
}

// ref = subdominio del proyecto (ej. mthumshmwzmkwjulpbql)
const refMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!refMatch) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL no tiene formato esperado (https://REF.supabase.co)');
  process.exit(1);
}
const ref = refMatch[1];

const SITE_URL = 'https://bear-beat2027.onrender.com';
// Redirect URLs: una por línea (formato que acepta la API)
const URI_ALLOW_LIST = [
  'https://bear-beat2027.onrender.com/**',
  'http://localhost:3000/**',
].join('\n');

async function main() {
  console.log('Configurando Auth en Supabase (proyecto:', ref, ')...');
  console.log('  Site URL:', SITE_URL);
  console.log('  Redirect URLs:', URI_ALLOW_LIST.replace(/\n/g, ', '));

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      site_url: SITE_URL,
      uri_allow_list: URI_ALLOW_LIST,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('❌ Error', res.status, res.statusText);
    console.error(text);
    process.exit(1);
  }

  const data = await res.json();
  console.log('✅ Configuración aplicada.');
  console.log('   site_url:', data.site_url ?? SITE_URL);
  console.log('   uri_allow_list:', (data.uri_allow_list ?? URI_ALLOW_LIST).split('\n').join(', '));
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
