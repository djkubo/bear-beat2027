import { Client } from 'basic-ftp';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// RUTA DE TU SSD EXTERNO
const LOCAL_ROOT = '/Volumes/Extreme Pro/Videos Enero 2026';
const REMOTE_ROOT = '/'; 

async function uploadIfNeeded(
  client: Client,
  localPath: string,
  remotePath: string,
  filename: string
): Promise<void> {
  const localSize = fs.statSync(localPath).size;
  let remoteSize: number | null = null;
  try {
    remoteSize = await client.size(remotePath);
  } catch {
    // Archivo no existe remoto -> hay que subir
  }
  if (remoteSize !== null && remoteSize === localSize) {
    console.log('✅ Ya existe (saltando):', filename);
    return;
  }
  try {
    console.log('⬆️  Subiendo', filename, '...');
    await client.uploadFrom(localPath, remotePath);
    console.log('✅ Subido:', filename);
  } catch (e) {
    console.error('❌ Error subiendo', filename, ':', e instanceof Error ? e.message : e);
  }
}

async function main() {
  const client = new Client();
  try {
    console.log('🔌 Conectando a Hetzner...');
    await client.access({
      host: process.env.FTP_HOST || process.env.HETZNER_FTP_HOST,
      user: process.env.FTP_USER || process.env.HETZNER_FTP_USER,
      password: process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD,
      secure: true,
      secureOptions: { rejectUnauthorized: false },
      transportTimeout: 0,
      dataTimeout: 0,
    });
    console.log('✅ Conectado. Subiendo archivos nuevos...');

    if (!fs.existsSync(LOCAL_ROOT)) return console.error(`❌ No encuentro el disco: ${LOCAL_ROOT}`);

    // SUBIR ZIPS
    const zips = fs.readdirSync(LOCAL_ROOT).filter(f => f.endsWith('.zip'));
    console.log(`📦 Encontrados ${zips.length} Zips en el SSD.`);
    for (const zip of zips) {
      await uploadIfNeeded(
        client,
        path.join(LOCAL_ROOT, zip),
        `${REMOTE_ROOT}/${zip}`.replace(/\/+/g, '/'),
        zip
      );
    }

    // SUBIR PORTADAS
    const genres = fs.readdirSync(LOCAL_ROOT).filter(f => fs.statSync(path.join(LOCAL_ROOT, f)).isDirectory());
    for (const genre of genres) {
      const localGenre = path.join(LOCAL_ROOT, genre);
      const jpgs = fs.readdirSync(localGenre).filter(f => f.endsWith('.jpg'));
      if (jpgs.length > 0) {
        try {
          await client.ensureDir(`${REMOTE_ROOT}/${genre}`.replace(/\/+/g, '/'));
        } catch (e) {
          console.error('❌ Error creando directorio', genre, ':', e instanceof Error ? e.message : e);
          continue;
        }
        console.log(`📸 Procesando ${jpgs.length} fotos de ${genre}...`);
        for (const jpg of jpgs) {
          await uploadIfNeeded(
            client,
            path.join(localGenre, jpg),
            `${REMOTE_ROOT}/${genre}/${jpg}`.replace(/\/+/g, '/'),
            `${genre}/${jpg}`
          );
        }
      }
    }
    console.log('🚀 ¡SUBIDA COMPLETADA!');
  } catch (e) {
    console.error('❌ Error general:', e);
  } finally {
    client.close();
  }
}
main();
