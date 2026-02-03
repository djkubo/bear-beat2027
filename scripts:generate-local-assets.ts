import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import ffmpeg from 'fluent-ffmpeg';

// --- CONFIGURACIÓN ---
// LA RUTA EXACTA DE TU CARPETA DE VIDEOS
const SOURCE_DIR = '/Users/gustavogarcia/Documents/CURSOR/BEAR BEAT 2027 3.0/Videos Enero 2026';
// ---------------------

async function generateThumbnail(videoPath: string, thumbPath: string) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['20%'], // Captura al 20% del video (evita intros negras)
        filename: path.basename(thumbPath),
        folder: path.dirname(thumbPath),
        size: '600x600'
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(err));
  });
}

async function createZip(sourceDir: string, zipPath: string) {
  return new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } }); // Compresión balanceada

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    // Agregamos los archivos MP4 al zip (ignorando zips y jpgs previos si los hubiera)
    archive.glob('**/*.mp4', { cwd: sourceDir }); 
    archive.finalize();
  });
}

async function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ Error: No encuentro la carpeta en: ${SOURCE_DIR}`);
    return;
  }

  const items = fs.readdirSync(SOURCE_DIR, { withFileTypes: true });
  const genres = items.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

  console.log(`🚀 Iniciando procesamiento local en: ${SOURCE_DIR}`);
  console.log(`📂 Géneros detectados: ${genres.length}\n`);

  for (const genre of genres) {
    console.log(`\n🔵 Procesando Género: ${genre.toUpperCase()}`);
    const genrePath = path.join(SOURCE_DIR, genre);
    
    // 1. GENERAR ZIP
    const zipName = `${genre}.zip`;
    const zipPath = path.join(SOURCE_DIR, zipName); // Guardar Zip junto a las carpetas
    
    if (fs.existsSync(zipPath)) {
      console.log(`   📦 El Zip ya existe, saltando...`);
    } else {
      process.stdout.write(`   📦 Creando ${zipName}... `);
      try {
        await createZip(genrePath, zipPath);
        console.log('✅ Listo');
      } catch (err) {
        console.log('❌ Error');
      }
    }

    // 2. GENERAR PORTADAS
    const files = fs.readdirSync(genrePath).filter(f => f.toLowerCase().endsWith('.mp4'));
    console.log(`   📸 Revisando ${files.length} videos para portadas...`);

    let thumbsCreated = 0;
    for (const video of files) {
      const videoPath = path.join(genrePath, video);
      const thumbName = video.replace(/\.mp4$/i, '.jpg');
      const thumbPath = path.join(genrePath, thumbName); // Guardar jpg junto al mp4

      if (!fs.existsSync(thumbPath)) {
        try {
          await generateThumbnail(videoPath, thumbPath);
          thumbsCreated++;
          process.stdout.write('.'); // Barra de progreso visual
        } catch (e) {
          console.error(`Error en ${video}`);
        }
      }
    }
    if (thumbsCreated > 0) console.log(`\n   ✅ ${thumbsCreated} portadas nuevas creadas.`);
    else console.log(`   ✨ Todas las portadas ya existían.`);
  }

  console.log('\n🎉 ¡PROCESO LOCAL TERMINADO! Ahora sube los cambios.');
}

main();