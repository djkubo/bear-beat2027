#!/usr/bin/env npx tsx
/**
 * Generador de ZIP por género DENTRO del servidor Hetzner (sin descargar nada).
 * Conecta por SSH al Storage Box (o servidor con acceso a los archivos) y ejecuta
 * zip -r -0 "Genero.zip" "Genero/" para cada carpeta de género.
 *
 * Requisitos:
 *   - .env.local: SSH_HOST (o FTP_HOST), SSH_USER (o FTP_USER), SSH_PASSWORD (o FTP_PASSWORD)
 *   - Opcional: SSH_PORT=22 o 23, FTP_BASE_PATH (ej. "Videos Enero 2026")
 *   - El servidor debe tener SSH y el comando `zip` instalado.
 *   - Nota: Hetzner Storage Box estándar es solo FTP/SFTP; este script requiere SSH (ej. VPS que monte el Storage).
 *
 * Uso: npx tsx scripts/maintenance/zip-folders.ts
 *      npm run maintenance:zip-folders
 */

import { Client } from 'ssh2'
import { loadEnv } from './load-env'

loadEnv()

const SSH_HOST = process.env.SSH_HOST || process.env.FTP_HOST || process.env.HETZNER_FTP_HOST
const SSH_USER = process.env.SSH_USER || process.env.FTP_USER || process.env.HETZNER_FTP_USER
const SSH_PASSWORD = process.env.SSH_PASSWORD || process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD
const SSH_PORT = parseInt(process.env.SSH_PORT || '22', 10)
const FTP_BASE = process.env.FTP_BASE_PATH || process.env.FTP_VIDEOS_PATH || 'Videos Enero 2026'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5000

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function runCommand(conn: Client, command: string): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err: Error | undefined, stream: import('ssh2').ClientChannel | undefined) => {
      if (err) {
        reject(err)
        return
      }
      if (!stream) {
        reject(new Error('No stream'))
        return
      }
      let stdout = ''
      let stderr = ''
      stream
        .on('close', (code: number | null) => resolve({ stdout, stderr, code }))
        .on('data', (data: Buffer) => { stdout += data.toString() })
      stream.stderr?.on('data', (data: Buffer) => { stderr += data.toString() })
    })
  })
}

function connectSSH(): Promise<Client> {
  return new Promise((resolve, reject) => {
    const conn = new Client()
    conn
      .on('ready', () => resolve(conn))
      .on('error', reject)
      .connect({
        host: SSH_HOST,
        port: SSH_PORT,
        username: SSH_USER,
        password: SSH_PASSWORD,
        readyTimeout: 30_000,
      })
  })
}

async function listDirs(conn: Client, basePath: string): Promise<string[]> {
  const { stdout, code } = await runCommand(conn, `cd "${basePath}" && ls -1d */ 2>/dev/null | sed 's|/||'`)
  if (code !== 0) return []
  return stdout
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

async function main(): Promise<void> {
  if (!SSH_HOST || !SSH_USER || SSH_PASSWORD === undefined) {
    console.error('❌ Configura SSH_HOST, SSH_USER, SSH_PASSWORD (o FTP_* / HETZNER_FTP_*) en .env.local')
    process.exit(1)
  }

  let conn: Client | null = null
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[${attempt}/${MAX_RETRIES}] Conectando por SSH a ${SSH_HOST}:${SSH_PORT}...`)
      conn = await connectSSH()
      console.log('✓ Conectado')
      break
    } catch (e: unknown) {
      console.error('❌ Error de conexión:', (e as Error).message)
      if (attempt < MAX_RETRIES) {
        console.log(`Reintento en ${RETRY_DELAY_MS / 1000}s...`)
        await sleep(RETRY_DELAY_MS)
      } else {
        process.exit(1)
      }
    }
  }

  if (!conn) {
    process.exit(1)
  }

  try {
    const dirs = await listDirs(conn, FTP_BASE)
    if (dirs.length === 0) {
      console.log('⚠ No se encontraron carpetas en', FTP_BASE)
      conn.end()
      process.exit(0)
    }

    console.log(`✓ Carpetas a comprimir: ${dirs.length}`)
    console.log('')

    const total = dirs.length
    for (let i = 0; i < dirs.length; i++) {
      const folder = dirs[i]
      const zipName = `${folder}.zip`
      const cmd = `cd "${FTP_BASE}" && zip -r -0 "${zipName}" "${folder}/"`
      process.stdout.write(`[${i + 1}/${total}] ${folder}.zip ... `)

      try {
        const { stdout, stderr, code } = await runCommand(conn, cmd)
        if (code === 0) {
          console.log('OK')
        } else {
          console.log('ERROR (code', code, ')')
          if (stderr) console.error(stderr.trim())
        }
      } catch (e: unknown) {
        console.log('ERROR')
        console.error((e as Error).message)
      }
    }

    console.log('')
    console.log('✓ Fin')
  } finally {
    conn.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
