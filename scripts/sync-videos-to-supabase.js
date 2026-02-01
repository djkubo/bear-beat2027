#!/usr/bin/env node
/**
 * Sincroniza la carpeta local de videos a la tabla `videos` de Supabase.
 * Así el listado en producción (Render) puede mostrarse desde la DB.
 *
 * Requisitos: .env.local con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 * Uso: node scripts/sync-videos-to-supabase.js [ruta-carpeta]
 * Ej:  node scripts/sync-videos-to-supabase.js
 *      node scripts/sync-videos-to-supabase.js "./Videos Enero 2026"
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

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const basePath = process.argv[2] || process.env.VIDEOS_PATH || path.join(process.cwd(), 'Videos Enero 2026');
if (!fs.existsSync(basePath)) {
  console.error('❌ Carpeta no encontrada:', basePath);
  process.exit(1);
}

async function main() {
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

  // Borrar videos existentes de este pack para re-sincronizar limpio
  const { error: delErr } = await supabase.from('videos').delete().eq('pack_id', packId);
  if (delErr) {
    console.error('❌ Error borrando videos anteriores:', delErr.message);
    process.exit(1);
  }
  console.log('✓ Pack', packId, '– géneros cargados:', genreByName.size);

  const entries = fs.readdirSync(basePath, { withFileTypes: true });
  let total = 0;
  const BATCH = 100;
  let batch = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const genreName = entry.name;
    const genrePath = path.join(basePath, entry.name);
    const genreId = genreByName.get(genreName.toLowerCase()) || null;

    const files = fs.readdirSync(genrePath);
    for (const file of files) {
      if (!file.match(/\.(mp4|mov|avi|mkv)$/i)) continue;
      const filePath = path.join(genrePath, file);
      const stats = fs.statSync(filePath);
      const relativePath = `${genreName}/${file}`;
      const nameWithoutExt = file.replace(/\.(mp4|mov|avi|mkv)$/i, '');
      const parts = nameWithoutExt.split(' - ');
      const artist = parts.length >= 2 ? parts[0].trim() : nameWithoutExt;
      const title = parts.length >= 2 ? parts.slice(1).join(' - ').trim() : '';

      batch.push({
        pack_id: packId,
        genre_id: genreId,
        title: title || nameWithoutExt,
        artist: artist || null,
        file_path: relativePath,
        file_size: stats.size,
        resolution: '1080p',
      });
      if (batch.length >= BATCH) {
        const { error } = await supabase.from('videos').insert(batch);
        if (error) {
          console.error('Error insertando batch:', error.message);
        } else {
          total += batch.length;
          process.stdout.write('\r  Insertados: ' + total);
        }
        batch = [];
      }
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

  console.log('\n✅ Listo. Total videos en DB:', total);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
