#!/usr/bin/env node
/**
 * Crea ZIP por género directamente: conecta por FTP a Hetzner Storage Box,
 * comprime cada carpeta (género) y sube el ZIP a Bunny Storage.
 * Así los ZIPs quedan en Bunny y /api/download?file=GenreName.zip funciona.
 *
 * Requisitos en .env.local:
 *   - FTP_HOST, FTP_USER, FTP_PASSWORD (Hetzner Storage Box)
 *   - FTP_BASE_PATH o "Videos Enero 2026"
 *   - BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD (Bunny Storage API)
 *   - BUNNY_PACK_PATH_PREFIX (ej. packs/enero-2026) para la ruta en Bunny
 *
 * Uso: node scripts/create-genre-zips-hetzner.js
 *      npm run db:create-genre-zips-hetzner
 */

const fs = require('fs');
const path = require('path');
const stream = require('stream');
const { PassThrough } = stream;
const archiver = require('archiver');

function loadEnv(file) {
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
const BUNNY_PACK_PREFIX = (process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || 'packs/enero-2026').replace(/\/$/, '');

const VIDEO_EXT = /\.(mp4|mov|avi|mkv)$/i;

function uploadToBunny(filePath, buffer) {
  const url = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${filePath}`;
  return fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: BUNNY_STORAGE_PASSWORD,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(buffer.length),
    },
    body: buffer,
  });
}

async function main() {
  if (!FTP_HOST || !FTP_USER || !FTP_PASSWORD) {
    console.error('❌ Configura FTP_HOST, FTP_USER y FTP_PASSWORD (Hetzner) en .env.local');
    process.exit(1);
  }
  if (!BUNNY_STORAGE_ZONE || !BUNNY_STORAGE_PASSWORD) {
    console.error('❌ Configura BUNNY_STORAGE_ZONE y BUNNY_STORAGE_PASSWORD (Bunny) en .env.local');
    process.exit(1);
  }

  const { Client } = require('basic-ftp');
  const client = new Client(120 * 1000);

  try {
    console.log('✓ Conectando a Hetzner FTP', FTP_HOST, '...');
    await client.access({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASSWORD,
      secure: false,
    });

    await client.cd(FTP_BASE);
    const rootList = await client.list();
    const dirs = rootList.filter((f) => f.isDirectory && !f.name.startsWith('.'));
    if (dirs.length === 0) {
      console.error('❌ No hay carpetas (géneros) en', FTP_BASE);
      process.exit(1);
    }
    console.log('✓ Géneros a comprimir:', dirs.length);
    console.log('✓ Subida a Bunny:', BUNNY_STORAGE_ZONE, '→', BUNNY_PACK_PREFIX + '/');
    console.log('');

    for (const dir of dirs) {
      const genreName = dir.name;
      let fileList;
      try {
        fileList = await client.list(genreName);
      } catch (e) {
        console.warn('⊘', genreName, '– no se pudo listar:', e.message);
        continue;
      }
      const videoFiles = fileList.filter((f) => !f.isDirectory && VIDEO_EXT.test(f.name));
      if (videoFiles.length === 0) {
        console.log('⊘', genreName, '– sin videos');
        continue;
      }

      const zipPath = path.join(__dirname, '..', '.tmp', `zip-${genreName}-${Date.now()}.zip`);
      fs.mkdirSync(path.dirname(zipPath), { recursive: true });
      const out = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 6 } });

      await new Promise((resolve, reject) => {
        archive.on('error', reject);
        out.on('error', reject);
        out.on('finish', resolve);
        archive.pipe(out);

        (async () => {
          for (const file of videoFiles) {
            const remotePath = `${genreName}/${file.name}`;
            const pt = new PassThrough();
            archive.append(pt, { name: `${genreName}/${file.name}` });
            try {
              await client.downloadTo(pt, remotePath);
            } catch (e) {
              pt.destroy(e);
              reject(e);
              return;
            }
            pt.end();
          }
          archive.finalize();
        })();
      });

      const zipBuffer = fs.readFileSync(zipPath);
      fs.unlinkSync(zipPath);
      const remoteZipPath = `${BUNNY_PACK_PREFIX}/${genreName}.zip`;
      const res = await uploadToBunny(remoteZipPath, zipBuffer);
      if (!res.ok) {
        const errText = await res.text();
        console.error('✗', genreName + '.zip', '– upload Bunny', res.status, errText);
      } else {
        const mb = (zipBuffer.length / 1024 / 1024).toFixed(2);
        console.log('✓', genreName + '.zip', '–', videoFiles.length, 'archivos,', mb, 'MB → Bunny');
      }
    }

    console.log('');
    console.log('Listo. Los ZIP están en Bunny en', BUNNY_PACK_PREFIX + '/');
  } finally {
    client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
