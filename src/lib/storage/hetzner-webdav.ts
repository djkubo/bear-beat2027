/**
 * Hetzner Storage Box - acceso vía WebDAV
 * Docs: https://docs.hetzner.com/storage/storage-box/access/access-webdav/
 * URL: https://u540473.your-storagebox.de
 */

import { createClient } from 'webdav'

export interface HetznerFileStat {
  filename: string
  basename: string
  lastmod: string
  size: number
  type: 'file' | 'directory'
}

const WEBDAV_URL = process.env.HETZNER_WEBDAV_URL || (() => {
  const host = process.env.HETZNER_STORAGEBOX_HOST
  if (!host) return ''
  return host.startsWith('http') ? host : `https://${host}`
})()

export function isHetznerWebDAVConfigured(): boolean {
  const user = process.env.HETZNER_STORAGEBOX_USER || process.env.HETZNER_WEBDAV_USER
  const pass = process.env.HETZNER_STORAGEBOX_PASSWORD || process.env.HETZNER_WEBDAV_PASSWORD
  return !!(WEBDAV_URL && user && pass)
}

let clientInstance: ReturnType<typeof createClient> | null = null

export function getHetznerWebDAVClient(): ReturnType<typeof createClient> | null {
  if (!isHetznerWebDAVConfigured()) return null
  if (clientInstance) return clientInstance
  const user = process.env.HETZNER_STORAGEBOX_USER || process.env.HETZNER_WEBDAV_USER!
  const pass = process.env.HETZNER_STORAGEBOX_PASSWORD || process.env.HETZNER_WEBDAV_PASSWORD!
  clientInstance = createClient(WEBDAV_URL, { username: user, password: pass })
  return clientInstance
}

/**
 * Lista contenido de una carpeta (ruta con o sin / inicial)
 */
export async function listHetznerDirectory(remotePath: string): Promise<HetznerFileStat[]> {
  const client = getHetznerWebDAVClient()
  if (!client) return []
  const path = remotePath.startsWith('/') ? remotePath : `/${remotePath}`
  try {
    const contents = await client.getDirectoryContents(path)
    const list = Array.isArray(contents) ? contents : (contents as { data: HetznerFileStat[] }).data
    return list.filter((f: HetznerFileStat) => f.basename !== '.' && f.basename !== '..')
  } catch (e) {
    console.error('Hetzner listDirectory error:', path, e)
    return []
  }
}

/**
 * Stream de lectura de un archivo (para descarga/zip)
 */
export function createHetznerReadStream(remotePath: string): ReturnType<ReturnType<typeof createClient>['createReadStream']> | null {
  const client = getHetznerWebDAVClient()
  if (!client) return null
  const path = remotePath.startsWith('/') ? remotePath : `/${remotePath}`
  try {
    return client.createReadStream(path)
  } catch (e) {
    console.error('Hetzner createReadStream error:', path, e)
    return null
  }
}

/**
 * Contenido de un archivo en buffer (para ZIP cuando archiver lo pide)
 */
export async function getHetznerFileBuffer(remotePath: string): Promise<Buffer | null> {
  const client = getHetznerWebDAVClient()
  if (!client) return null
  const path = remotePath.startsWith('/') ? remotePath : `/${remotePath}`
  try {
    const data = await client.getFileContents(path)
    const buf = (data as { data?: Buffer | ArrayBuffer }).data ?? data
    if (Buffer.isBuffer(buf)) return buf
    if (buf instanceof ArrayBuffer) return Buffer.from(buf)
    return null
  } catch (e) {
    console.error('Hetzner getFileContents error:', path, e)
    return null
  }
}

/** Tamaño por defecto para leer inicio del video (suficiente para moov en la mayoría de MP4) */
const DEFAULT_PARTIAL_READ_BYTES = 15 * 1024 * 1024 // 15 MB

/**
 * Lee los primeros N bytes de un archivo vía stream (para ffprobe/ffmpeg sin descargar todo)
 */
export async function streamHetznerToTempFile(
  remotePath: string,
  maxBytes: number = DEFAULT_PARTIAL_READ_BYTES
): Promise<{ tempPath: string; bytesRead: number } | null> {
  const stream = createHetznerReadStream(remotePath)
  if (!stream) return null
  const fs = await import('fs')
  const path = await import('path')
  const os = await import('os')
  const ext = path.extname(remotePath) || '.bin'
  const tempPath = path.join(os.tmpdir(), `hetzner-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  const writable = fs.createWriteStream(tempPath)
  let bytesRead = 0
  let done = false
  const cleanup = () => {
    stream.destroy()
    try { writable.destroy() } catch (_) {}
  }
  return new Promise((resolve, reject) => {
    const doneOk = () => {
      if (done) return
      done = true
      cleanup()
      writable.end(() => resolve({ tempPath, bytesRead }))
    }
    const doneErr = (err: Error) => {
      if (done) return
      done = true
      cleanup()
      fs.unlink(tempPath, () => reject(err))
    }
    stream.on('data', (chunk: Buffer) => {
      if (bytesRead >= maxBytes) return
      const toWrite = bytesRead + chunk.length > maxBytes ? chunk.slice(0, maxBytes - bytesRead) : chunk
      bytesRead += toWrite.length
      writable.write(toWrite, (err) => {
        if (err) doneErr(err)
        else if (bytesRead >= maxBytes) doneOk()
      })
    })
    stream.on('end', () => doneOk())
    stream.on('error', doneErr)
    writable.on('error', doneErr)
  })
}
