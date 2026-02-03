import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import ffmpeg from 'fluent-ffmpeg';

// RUTA DE TU DISCO EXTERNO (NO TOCAR)
const SOURCE_DIR = '/Volumes/Extreme Pro/Videos Enero 2026';

async function generateThumbnail(videoPath, thumbPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['20%'],
        filename: path.basename(thumbPath),
        folder: path.dirname(thumbPath),
        size: '600x600'
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(err));
  });
}

async function createZip(source, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 5 } });
    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));
    archive.pipe(output);
    archive.glob('**/*.mp4', { cwd: source }); 
    archive.finalize();
  });
}

async function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ ERROR: No encuentro el disco en: ${SOURCE_DIR}`);
    console.error('👉 Asegúrate de que el disco "Extreme Pro" esté conectado.');
    return;
  }
  
  console.log('📦 Creando ZIP GIGANTE en el SSD...');
  await createZip(SOURCE_DIR, path.join(SOURCE_DIR, 'Pack_Completo_Enero_2026.zip'));
  console.log('✅ Zip Gigante creado.');

  const genres = fs.readdirSync(SOURCE_DIR).filter(f => fs.statSync(path.join(SOURCE_DIR, f)).isDirectory());

  for (const genre of genres) {
    console.log(`\n🔵 Procesando ${genre}...`);
    const genrePath = path.join(SOURCE_DIR, genre);
    
    // ZIP DEL GÉNERO
    const zipPath = path.join(SOURCE_DIR, `${genre}.zip`);
    if (!fs.existsSync(zipPath)) {
        process.stdout.write(`   🗜️ Zippeando... `);
        await createZip(genrePath, zipPath);
        console.log('Listo');
    }

    // PORTADAS
    const videos = fs.readdirSync(genrePath).filter(f => f.toLowerCase().endsWith('.mp4'));
    console.log(`   📸 Generando ${videos.length} portadas...`);
    for (const vid of videos) {
        const thumb = path.join(genrePath, vid.replace(/\.mp4$/i, '.jpg'));
        if (!fs.existsSync(thumb)) {
            await generateThumbnail(path.join(genrePath, vid), thumb);
            process.stdout.write('.');
        }
    }
  }
  console.log('\n🎉 ¡TODO GENERADO EN EL SSD!');
}
main();
