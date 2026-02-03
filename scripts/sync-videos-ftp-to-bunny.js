#!/usr/bin/env node
/**
 * Sincroniza videos (y opcionalmente .jpg, .zip) desde Hetzner FTP a Bunny Storage.
 * Así las descargas por CDN funcionan sin 404.
 *
 * Requisitos en .env.local:
 *   - FTP_HOST, FTP_USER, FTP_PASSWORD (Hetzner)
 *   - BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD
 *   - BUNNY_PACK_PATH_PREFIX (ej. "Videos Enero 2026") debe coincidir con la carpeta en FTP
 *
 * Uso:
 *   node scripts/sync-videos-ftp-to-bunny.js           # sube todos los videos
 *   node scripts/sync-videos-ftp-to-bunny.js --dry-run # solo lista, no sube
 *   node scripts/sync-videos-ftp-to-bunny.js --limit 5 # sube solo los primeros 5
 *   npm run db:sync-videos-to-bunny
 */

const path = require('path');
const stream = require('stream');
const { PassThrough } = stream;

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
const BUNNY_PACK_PREFIX = (process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || '').replace(/\/$/, '');

const VIDEO_EXT = /\.(mp4|mov|avi|mkv|zip|jpg|jpeg)$/i;

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) return 'video/mp4';
  if (ext === '.zip') return 'application/zip';
  if (['.jpg', '.jpeg'].includes(ext)) return 'image/jpeg';
  return 'application/octet-stream';
}

async function uploadStreamToBunny(filePath, size, readStream) {
  const url = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${filePath}`;
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

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null;

  if (!FTP_HOST || !FTP_USER || !FTP_PASSWORD) {
    console.error('❌ Configura FTP_HOST, FTP_USER y FTP_PASSWORD (Hetzner) en .env.local');
    process.exit(1);
  }
  if (!BUNNY_STORAGE_ZONE || !BUNNY_STORAGE_PASSWORD) {
    console.error('❌ Configura BUNNY_STORAGE_ZONE y BUNNY_STORAGE_PASSWORD en .env.local');
    console.error('   Bunny dashboard → Storage → tu zona → FTP & API Access → Password');
    process.exit(1);
  }

  const { Client } = require('basic-ftp');
  const client = new Client(120 * 1000);

  try {
    await client.access({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASSWORD,
      secure: process.env.FTP_SECURE === 'true' || process.env.FTP_USE_TLS === 'true',
    });
    await client.cd(FTP_BASE);
  } catch (err) {
    console.error('❌ Error conectando a FTP:', err?.message || err);
    process.exit(1);
  }

  const files = [];
  const rootList = await client.list();
  const dirs = rootList.filter((f) => f.isDirectory && !f.name.startsWith('.'));
  for (const dir of dirs) {
    const subList = await client.list(dir.name);
    for (const f of subList) {
      if (f.isFile && VIDEO_EXT.test(f.name)) {
        files.push({
          relativePath: `${dir.name}/${f.name}`,
          size: f.size,
        });
      }
    }
  }

  if (files.length === 0) {
    console.log('✓ No se encontraron videos/.zip/.jpg en', FTP_BASE);
    client.close();
    return;
  }

  const toUpload = limit ? files.slice(0, limit) : files;
  console.log('✓ FTP:', FTP_HOST, '| Bunny:', BUNNY_STORAGE_ZONE, '→', BUNNY_PACK_PREFIX + '/');
  console.log('✓ Archivos a subir:', toUpload.length, dryRun ? '(dry-run, no se sube nada)' : '');
  if (limit) console.log('  (limitado a', limit, ')');
  console.log('');

  if (dryRun) {
    toUpload.forEach((f) => console.log('  ', f.relativePath, `(${(f.size / 1024 / 1024).toFixed(2)} MB)`));
    client.close();
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const f of toUpload) {
    const bunnyPath = BUNNY_PACK_PREFIX ? `${BUNNY_PACK_PREFIX}/${f.relativePath}` : f.relativePath;
    const remotePath = f.relativePath;
    try {
      const pass = new PassThrough();
      const uploadPromise = uploadStreamToBunny(bunnyPath, f.size, pass);
      const downloadPromise = client.downloadTo(pass, remotePath);
      const [, response] = await Promise.all([downloadPromise, uploadPromise]);
      if (response.ok) {
        console.log('✓', f.relativePath);
        ok++;
      } else {
        const text = await response.text();
        console.warn('⊘', f.relativePath, response.status, text);
        fail++;
      }
    } catch (e) {
      console.warn('⊘', f.relativePath, e?.message || e);
      fail++;
    }
  }

  client.close();
  console.log('');
  console.log('Listo. Subidos:', ok, '| Fallos:', fail);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
