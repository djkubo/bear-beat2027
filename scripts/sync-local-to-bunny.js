#!/usr/bin/env node
/**
 * Sube a Bunny Storage desde carpeta local (API: storage.bunnycdn.com).
 *
 * Credenciales (prioridad): .env.local → bunny-storage-credenciales.txt
 *   - BUNNY_STORAGE_ZONE: nombre exacto de la zona en Bunny (ej. bearbeat)
 *   - BUNNY_STORAGE_PASSWORD: Password de "FTP & API Access", no Read-only
 *
 * Valores por defecto:
 *   - Ruta local: /Volumes/Extreme Pro/Videos Enero 2026
 *   - Zona: bear-beat (normalizada a minúsculas; en Bunny suele ser bearbeat)
 *   - Prefijo en Storage: Videos Enero 2026
 *   - Hostname: storage.bunnycdn.com (BUNNY_STORAGE_HOST)
 *
 * Ejecutar: npm run db:sync-local-to-bunny
 * Opciones: --dry-run, --limit N
 *
 * Documentación: docs/BUNNY_STORAGE.md
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const DEFAULT_VIDEOS_PATH = '/Volumes/Extreme Pro/Videos Enero 2026';
const CREDENTIALS_FILE = path.join(ROOT, 'bunny-storage-credenciales.txt');
const PASSWORD_FILE = path.join(ROOT, 'bunny-storage-password.txt');
const ZONE_FILE = path.join(ROOT, 'bunny-storage-zone.txt');

function loadEnv(file) {
  const envPath = path.join(ROOT, file);
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const idx = line.indexOf('=');
    if (idx <= 0) return;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !key.startsWith('#')) process.env[key] = val;
  });
}
loadEnv('.env');
loadEnv('.env.local');

// bunny-storage-credenciales.txt: línea 1 = nombre zona (o Username), línea 2 = Password. Línea 3 opcional: ny o uk (región).
function readCredentialsFile() {
  if (!fs.existsSync(CREDENTIALS_FILE)) return null;
  let content = fs.readFileSync(CREDENTIALS_FILE, 'utf8').replace(/\uFEFF/g, '');
  const lines = content.split(/\r?\n/).map((l) => l.replace(/\r/g, '').trim()).filter((l) => l && !l.startsWith('#'));
  if (lines.length < 2) return null;
  const zone = lines[0].trim();
  const password = lines[1].trim();
  if (/USERNAME_AQUI|PASSWORD_AQUI|pegala|pega aquí/i.test(zone) || /PASSWORD_AQUI|USERNAME_AQUI|pegala|pega aquí/i.test(password)) return null;
  if (password.length < 8) return null;
  const region = (lines[2] || '').trim().toLowerCase();
  return { zone, password, region: region === 'ny' || region === 'uk' ? region : '' };
}

function readPasswordFromFile() {
  const cred = readCredentialsFile();
  if (cred) return cred.password;
  if (!fs.existsSync(PASSWORD_FILE)) return '';
  let content = fs.readFileSync(PASSWORD_FILE, 'utf8').replace(/\uFEFF/g, '');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const t = line.replace(/\r/g, '').trim();
    if (t.length < 8) continue;
    if (t.startsWith('#')) continue;
    if (/PASSWORD_AQUI|pegala|pega aquí/i.test(t)) continue;
    return t;
  }
  return '';
}

// Prioridad: 1) .env.local  2) bunny-storage-credenciales.txt  3) valores por defecto
let BUNNY_STORAGE_ZONE = (process.env.BUNNY_STORAGE_ZONE || '').trim();
let BUNNY_STORAGE_REGION = '';
let BUNNY_STORAGE_PASSWORD = (process.env.BUNNY_STORAGE_PASSWORD || process.env.BUNNY_STORAGE_API_KEY || '').trim();

const credFromFile = readCredentialsFile();
if (!BUNNY_STORAGE_ZONE && credFromFile) BUNNY_STORAGE_ZONE = credFromFile.zone;
if (!BUNNY_STORAGE_PASSWORD && credFromFile) BUNNY_STORAGE_PASSWORD = credFromFile.password;
if (credFromFile && credFromFile.region) BUNNY_STORAGE_REGION = credFromFile.region;

if (!BUNNY_STORAGE_ZONE && fs.existsSync(ZONE_FILE)) {
  BUNNY_STORAGE_ZONE = fs.readFileSync(ZONE_FILE, 'utf8').split('\n')[0].trim();
}
if (!BUNNY_STORAGE_ZONE) BUNNY_STORAGE_ZONE = 'bear-beat';
BUNNY_STORAGE_ZONE = BUNNY_STORAGE_ZONE.toLowerCase().replace(/\s+/g, '-');

if (!BUNNY_STORAGE_PASSWORD) BUNNY_STORAGE_PASSWORD = readPasswordFromFile();

let BUNNY_PACK_PREFIX = (process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || '').trim().replace(/\/$/, '');
if (!BUNNY_PACK_PREFIX) BUNNY_PACK_PREFIX = 'Videos Enero 2026';

const VIDEO_OR_THUMB_EXT = /\.(mp4|mov|avi|mkv|jpg|jpeg)$/i;
const ZIP_EXT = /\.zip$/i;

// Hostname por defecto: storage.bunnycdn.com (Bunny Storage API)
const BUNNY_STORAGE_HOSTNAME = (process.env.BUNNY_STORAGE_HOST || 'storage.bunnycdn.com').replace(/^https?:\/\//, '').replace(/\/$/, '');

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) return 'video/mp4';
  if (ext === '.zip') return 'application/zip';
  if (['.jpg', '.jpeg'].includes(ext)) return 'image/jpeg';
  return 'application/octet-stream';
}

function getStorageHost() {
  if (process.env.BUNNY_STORAGE_HOST) return BUNNY_STORAGE_HOSTNAME;
  return BUNNY_STORAGE_REGION ? BUNNY_STORAGE_REGION + '.storage.bunnycdn.com' : BUNNY_STORAGE_HOSTNAME;
}

async function uploadFileToBunny(bunnyPath, localPath) {
  const stat = fs.statSync(localPath);
  const stream = fs.createReadStream(localPath);
  const host = getStorageHost();
  const url = `https://${host}/${BUNNY_STORAGE_ZONE}/${bunnyPath}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: BUNNY_STORAGE_PASSWORD,
      'Content-Type': getContentType(bunnyPath),
      'Content-Length': String(stat.size),
    },
    body: stream,
    duplex: 'half',
  });
  return res;
}

async function main() {
  const args = process.argv.slice(2);
  let basePath = args.find((a) => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null;

  if (!basePath && fs.existsSync(DEFAULT_VIDEOS_PATH)) basePath = DEFAULT_VIDEOS_PATH;
  if (!basePath || !fs.existsSync(basePath)) {
    console.error('❌ Carpeta de videos no encontrada. Conecta el disco "Extreme Pro" o ejecuta con la ruta:');
    console.error('   npm run db:sync-local-to-bunny -- "/ruta/a/Videos Enero 2026"');
    process.exit(1);
  }
  if (!BUNNY_STORAGE_PASSWORD) BUNNY_STORAGE_PASSWORD = readPasswordFromFile();
  if (!BUNNY_STORAGE_PASSWORD) {
    const template = '# En Bunny: Storage → tu zona → pestaña "FTP & API Access".\n# Línea 1: pega el USERNAME (tal cual aparece).\n# Línea 2: pega el PASSWORD (clic en "Password" para revelar; NO uses Read-only password).\n# Borra USERNAME_AQUI y PASSWORD_AQUI, guarda (Cmd+S), luego ejecuta: npm run db:sync-local-to-bunny\nUSERNAME_AQUI\nPASSWORD_AQUI\n';
    if (!fs.existsSync(CREDENTIALS_FILE)) fs.writeFileSync(CREDENTIALS_FILE, template, 'utf8');
    console.error('❌ Falta credenciales de Bunny (solo la primera vez).');
    console.error('');
    console.error('   1. Abre:  bunny-storage-credenciales.txt');
    console.error('   2. Línea 1: borra USERNAME_AQUI y pega el Username de Bunny (FTP & API Access).');
    console.error('   3. Línea 2: borra PASSWORD_AQUI y pega el Password (clic en "Password", no Read-only).');
    console.error('   4. Guarda (Cmd+S) y ejecuta:');
    console.error('');
    console.error('      cd "' + ROOT + '" && npm run db:sync-local-to-bunny');
    console.error('');
    process.exit(1);
  }

  // Probar credenciales: hostname por defecto storage.bunnycdn.com (o BUNNY_STORAGE_HOST / región)
  const hostsToTry = BUNNY_STORAGE_REGION
    ? [getStorageHost()]
    : [BUNNY_STORAGE_HOSTNAME];
  let testRes = null;
  let workingHost = null;
  for (const host of hostsToTry) {
    const testUrl = `https://${host}/${BUNNY_STORAGE_ZONE}/`;
    testRes = await fetch(testUrl, {
      method: 'GET',
      headers: { Accept: 'application/json', AccessKey: BUNNY_STORAGE_PASSWORD },
    });
    if (testRes.status === 200 || testRes.status === 404) {
      workingHost = host;
      const regionPart = host.split('.')[0];
      if (regionPart === 'ny' || regionPart === 'uk') BUNNY_STORAGE_REGION = regionPart;
      break;
    }
    if (testRes.status !== 401) break;
  }
  if (!workingHost && testRes && testRes.status === 401) {
    console.error('❌ 401 Unauthorized: Bunny rechazó la clave (host: ' + BUNNY_STORAGE_HOSTNAME + ').');
    console.error('');
    console.error('   Zona usada:', BUNNY_STORAGE_ZONE);
    console.error('');
    console.error('   En bunny-storage-credenciales.txt:');
    console.error('   - Línea 1: debe ser el NOMBRE de tu zona (Bunny → Storage → el nombre en la lista).');
    console.error('   - Línea 2: solo el Password (FTP & API Access → "Password", NO "Read-only").');
    console.error('   - Línea 3 (opcional): escribe  ny  o  uk  si tu zona está en esa región.');
    console.error('');
    console.error('   En Bunny: prueba "Reset password" en FTP & API Access y pega la nueva en línea 2.');
    console.error('');
    process.exit(1);
  }
  if (testRes && !testRes.ok && testRes.status !== 404) {
    console.error('❌ Bunny respondió', testRes.status, await testRes.text());
    process.exit(1);
  }

  const entries = fs.readdirSync(basePath, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));
  const zipFiles = entries.filter((e) => e.isFile() && ZIP_EXT.test(e.name));

  const toUpload = [];

  for (const dir of dirs) {
    const genrePath = path.join(basePath, dir.name);
    const files = fs.readdirSync(genrePath, { withFileTypes: true });
    for (const f of files) {
      if (f.isFile() && VIDEO_OR_THUMB_EXT.test(f.name)) {
        toUpload.push({
          bunnyPath: BUNNY_PACK_PREFIX ? `${BUNNY_PACK_PREFIX}/${dir.name}/${f.name}` : `${dir.name}/${f.name}`,
          localPath: path.join(genrePath, f.name),
          size: fs.statSync(path.join(genrePath, f.name)).size,
        });
      }
    }
  }

  for (const z of zipFiles) {
    const localPath = path.join(basePath, z.name);
    toUpload.push({
      bunnyPath: BUNNY_PACK_PREFIX ? `${BUNNY_PACK_PREFIX}/${z.name}` : z.name,
      localPath,
      size: fs.statSync(localPath).size,
    });
  }

  const total = toUpload.length;
  const toProcess = limit ? toUpload.slice(0, limit) : toUpload;

  console.log('--- Local → Bunny Storage');
  console.log('Origen:', basePath);
  console.log('Destino Bunny:', BUNNY_PACK_PREFIX || '(raíz)');
  console.log('Total archivos:', total, limit ? `(procesando ${toProcess.length})` : '');
  console.log('Modo:', dryRun ? 'dry-run (no sube)' : 'subida');
  console.log('');

  if (dryRun) {
    toProcess.forEach((f) => console.log('  ', f.bunnyPath, `(${(f.size / 1024 / 1024).toFixed(2)} MB)`));
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const f of toProcess) {
    try {
      const res = await uploadFileToBunny(f.bunnyPath, f.localPath);
      if (res.ok) {
        console.log('✓', f.bunnyPath);
        ok++;
      } else {
        console.warn('⊘', f.bunnyPath, res.status, await res.text());
        fail++;
      }
    } catch (e) {
      console.warn('⊘', f.bunnyPath, e?.message || e);
      fail++;
    }
  }

  console.log('');
  console.log('Listo. Subidos:', ok, '| Fallos:', fail);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
