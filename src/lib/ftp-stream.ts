/**
 * Stream de archivos desde FTP (Hetzner Storage Box).
 *
 * ESTRUCTURA EN LA RAÍZ DEL FTP (tal como está en Hetzner):
 *
 *   / (raíz)
 *   ├── Bachata/              ← carpeta por género, DENTRO van los JPG (portadas)
 *   │   ├── Artist - Title.jpg
 *   │   └── ...
 *   ├── Cumbia/
 *   │   └── *.jpg
 *   ├── Bachata.zip           ← todos los ZIP en la raíz
 *   ├── Cumbia.zip
 *   └── Videos Enero 2026/    ← carpeta de videos (FTP_BASE)
 *       ├── Bachata/          ← DENTRO van los MP4
 *       │   ├── Artist - Title.mp4
 *       │   └── ...
 *       └── Cumbia/
 *           └── *.mp4
 *
 * Cómo se usa cada tipo:
 * - thumb: path "Bachata/Artist - Title.jpg" → sin cd, RETR desde raíz.
 * - video: path "Bachata/Artist - Title.mp4" → cd(FTP_BASE), luego RETR "Bachata/Artist - Title.mp4".
 * - zip:   path "Bachata.zip"                 → sin cd, RETR desde raíz.
 *
 * Variables: FTP_HOST, FTP_USER, FTP_PASSWORD (o HETZNER_FTP_*), FTP_BASE_PATH (default "Videos Enero 2026").
 */

import { Client } from 'basic-ftp'
import { PassThrough } from 'stream'

const FTP_BASE = (process.env.FTP_BASE_PATH || process.env.FTP_VIDEOS_PATH || 'Videos Enero 2026').replace(/\/$/, '')

export function isFtpConfigured(): boolean {
  const host = process.env.FTP_HOST || process.env.HETZNER_FTP_HOST
  const user = process.env.FTP_USER || process.env.HETZNER_FTP_USER
  const pass = process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD
  return !!(host && user && pass !== undefined)
}

function getFtpOptions() {
  return {
    host: process.env.FTP_HOST || process.env.HETZNER_FTP_HOST!,
    user: process.env.FTP_USER || process.env.HETZNER_FTP_USER!,
    password: process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD!,
    secure: process.env.FTP_SECURE === 'true' || process.env.FTP_USE_TLS === 'true',
    secureOptions: process.env.FTP_INSECURE !== 'true' ? undefined : { rejectUnauthorized: false },
  }
}

const FTP_FIRST_BYTE_TIMEOUT_MS = 28_000

/**
 * Descarga un archivo del FTP y devuelve un stream legible.
 * - type 'video': path = "Genre/video.mp4" → cd(FTP_BASE) y RETR path
 * - type 'thumb': path = "Genre/file.jpg" → en raíz, RETR path
 * - type 'zip': path = "Genre.zip" → en raíz, RETR path
 */
export async function streamFileFromFtp(
  relativePath: string,
  type: 'video' | 'thumb' | 'zip'
): Promise<PassThrough> {
  const pathSafe = relativePath.replace(/\.\./g, '').replace(/^\/+/, '').trim()
  if (!pathSafe) throw new Error('Path vacío')

  const client = new Client(120_000) // 2 min timeout para archivos grandes
  const pass = new PassThrough()

  const cleanup = () => {
    try {
      client.close()
    } catch {
      // ignore
    }
  }

  const opts = getFtpOptions()
  client.access({
    ...opts,
    secure: opts.secure,
    secureOptions: opts.secure ? { rejectUnauthorized: false } : undefined,
  })
    .then(async () => {
      if (type === 'video') {
        try {
          await client.cd(FTP_BASE)
        } catch {
          cleanup()
          pass.destroy(new Error(`No se encontró la carpeta "${FTP_BASE}" en el FTP.`))
          return
        }
      }
      try {
        await client.downloadTo(pass, pathSafe)
      } catch (e) {
        pass.destroy(e instanceof Error ? e : new Error(String(e)))
      } finally {
        cleanup()
      }
    })
    .catch((e) => {
      cleanup()
      pass.destroy(e instanceof Error ? e : new Error(String(e)))
    })

  return pass
}

/**
 * Igual que streamFileFromFtp pero espera a tener conexión FTP y primer byte antes de resolver.
 * Así el reproductor de video recibe datos de inmediato y no hace timeout.
 * Si el archivo no existe o hay error, rechaza la promesa (para que demo-url pueda hacer fallback a Bunny).
 */
export function streamFileFromFtpOnceReady(
  relativePath: string,
  type: 'video' | 'thumb' | 'zip'
): Promise<PassThrough> {
  const pathSafe = relativePath.replace(/\.\./g, '').replace(/^\/+/, '').trim()
  if (!pathSafe) return Promise.reject(new Error('Path vacío'))

  const client = new Client(120_000)
  const pass = new PassThrough()
  const resultStream = new PassThrough()

  const cleanup = () => {
    try {
      client.close()
    } catch {
      // ignore
    }
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup()
      pass.destroy()
      reject(new Error('FTP timeout: no se recibió el primer byte a tiempo'))
    }, FTP_FIRST_BYTE_TIMEOUT_MS)

    const onFirstData = (chunk: Buffer | string) => {
      clearTimeout(timeout)
      resultStream.write(chunk)
      pass.pipe(resultStream, { end: true })
      resolve(resultStream)
    }

    pass.once('data', onFirstData)
    pass.once('error', (err) => {
      clearTimeout(timeout)
      resultStream.destroy(err)
      reject(err)
    })

    const opts = getFtpOptions()
    client
      .access({
        ...opts,
        secure: opts.secure,
        secureOptions: opts.secure ? { rejectUnauthorized: false } : undefined,
      })
      .then(async () => {
        if (type === 'video') {
          try {
            await client.cd(FTP_BASE)
          } catch (e) {
            cleanup()
            pass.destroy(e instanceof Error ? e : new Error(String(e)))
            return
          }
        }
        client
          .downloadTo(pass, pathSafe)
          .then(() => cleanup())
          .catch((e) => {
            pass.destroy(e instanceof Error ? e : new Error(String(e)))
            cleanup()
          })
      })
      .catch((e) => {
        clearTimeout(timeout)
        cleanup()
        pass.destroy()
        reject(e instanceof Error ? e : new Error(String(e)))
      })
  })
}

/**
 * Content-Type según extensión (para cabeceras de respuesta).
 */
export function getContentType(pathOrFilename: string): string {
  const lower = pathOrFilename.toLowerCase()
  if (lower.endsWith('.mp4') || lower.endsWith('.mov')) return 'video/mp4'
  if (lower.endsWith('.avi')) return 'video/x-msvideo'
  if (lower.endsWith('.mkv')) return 'video/x-matroska'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.zip')) return 'application/zip'
  return 'application/octet-stream'
}
