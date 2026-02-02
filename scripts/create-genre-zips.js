#!/usr/bin/env node
/**
 * Crea un ZIP por cada carpeta de género (Bachata, Cumbia, etc.) para descarga masiva.
 * Los ZIPs se guardan en _ZIPS/ (o carpeta indicada). Luego súbelos a Bunny en la misma ruta
 * que usa /api/download (ej. packs/enero-2026/Cumbia.zip o _ZIPS/Cumbia.zip).
 *
 * Requisitos: carpeta local con subcarpetas por género (ej. Videos Enero 2026/Bachata/, ...).
 *
 * Uso: node scripts/create-genre-zips.js [carpeta-videos] [carpeta-salida]
 *      npm run db:create-genre-zips
 *
 * Ej: node scripts/create-genre-zips.js
 *     node scripts/create-genre-zips.js "./Videos Enero 2026" "./_ZIPS"
 */

const fs = require('fs');
const path = require('path');
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

const BASE_VIDEOS = process.argv[2] || process.env.VIDEOS_PATH || path.join(process.cwd(), 'Videos Enero 2026');
const OUT_DIR = process.argv[3] || path.join(path.dirname(BASE_VIDEOS), '_ZIPS');

const VIDEO_EXT = /\.(mp4|mov|avi|mkv)$/i;

function createZip(genrePath, genreName, outPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 6 } });

    output.on('close', () => resolve(archive.pointer()));
    archive.on('error', reject);

    archive.pipe(output);
    // Incluir la carpeta con su nombre para que al extraer quede GenreName/video1.mp4
    archive.directory(genrePath, genreName);
    archive.finalize();
  });
}

async function main() {
  if (!fs.existsSync(BASE_VIDEOS)) {
    console.error('❌ Carpeta de videos no encontrada:', BASE_VIDEOS);
    console.error('   Usa: node scripts/create-genre-zips.js [carpeta-videos] [carpeta-salida]');
    process.exit(1);
  }

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log('✓ Carpeta de salida creada:', OUT_DIR);
  }

  const entries = fs.readdirSync(BASE_VIDEOS, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));

  if (dirs.length === 0) {
    console.error('❌ No hay subcarpetas de género en', BASE_VIDEOS);
    process.exit(1);
  }

  console.log('✓ Géneros a comprimir:', dirs.length);
  console.log('✓ Salida:', OUT_DIR);
  console.log('');

  for (const dir of dirs) {
    const genrePath = path.join(BASE_VIDEOS, dir.name);
    const files = fs.readdirSync(genrePath).filter((f) => VIDEO_EXT.test(f));
    if (files.length === 0) {
      console.log('⊘', dir.name, '– sin videos, omitido');
      continue;
    }
    const zipName = `${dir.name}.zip`;
    const outPath = path.join(OUT_DIR, zipName);
    try {
      const bytes = await createZip(genrePath, dir.name, outPath);
      const mb = (bytes / 1024 / 1024).toFixed(2);
      console.log('✓', zipName, '–', files.length, 'archivos,', mb, 'MB');
    } catch (err) {
      console.error('✗', zipName, err.message);
    }
  }

  console.log('');
  console.log('Listo. Sube los ZIP de', OUT_DIR, 'a Bunny (ej. packs/enero-2026/ o _ZIPS/) para que /api/download?file=GenreName.zip funcione.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
