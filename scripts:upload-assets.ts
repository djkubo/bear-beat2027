import { Client } from 'basic-ftp';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const LOCAL_ROOT = '/Users/gustavogarcia/Documents/CURSOR/BEAR BEAT 2027 3.0/Videos Enero 2026';
// Ajusta esto si en el FTP la carpeta se llama diferente (ej: 'Videos Enero 2026' o '/')
const REMOTE_ROOT = '/Videos Enero 2026'; 

async function main() {
  const client = new Client();
  // client.ftp.verbose = true; // Descomenta si quieres ver cada comando

  try {
    console.log('🔌 Conectando a Hetzner...');
    await client.access({
      host: process.env.FTP_HOST || process.env.HETZNER_FTP_HOST,
      user: process.env.FTP_USER || process.env.HETZNER_FTP_USER,
      password: process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD,
      secure: true,
      secureOptions: { rejectUnauthorized: false }
    });
    console.log('✅ Conectado.');

    // Asegurar que la carpeta remota base exista
    await client.ensureDir(REMOTE_ROOT);

    // 1. SUBIR ZIPS (Están en la raíz de la carpeta local)
    const files = fs.readdirSync(LOCAL_ROOT);
    const zips = files.filter(f => f.endsWith('.zip'));
    
    console.log(`\n📦 Subiendo ${zips.length} ZIPS...`);
    for (const zip of zips) {
      console.log(`   ⬆️  Subiendo ${zip}...`);
      await client.uploadFrom(path.join(LOCAL_ROOT, zip), `${REMOTE_ROOT}/${zip}`);
    }

    // 2. SUBIR PORTADAS (Están dentro de cada género)
    const genres = files.filter(f => fs.statSync(path.join(LOCAL_ROOT, f)).isDirectory());
    
    console.log(`\n📸 Subiendo PORTADAS de ${genres.length} géneros...`);
    for (const genre of genres) {
      const localGenrePath = path.join(LOCAL_ROOT, genre);
      const remoteGenrePath = `${REMOTE_ROOT}/${genre}`;
      
      const genreFiles = fs.readdirSync(localGenrePath).filter(f => f.endsWith('.jpg'));
      
      if (genreFiles.length > 0) {
        console.log(`   📂 Género ${genre}: Subiendo ${genreFiles.length} imágenes...`);
        // Asegurar carpeta remota
        await client.ensureDir(remoteGenrePath);
        
        for (const jpg of genreFiles) {
            // Subida rápida
            await client.uploadFrom(path.join(localGenrePath, jpg), `${remoteGenrePath}/${jpg}`);
        }
      }
    }

    console.log('\n🚀 ¡TODO SUBIDO EXITOSAMENTE!');

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    client.close();
  }
}

main();