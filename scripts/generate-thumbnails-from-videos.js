#!/usr/bin/env node
/**
 * Genera carátulas (thumbnails) a partir de un frame de cada video:
 * 1) Lista videos desde Supabase (sin thumbnail_url o todos).
 * 2) Para cada video: descarga los primeros ~12 MB desde FTP (Hetzner),
 *    extrae un frame a 1s con ffmpeg, sube el .jpg a Bunny Storage,
 *    actualiza thumbnail_url en Supabase.
 *
 * Requisitos:
 *   - .env.local: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   - .env.local: FTP_HOST, FTP_USER, FTP_PASSWORD (o HETZNER_FTP_*)
 *   - .env.local: BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD
 *   - BUNNY_PACK_PATH_PREFIX (ej. packs/enero-2026)
 *   - ffmpeg instalado en el sistema
 *
 * Uso: node scripts/generate-thumbnails-from-videos.js
 *      node scripts/generate-thumbnails-from-videos.js --all   (regenerar también los que ya tienen thumbnail)
 *      npm run db:generate-thumbnails
 */

const fs = require('fs');
const path = require('path');
const stream = require('stream');
const { PassThrough } = stream;
const { execSync } = require('child_process');

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

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FTP_HOST = process.env.FTP_HOST || process.env.HETZNER_FTP_HOST;
const FTP_USER = process.env.FTP_USER || process.env.HETZNER_FTP_USER;
const FTP_PASSWORD = process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD;
const FTP_BASE = process.env.FTP_BASE_PATH || process.env.FTP_VIDEOS_PATH || 'Videos Enero 2026';
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || '';
const BUNNY_STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD || '';
const BUNNY_PACK_PREFIX = (process.env.BUNNY_PACK_PATH_PREFIX || process.env.BUNNY_PACK_PREFIX || 'packs/enero-2026').replace(/\/$/, '');

const MAX_VIDEO_CHUNK = 12 * 1024 * 1024; // 12 MB para extraer frame ~1s
const VIDEO_EXT = /\.(mp4|mov|avi|mkv)$/i;

function uploadToBunny(filePath, buffer) {
  const url = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${filePath}`;
  return fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: BUNNY_STORAGE_PASSWORD,
      'Content-Type': 'image/jpeg',
      'Content-Length': String(buffer.length),
    },
    body: buffer,
  });
}

async function main() {
  const onlyMissing = !process.argv.includes('--all');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
    process.exit(1);
  }
  if (!FTP_HOST || !FTP_USER || !FTP_PASSWORD) {
    console.error('❌ Configura FTP_HOST, FTP_USER y FTP_PASSWORD (Hetzner) en .env.local');
    process.exit(1);
  }
  if (!BUNNY_STORAGE_ZONE || !BUNNY_STORAGE_PASSWORD) {
    console.error('❌ Configura BUNNY_STORAGE_ZONE y BUNNY_STORAGE_PASSWORD en .env.local');
    process.exit(1);
  }

  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
  } catch {
    console.error('❌ ffmpeg no está instalado. Instálalo (ej. brew install ffmpeg) y vuelve a ejecutar.');
    process.exit(1);
  }

  const { createClient } = require('@supabase/supabase-js');
  const { Client } = require('basic-ftp');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let query = supabase.from('videos').select('id, file_path, thumbnail_url').order('file_path');
  if (onlyMissing) {
    query = query.or('thumbnail_url.is.null,thumbnail_url.eq.');
  }
  const { data: videos, error } = await query;
  if (error) {
    console.error('❌ Error listando videos:', error.message);
    process.exit(1);
  }
  const toProcess = (videos || []).filter((v) => v.file_path && VIDEO_EXT.test(v.file_path));
  if (toProcess.length === 0) {
    console.log('✓ No hay videos pendientes de carátula.');
    process.exit(0);
  }

  console.log('✓ Videos a procesar:', toProcess.length, onlyMissing ? '(solo sin thumbnail)' : '(todos)');
  console.log('✓ FTP:', FTP_HOST, '| Bunny:', BUNNY_STORAGE_ZONE, '→', BUNNY_PACK_PREFIX + '/');
  console.log('');

  const tmpDir = path.join(__dirname, '..', '.tmp', 'thumbnails');
  fs.mkdirSync(tmpDir, { recursive: true });

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

  let ok = 0;
  let fail = 0;

  for (const row of toProcess) {
    const filePath = row.file_path;
    const pathJpg = filePath.replace(VIDEO_EXT, '.jpg');
    const tmpVideo = path.join(tmpDir, `v-${row.id}-${Date.now()}.mp4`);
    const tmpThumb = path.join(tmpDir, `v-${row.id}-${Date.now()}.jpg`);

    try {
      const dir = path.dirname(filePath);
      const base = path.basename(filePath);
      const remotePath = dir ? `${dir}/${base}` : base;

      const pass = new PassThrough();
      const chunks = [];
      let doneResolve;
      const done = new Promise((r) => { doneResolve = r; });
      pass.on('data', (c) => {
        chunks.push(c);
        if (Buffer.concat(chunks).length >= MAX_VIDEO_CHUNK) pass.destroy();
      });
      pass.on('close', () => doneResolve(Buffer.concat(chunks).slice(0, MAX_VIDEO_CHUNK)));
      pass.on('error', () => doneResolve(Buffer.concat(chunks).slice(0, MAX_VIDEO_CHUNK)));
      client.downloadTo(pass, remotePath).catch(() => {});
      const buf = await done;
      if (buf.length < 1000) {
        console.warn('⊘', filePath, '– archivo muy pequeño o no encontrado');
        fail++;
        continue;
      }
      await fs.promises.writeFile(tmpVideo, buf);

      try {
        execSync(
          `ffmpeg -ss 1 -i "${tmpVideo}" -vframes 1 -q:v 2 -y "${tmpThumb}"`,
          { timeout: 15000, stdio: 'pipe' }
        );
      } catch {
        try {
          execSync(
            `ffmpeg -ss 0.5 -i "${tmpVideo}" -vframes 1 -q:v 2 -y "${tmpThumb}"`,
            { timeout: 15000, stdio: 'pipe' }
          );
        } catch {
          execSync(
            `ffmpeg -i "${tmpVideo}" -vframes 1 -q:v 2 -y "${tmpThumb}"`,
            { timeout: 15000, stdio: 'pipe' }
          );
        }
      }

      if (!fs.existsSync(tmpThumb)) {
        console.warn('⊘', filePath, '– no se generó imagen');
        fail++;
        continue;
      }

      const thumbBuffer = await fs.promises.readFile(tmpThumb);
      const remoteThumbPath = `${BUNNY_PACK_PREFIX}/${pathJpg}`;
      const res = await uploadToBunny(remoteThumbPath, thumbBuffer);
      if (!res.ok) {
        const errText = await res.text();
        console.warn('⊘', filePath, '– upload Bunny', res.status, errText);
        fail++;
        continue;
      }

      await supabase
        .from('videos')
        .update({ thumbnail_url: pathJpg, updated_at: new Date().toISOString() })
        .eq('id', row.id);

      console.log('✓', pathJpg);
      ok++;
    } catch (e) {
      console.warn('⊘', filePath, '–', e?.message || e);
      fail++;
    } finally {
      try {
        if (fs.existsSync(tmpVideo)) fs.unlinkSync(tmpVideo);
        if (fs.existsSync(tmpThumb)) fs.unlinkSync(tmpThumb);
      } catch {}
    }
  }

  client.close();
  console.log('');
  console.log('Listo. Carátulas generadas:', ok, '| Fallos:', fail);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
