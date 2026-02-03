#!/usr/bin/env node
/**
 * Verifica que:
 * 1) Todas las variables process.env usadas en src estén en PROJECT_RENDER_KEYS.
 * 2) Todas las tablas y RPCs de Supabase usadas en src existan en los SQL del repo.
 * Ejecutar: node scripts/verify-render-and-supabase.js
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src');
const supabaseDir = path.join(root, 'supabase');

// PROJECT_RENDER_KEYS (misma lista que render-set-env.js)
const PROJECT_RENDER_KEYS = [
  'NODE_ENV', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_APP_NAME',
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL',
  'NEXT_PUBLIC_STRIPE_PUBLIC_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_USE_SANDBOX', 'NEXT_PUBLIC_PAYPAL_USE_SANDBOX',
  'FIX_ADMIN_SECRET',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_EMAIL', 'NEXT_PUBLIC_ADMIN_EMAIL',
  'NEXT_PUBLIC_META_PIXEL_ID', 'NEXT_PUBLIC_FB_PIXEL_ID', 'NEXT_PUBLIC_META_PIXEL_DISABLED', 'NEXT_PUBLIC_META_PIXEL_ENABLED',
  'FACEBOOK_CAPI_ACCESS_TOKEN', 'FB_ACCESS_TOKEN',
  'NEXT_PUBLIC_WHATSAPP_NUMBER', 'NEXT_PUBLIC_MANYCHAT_PAGE_ID', 'NEXT_PUBLIC_MANYCHAT_ID', 'MANYCHAT_API_KEY', 'NEXT_PUBLIC_CLARITY_PROJECT_ID',
  'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_VERIFY_SERVICE_SID', 'TWILIO_PHONE_NUMBER', 'TWILIO_WHATSAPP_NUMBER', 'DEV_OTP_BYPASS_CODE',
  'RESEND_API_KEY',
  'BUNNY_API_KEY', 'BUNNY_STORAGE_ZONE', 'BUNNY_STORAGE_PASSWORD', 'BUNNY_CDN_URL', 'NEXT_PUBLIC_BUNNY_CDN_URL',
  'BUNNY_TOKEN_KEY', 'BUNNY_PACK_PATH_PREFIX', 'BUNNY_PACK_PREFIX', 'BUNNY_PULL_ZONE', 'BUNNY_SECURITY_KEY',
  'BUNNY_STREAM_LIBRARY_ID', 'BUNNY_STREAM_API_KEY',
  'FTP_HOST', 'FTP_USER', 'FTP_PASSWORD', 'FTP_BASE_PATH', 'FTP_VIDEOS_PATH', 'FTP_SECURE', 'FTP_USE_TLS', 'FTP_INSECURE',
  'HETZNER_FTP_HOST', 'HETZNER_FTP_USER', 'HETZNER_FTP_PASSWORD', 'HETZNER_ROBOT_USER', 'HETZNER_ROBOT_PASSWORD', 'HETZNER_STORAGEBOX_ID', 'NEXT_PUBLIC_FTP_HOST',
  'VIDEOS_PATH', 'USE_VIDEOS_FROM_DB',
  'OPENAI_API_KEY', 'OPENAI_CHAT_MODEL', 'ADMIN_EMAIL_WHITELIST', 'CURRENCY_USD_TO_MXN_RATE', 'NEXT_PUBLIC_URL',
];

const allowedKeysSet = new Set(PROJECT_RENDER_KEYS);

function walkDir(dir, ext, fn) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') walkDir(full, ext, fn);
    else if (e.isFile() && ext.test(e.name)) fn(full);
  }
}

const envUsed = new Set();
const tablesUsed = new Set();
const rpcsUsed = new Set();

walkDir(srcDir, /\.(ts|tsx|js|jsx)$/, (file) => {
  const content = fs.readFileSync(file, 'utf8');
  const envRe = /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g;
  let m;
  while ((m = envRe.exec(content)) !== null) envUsed.add(m[1]);
  const fromRe = /\.from\s*\(\s*['"]([a-z_]+)['"]\s*\)/g;
  while ((m = fromRe.exec(content)) !== null) tablesUsed.add(m[1]);
  const rpcRe = /\.rpc\s*\(\s*['"]([a-z_]+)['"]/g;
  while ((m = rpcRe.exec(content)) !== null) rpcsUsed.add(m[1]);
});

// 1) Env keys
const missingEnv = [...envUsed].filter((k) => !allowedKeysSet.has(k)).sort();
if (missingEnv.length) {
  console.error('❌ Variables usadas en src que NO están en PROJECT_RENDER_KEYS:', missingEnv.join(', '));
  process.exitCode = 1;
} else {
  console.log('✅ Todas las variables de entorno usadas en src están en PROJECT_RENDER_KEYS');
}

// 2) Tablas y RPCs en SQL
const sqlFiles = [];
function collectSql(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) collectSql(full);
    else if (e.name.endsWith('.sql')) sqlFiles.push(full);
  }
}
collectSql(supabaseDir);

let sqlContent = '';
for (const f of sqlFiles) sqlContent += fs.readFileSync(f, 'utf8') + '\n';

const tablesInSql = new Set();
const rpcsInSql = new Set();
const tableRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_]+)/gi;
const rpcRe = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-z_]+)\s*\(/gi;
let m;
while ((m = tableRe.exec(sqlContent)) !== null) tablesInSql.add(m[1].toLowerCase());
while ((m = rpcRe.exec(sqlContent)) !== null) rpcsInSql.add(m[1].toLowerCase());

const missingTables = [...tablesUsed].filter((t) => !tablesInSql.has(t)).sort();
const missingRpcs = [...rpcsUsed].filter((r) => !rpcsInSql.has(r)).sort();

if (missingTables.length) {
  console.error('❌ Tablas usadas en src que NO aparecen en SQL del repo:', missingTables.join(', '));
  process.exitCode = 1;
} else {
  console.log('✅ Todas las tablas Supabase usadas en src existen en los SQL');
}

if (missingRpcs.length) {
  console.error('❌ RPCs usadas en src que NO aparecen en SQL del repo:', missingRpcs.join(', '));
  process.exitCode = 1;
} else {
  console.log('✅ Todas las RPCs Supabase usadas en src existen en los SQL');
}

if (process.exitCode !== 1) console.log('\n✅ Verificación Render + Supabase OK.');
process.exit(process.exitCode || 0);
