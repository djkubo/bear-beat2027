#!/usr/bin/env node
/**
 * Ejecuta un archivo SQL contra la base de datos Supabase (PostgreSQL).
 * Usa DATABASE_URL de .env.local
 *
 * Uso: node scripts/run-supabase-sql.js <ruta-al-archivo.sql>
 * Ej:  node scripts/run-supabase-sql.js supabase/SETUP_COMPLETO.sql
 */

const fs = require('fs');
const path = require('path');

// Cargar .env.local
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

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ Falta DATABASE_URL en .env.local');
  process.exit(1);
}

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Uso: node scripts/run-supabase-sql.js <archivo.sql>');
  process.exit(1);
}

const absPath = path.isAbsolute(sqlFile) ? sqlFile : path.join(__dirname, '..', sqlFile);
if (!fs.existsSync(absPath)) {
  console.error('❌ Archivo no encontrado:', absPath);
  process.exit(1);
}

const sql = fs.readFileSync(absPath, 'utf8');

async function run() {
  const { Client } = require('pg');
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log('📡 Conectado a la base de datos. Ejecutando SQL...');
    await client.query(sql);
    console.log('✅ SQL ejecutado correctamente.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
