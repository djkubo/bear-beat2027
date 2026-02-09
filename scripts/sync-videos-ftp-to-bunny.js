#!/usr/bin/env node
/**
 * Sincroniza desde Hetzner FTP a Bunny Storage (copia "por si acaso"):
 * 1) Videos (y .jpg/.zip dentro de la carpeta de videos) → Bunny con BUNNY_PACK_PATH_PREFIX
 * 2) Portadas en raíz del FTP (Género/archivo.jpg) → Bunny en la raíz (sin prefijo)
 *
 * Requisitos en .env.local:
 *   - FTP_HOST, FTP_USER, FTP_PASSWORD (Hetzner)
 *   - BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD
 *   - BUNNY_PACK_PATH_PREFIX (ej. "Videos Enero 2026")
 *
 * Uso:
 *   node scripts/sync-videos-ftp-to-bunny.js              # videos + portadas
 *   node scripts/sync-videos-ftp-to-bunny.js --videos-only # solo videos
 *   node scripts/sync-videos-ftp-to-bunny.js --thumbs-only # solo portadas (raíz)
 *   node scripts/sync-videos-ftp-to-bunny.js --missing-only # solo sube lo que falta en Bunny (recomendado)
 *   node scripts/sync-videos-ftp-to-bunny.js --dry-run
 *   node scripts/sync-videos-ftp-to-bunny.js --limit 5
 *   npm run db:sync-videos-to-bunny
 *
 * Nota Unicode:
 * - Algunas carpetas/archivos pueden diferir entre FTP y Bunny solo por normalización (NFC/NFD).
 * - En modo --missing-only, el script mapea carpetas por NFC para no crear duplicados.
 */

const path = require('path');
const stream = require('stream');
const { PassThrough } = stream;

function normalizeNfc(input) {
  const s = String(input ?? '');
  try {
    return s.normalize('NFC');
  } catch {
    return s;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadEnv(file) {
  const fs = require('fs');
  const envPath = path.join(__dirname, '..', file);
  if (!fs.existsSync(envPath)) return;
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
loadEnv('.env');
loadEnv('.env.local');

const FTP_HOST = process.env.FTP_HOST || process.env.HETZNER_FTP_HOST;
const FTP_USER = process.env.FTP_USER || process.env.HETZNER_FTP_USER;
const FTP_PASSWORD = process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD;
const FTP_BASE = process.env.FTP_BASE_PATH || process.env.FTP_VIDEOS_PATH || 'Videos Enero 2026';
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || '';
const BUNNY_STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD || '';
const BUNNY_PACK_PREFIX = (process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || '').replace(/\/+$/, '');

const VIDEO_EXT = /\.(mp4|mov|avi|mkv|zip|jpg|jpeg)$/i;
const THUMB_EXT = /\.(jpg|jpeg)$/i;

const FTP_SOCKET_TIMEOUT_MS = Number(process.env.FTP_SYNC_TIMEOUT_MS || 30 * 60 * 1000); // 30 min
const MAX_RETRIES = Number(process.env.FTP_SYNC_RETRIES || 3);
const RETRY_DELAY_MS = Number(process.env.FTP_SYNC_RETRY_DELAY_MS || 5000);
const BUNNY_STORAGE_HOST = (process.env.BUNNY_STORAGE_HOST || 'storage.bunnycdn.com')
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '');

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) return 'video/mp4';
  if (ext === '.zip') return 'application/zip';
  if (['.jpg', '.jpeg'].includes(ext)) return 'image/jpeg';
  return 'application/octet-stream';
}

async function uploadStreamToBunny(filePath, size, readStream) {
  const url = `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${filePath}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: BUNNY_STORAGE_PASSWORD,
      'Content-Type': getContentType(filePath),
      'Content-Length': String(size),
    },
    body: readStream,
    duplex: 'half',
  });
  return res;
}

async function listBunnyDir(dirPath) {
  const pathNorm = String(dirPath || '').replace(/^\/+/, '');
  const url = new URL(`https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${pathNorm}`);
  const res = await fetch(url, {
    headers: { AccessKey: BUNNY_STORAGE_PASSWORD, Accept: 'application/json' },
  });
  if (res.status === 404) return [];
  const json = await res.json().catch(async () => ({ _text: await res.text().catch(() => '') }));
  if (!res.ok) {
    const msg = typeof json === 'string' ? json : JSON.stringify(json);
    throw new Error(`Bunny list failed (${res.status}): ${msg.slice(0, 300)}`);
  }
  return Array.isArray(json) ? json : [];
}

async function listBunnyDirs(dirPath) {
  const items = await listBunnyDir(dirPath);
  return items
    .filter((it) => !!it && !!it.IsDirectory)
    .map((it) => String(it.ObjectName || ''))
    .filter(Boolean);
}

async function getBunnyFileNameSet(dirPath, extRegex) {
  const items = await listBunnyDir(dirPath);
  const set = new Set();
  for (const it of items) {
    if (it && it.IsDirectory) continue;
    const name = String(it?.ObjectName || '');
    if (!name) continue;
    if (extRegex && !extRegex.test(name)) continue;
    set.add(normalizeNfc(name));
  }
  return set;
}

async function connectFtp() {
  const { Client } = require('basic-ftp');
  const client = new Client(FTP_SOCKET_TIMEOUT_MS);
  client.ftp.verbose = false;
  await client.access({
    host: FTP_HOST,
    user: FTP_USER,
    password: FTP_PASSWORD,
    secure: process.env.FTP_SECURE === 'true' || process.env.FTP_USE_TLS === 'true',
  });
  return client;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null;
  const videosOnly = args.includes('--videos-only');
  const thumbsOnly = args.includes('--thumbs-only');
  const missingOnly = args.includes('--missing-only');
  const doVideos = !thumbsOnly;
  const doThumbs = !videosOnly;

  if (!FTP_HOST || !FTP_USER || !FTP_PASSWORD) {
    console.error('❌ Configura FTP_HOST, FTP_USER y FTP_PASSWORD (Hetzner) en .env.local');
    process.exit(1);
  }
  if (!BUNNY_STORAGE_ZONE || !BUNNY_STORAGE_PASSWORD) {
    console.error('❌ Configura BUNNY_STORAGE_ZONE y BUNNY_STORAGE_PASSWORD en .env.local');
    console.error('   Bunny dashboard → Storage → tu zona → FTP & API Access → Password');
    process.exit(1);
  }

  let totalOk = 0;
  let totalFail = 0;

  // --- 1) Videos (y .jpg/.zip dentro de la carpeta de videos) → Bunny con prefijo
  if (doVideos) {
    let client = null;
    try {
      client = await connectFtp();
      await client.cd(FTP_BASE);
    } catch (err) {
      console.error('❌ Error cd a', FTP_BASE, err?.message || err);
      try { client?.close?.(); } catch (_) {}
      process.exit(1);
    }

    const files = [];
    const rootList = await client.list();
    const dirs = rootList.filter((f) => f.isDirectory && !f.name.startsWith('.'));

    // Mapear nombres de carpetas Bunny ↔ FTP por NFC para evitar duplicados por normalización.
    let bunnyDirNameByNfc = null;
    if (missingOnly) {
      bunnyDirNameByNfc = new Map();
      const bunnyRoot = BUNNY_PACK_PREFIX ? `${BUNNY_PACK_PREFIX}/` : '';
      try {
        const bunnyDirs = await listBunnyDirs(bunnyRoot);
        for (const d of bunnyDirs) bunnyDirNameByNfc.set(normalizeNfc(d), d);
      } catch (e) {
        console.warn('⚠ No se pudo listar directorios Bunny bajo', bunnyRoot || '(root)', '→', e?.message || e);
      }
    }

    for (const dir of dirs) {
      const ftpDirName = String(dir.name || '');
      const bunnyDirName = bunnyDirNameByNfc?.get(normalizeNfc(ftpDirName)) || ftpDirName;
      let bunnySet = null;
      if (missingOnly) {
        const bunnyDir = (BUNNY_PACK_PREFIX ? `${BUNNY_PACK_PREFIX}/${bunnyDirName}/` : `${bunnyDirName}/`);
        try {
          bunnySet = await getBunnyFileNameSet(bunnyDir, VIDEO_EXT);
        } catch (e) {
          console.warn('⚠ Bunny list fallo para', bunnyDir, '→ se asume carpeta vacía:', e?.message || e);
          bunnySet = new Set();
        }
      }
      const subList = await client.list(ftpDirName);
      for (const f of subList) {
        if (f.isFile && VIDEO_EXT.test(f.name)) {
          if (bunnySet && bunnySet.has(normalizeNfc(f.name))) continue;
          files.push({
            ftpRelativePath: `${ftpDirName}/${f.name}`,
            bunnyRelativePath: `${bunnyDirName}/${f.name}`,
            size: f.size,
          });
        }
      }
    }
    try { client?.close?.(); } catch (_) {}

    const toUpload = limit ? files.slice(0, limit) : files;
    console.log('--- Videos (', FTP_BASE, ') → Bunny', BUNNY_PACK_PREFIX ? BUNNY_PACK_PREFIX + '/' : 'raíz');
    console.log('✓ Archivos:', toUpload.length, missingOnly ? '(missing-only)' : '', dryRun ? '(dry-run)' : '');
    if (limit) console.log('  (limitado a', limit, ')');

    if (!dryRun && toUpload.length > 0) {
      for (const f of toUpload) {
        const bunnyPath = BUNNY_PACK_PREFIX ? `${BUNNY_PACK_PREFIX}/${f.bunnyRelativePath}` : f.bunnyRelativePath;
        let ok = false;
        let lastErr = null;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          process.stdout.write(`→ Subiendo ${f.ftpRelativePath} ... (${attempt}/${MAX_RETRIES}) `);
          const pass = new PassThrough();
          let ftpClient = null;
          try {
            ftpClient = await connectFtp();
            await ftpClient.cd(FTP_BASE);
            const uploadPromise = uploadStreamToBunny(bunnyPath, f.size, pass);
            const downloadPromise = ftpClient.downloadTo(pass, f.ftpRelativePath);
            const [, response] = await Promise.all([downloadPromise, uploadPromise]);
            if (response.ok) {
              console.log('OK');
              totalOk++;
              ok = true;
              break;
            }
            const txt = await response.text().catch(() => '');
            console.log(`ERROR (${response.status})`);
            if (txt) console.log('   ', txt.slice(0, 300));
            lastErr = new Error(`Bunny upload failed (${response.status})`);
          } catch (e) {
            console.log('ERROR');
            lastErr = e;
            console.error('   ', e?.message || e);
            if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS);
          } finally {
            try { pass.destroy(); } catch (_) {}
            try { ftpClient?.close?.(); } catch (_) {}
          }
        }
        if (!ok) {
          console.warn('⊘ Falló:', f.ftpRelativePath, '→', lastErr?.message || lastErr);
          totalFail++;
        }
      }
    } else if (dryRun && toUpload.length > 0) {
      toUpload.forEach((f) => console.log('  ', f.ftpRelativePath, `(${(f.size / 1024 / 1024).toFixed(2)} MB)`));
    }
  }

  // --- 2) Portadas en raíz del FTP (Género/archivo.jpg) → Bunny en la raíz
  if (doThumbs) {
    let client = null;
    // (si hicimos videos, ya estamos en raíz por el cd('..') anterior)
    try {
      client = await connectFtp();
    } catch (err) {
      console.error('❌ Error conectando a FTP:', err?.message || err);
      process.exit(1);
    }

    const rootList = await client.list();
    const thumbDirs = rootList.filter(
      (f) => f.isDirectory && !f.name.startsWith('.') && f.name !== FTP_BASE
    );

    // Mapear nombres de carpetas Bunny ↔ FTP por NFC (en root).
    let bunnyThumbDirNameByNfc = null;
    if (missingOnly) {
      bunnyThumbDirNameByNfc = new Map();
      try {
        const bunnyDirs = await listBunnyDirs('');
        for (const d of bunnyDirs) bunnyThumbDirNameByNfc.set(normalizeNfc(d), d);
      } catch (e) {
        console.warn('⚠ No se pudo listar directorios Bunny en root →', e?.message || e);
      }
    }

    const thumbFiles = [];
    for (const dir of thumbDirs) {
      const ftpDirName = String(dir.name || '');
      const bunnyDirName = bunnyThumbDirNameByNfc?.get(normalizeNfc(ftpDirName)) || ftpDirName;
      let bunnySet = null;
      if (missingOnly) {
        const bunnyDir = `${bunnyDirName}/`;
        try {
          bunnySet = await getBunnyFileNameSet(bunnyDir, THUMB_EXT);
        } catch (e) {
          console.warn('⚠ Bunny list fallo para', bunnyDir, '→ se asume carpeta vacía:', e?.message || e);
          bunnySet = new Set();
        }
      }
      try {
        const subList = await client.list(ftpDirName);
        for (const f of subList) {
          if (f.isFile && THUMB_EXT.test(f.name)) {
            if (bunnySet && bunnySet.has(normalizeNfc(f.name))) continue;
            thumbFiles.push({
              ftpRelativePath: `${ftpDirName}/${f.name}`,
              bunnyRelativePath: `${bunnyDirName}/${f.name}`,
              size: f.size,
            });
          }
        }
      } catch (_) { /* ignorar carpeta sin acceso */ }
    }

    console.log('');
    console.log('--- Portadas (raíz FTP) → Bunny raíz');
    console.log('✓ Portadas:', thumbFiles.length, missingOnly ? '(missing-only)' : '', dryRun ? '(dry-run)' : '');

    if (!dryRun && thumbFiles.length > 0) {
      for (const f of thumbFiles) {
        const bunnyPath = f.bunnyRelativePath;
        let ok = false;
        let lastErr = null;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          process.stdout.write(`→ Subiendo ${f.ftpRelativePath} ... (${attempt}/${MAX_RETRIES}) `);
          const pass = new PassThrough();
          let ftpClient = null;
          try {
            ftpClient = await connectFtp();
            const uploadPromise = uploadStreamToBunny(bunnyPath, f.size, pass);
            const downloadPromise = ftpClient.downloadTo(pass, f.ftpRelativePath);
            const [, response] = await Promise.all([downloadPromise, uploadPromise]);
            if (response.ok) {
              console.log('OK');
              totalOk++;
              ok = true;
              break;
            }
            const txt = await response.text().catch(() => '');
            console.log(`ERROR (${response.status})`);
            if (txt) console.log('   ', txt.slice(0, 300));
            lastErr = new Error(`Bunny upload failed (${response.status})`);
          } catch (e) {
            console.log('ERROR');
            lastErr = e;
            console.error('   ', e?.message || e);
            if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS);
          } finally {
            try { pass.destroy(); } catch (_) {}
            try { ftpClient?.close?.(); } catch (_) {}
          }
        }
        if (!ok) {
          console.warn('⊘ Falló:', f.ftpRelativePath, '→', lastErr?.message || lastErr);
          totalFail++;
        }
      }
    } else if (dryRun && thumbFiles.length > 0) {
      thumbFiles.forEach((f) => console.log('  ', f.ftpRelativePath, `(${(f.size / 1024).toFixed(1)} KB)`));
    }

    try { client?.close?.(); } catch (_) {}
  }

  console.log('');
  console.log('Listo. Subidos:', totalOk, '| Fallos:', totalFail);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
