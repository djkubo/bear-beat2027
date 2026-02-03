import { Client } from 'basic-ftp';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// RUTA DE TU SSD EXTERNO
const LOCAL_ROOT = '/Volumes/Extreme Pro/Videos Enero 2026';
const REMOTE_ROOT = '/'; 

async function main() {
  const client = new Client();
  try {
    console.log('🔌 Conectando a Hetzner...');
    await client.access({
      host: process.env.FTP_HOST || process.env.HETZNER_FTP_HOST,
      user: process.env.FTP_USER || process.env.HETZNER_FTP_USER,
      password: process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD,
      secure: true,
      secureOptions: { rejectUnauthorized: false }
    });
    console.log('✅ Conectado. Subiendo archivos nuevos...');

    if (!fs.existsSync(LOCAL_ROOT)) return console.error(`❌ No encuentro el disco: ${LOCAL_ROOT}`);

    // SUBIR ZIPS
    const zips = fs.readdirSync(LOCAL_ROOT).filter(f => f.endsWith('.zip'));
    console.log(`📦 Encontrados ${zips.length} Zips en el SSD.`);
    for (const zip of zips) {
      console.log(`⬆️  Subiendo ${zip}...`);
      await client.uploadFrom(path.join(LOCAL_ROOT, zip), `${REMOTE_ROOT}/${zip}`);
    }

    // SUBIR PORTADAS
    const genres = fs.readdirSync(LOCAL_ROOT).filter(f => fs.statSync(path.join(LOCAL_ROOT, f)).isDirectory());
    for (const genre of genres) {
      const localGenre = path.join(LOCAL_ROOT, genre);
      const jpgs = fs.readdirSync(localGenre).filter(f => f.endsWith('.jpg'));
      if (jpgs.length > 0) {
          console.log(`📸 Subiendo ${jpgs.length} fotos de ${genre}...`);
          await client.ensureDir(`${REMOTE_ROOT}/${genre}`);
          for (const jpg of jpgs) await client.uploadFrom(path.join(localGenre, jpg), `${REMOTE_ROOT}/${genre}/${jpg}`);
      }
    }
    console.log('🚀 ¡SUBIDA COMPLETADA!');
  } catch (e) { console.error(e); } 
  finally { client.close(); }
}
main();
