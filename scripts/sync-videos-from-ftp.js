#!/usr/bin/env node
/**
 * Sincroniza el catálogo de videos desde el FTP de Hetzner a la tabla `videos` de Supabase.
 * Así la web muestra el listado sin tener que bajar todos los archivos a tu PC.
 *
 * Requisitos:
 *   - .env.local con SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   - .env.local con credenciales FTP (una cuenta que pueda LISTAR):
 *     FTP_HOST, FTP_USER, FTP_PASSWORD
 *     (o HETZNER_FTP_HOST, HETZNER_FTP_USER, HETZNER_FTP_PASSWORD)
 *
 * Uso: node scripts/sync-videos-from-ftp.js
 *      npm run db:sync-videos-ftp
 */

const fs = require('fs');
const path = require('path');

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

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const FTP_HOST = process.env.FTP_HOST || process.env.HETZNER_FTP_HOST;
const FTP_USER = process.env.FTP_USER || process.env.HETZNER_FTP_USER;
const FTP_PASSWORD = process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

if (!FTP_HOST || !FTP_USER || !FTP_PASSWORD) {
  console.error('❌ Configura FTP_HOST, FTP_USER y FTP_PASSWORD (o HETZNER_FTP_*) en .env.local');
  process.exit(1);
}

async function main() {
  const { Client } = require('basic-ftp');
  const { createClient } = require('@supabase/supabase-js');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const packSlug = 'enero-2026';

  const { data: pack, error: packErr } = await supabase.from('packs').select('id').eq('slug', packSlug).single();
  if (packErr || !pack) {
    console.error('❌ Pack no encontrado (slug:', packSlug, '). Ejecuta npm run db:setup antes.');
    process.exit(1);
  }
  const packId = pack.id;

  const { data: genresRows } = await supabase.from('genres').select('id, name');
  const genreByName = new Map((genresRows || []).map((g) => [g.name.toLowerCase(), g.id]));

  const { error: delErr } = await supabase.from('videos').delete().eq('pack_id', packId);
  if (delErr) {
    console.error('❌ Error borrando videos anteriores:', delErr.message);
    process.exit(1);
  }
  console.log('✓ Conectando a FTP', FTP_HOST, '...');

  const client = new Client(60 * 1000);
  try {
    await client.access({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASSWORD,
      secure: false,
    });

    const rootList = await client.list();
    const dirs = rootList.filter((f) => f.isDirectory);
    if (dirs.length === 0) {
      console.error('❌ No se encontraron carpetas en la raíz del FTP. ¿La estructura es Género/videos.mp4?');
      process.exit(1);
    }

    let total = 0;
    const BATCH = 100;
    let batch = [];

    for (const dir of dirs) {
      const genreName = dir.name;
      if (genreName.startsWith('.')) continue;
      try {
        const fileList = await client.list(genreName);
        const videoFiles = fileList.filter((f) => !f.isDirectory && /\.(mp4|mov|avi|mkv)$/i.test(f.name));
        const genreId = genreByName.get(genreName.toLowerCase()) || null;

        for (const file of videoFiles) {
          const relativePath = `${genreName}/${file.name}`;
          const nameWithoutExt = file.name.replace(/\.(mp4|mov|avi|mkv)$/i, '');
          const parts = nameWithoutExt.split(' - ');
          const artist = parts.length >= 2 ? parts[0].trim() : nameWithoutExt;
          const title = parts.length >= 2 ? parts.slice(1).join(' - ').trim() : '';

          batch.push({
            pack_id: packId,
            genre_id: genreId,
            title: title || nameWithoutExt,
            artist: artist || null,
            file_path: relativePath,
            file_size: file.size || 0,
            resolution: '1080p',
          });

          if (batch.length >= BATCH) {
            const { error } = await supabase.from('videos').insert(batch);
            if (error) {
              console.error('Error insertando batch:', error.message);
            } else {
              total += batch.length;
              process.stdout.write('\r  ' + genreName + ' – Insertados: ' + total);
            }
            batch = [];
          }
        }
      } catch (e) {
        console.warn('\n⚠ No se pudo listar carpeta', genreName, ':', e.message);
      }
    }

    if (batch.length) {
      const { error } = await supabase.from('videos').insert(batch);
      if (error) {
        console.error('Error insertando último batch:', error.message);
      } else {
        total += batch.length;
      }
    }

    console.log('\n✅ Listo. Total videos en DB desde Hetzner FTP:', total);
  } finally {
    client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
