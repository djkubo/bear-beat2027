#!/usr/bin/env npx tsx
/**
 * Generador de portadas (JPG) para cada video: descarga vía FTP, extrae frame al 20% con ffmpeg,
 * redimensiona 600x600 y sube a thumbnails/ en el FTP.
 *
 * Requisitos:
 *   - .env.local: FTP_HOST, FTP_USER, FTP_PASSWORD (o HETZNER_FTP_*)
 *   - FTP_BASE_PATH (ej. "Videos Enero 2026")
 *   - ffmpeg y ffprobe instalados localmente
 *
 * Uso: npx tsx scripts/maintenance/generate-thumbs.ts
 *      npm run maintenance:generate-thumbs
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { Client } from 'basic-ftp'
import ffmpeg from 'fluent-ffmpeg'
import { loadEnv } from './load-env'

loadEnv()

const FTP_HOST = process.env.FTP_HOST || process.env.HETZNER_FTP_HOST
const FTP_USER = process.env.FTP_USER || process.env.HETZNER_FTP_USER
const FTP_PASSWORD = process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD
const FTP_BASE = process.env.FTP_BASE_PATH || process.env.FTP_VIDEOS_PATH || 'Videos Enero 2026'
const THUMB_DIR = 'thumbnails'
const VIDEO_EXT = /\.(mp4|mov|avi|mkv)$/i
const THUMB_SIZE = '600x600'
const FRAME_AT_PERCENT = 0.2
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 3000
const CONCURRENCY = 2

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function listFtpRecursive(client: Client, basePath: string): Promise<string[]> {
  const files: string[] = []
  const list = await client.list(basePath)
  for (const item of list) {
    const remotePath = basePath ? `${basePath}/${item.name}` : item.name
    if (item.isDirectory && !item.name.startsWith('.')) {
      const sub = await listFtpRecursive(client, remotePath)
      files.push(...sub)
    } else if (VIDEO_EXT.test(item.name)) {
      files.push(remotePath)
    }
  }
  return files
}

async function listThumbnailsRecursive(client: Client, basePath: string): Promise<string[]> {
  const out: string[] = []
  const list = await client.list(basePath)
  for (const item of list) {
    const remotePath = basePath ? `${basePath}/${item.name}` : item.name
    if (item.isDirectory && !item.name.startsWith('.')) {
      out.push(...(await listThumbnailsRecursive(client, remotePath)))
    } else if (item.name.toLowerCase().endsWith('.jpg')) {
      out.push(remotePath)
    }
  }
  return out
}

async function listThumbnails(client: Client): Promise<Set<string>> {
  const thumbs = new Set<string>()
  try {
    const all = await listThumbnailsRecursive(client, THUMB_DIR)
    all.forEach((p) => thumbs.add(p.replace(THUMB_DIR + '/', '').replace(THUMB_DIR + '\\', '')))
  } catch {
    // thumbnails/ puede no existir
  }
  return thumbs
}

function videoPathToThumbPath(videoPath: string): string {
  return videoPath.replace(VIDEO_EXT, '.jpg')
}

function getDurationSeconds(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err)
      const dur = metadata.format.duration
      resolve(typeof dur === 'number' ? dur : 0)
    })
  })
}

async function extractFrameAtPercentWithDuration(
  inputPath: string,
  outputPath: string,
  percent: number
): Promise<void> {
  const duration = await getDurationSeconds(inputPath)
  const seekSec = Math.max(0, duration * percent)
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(seekSec)
      .outputOptions(['-vframes 1', '-q:v 2'])
      .size(THUMB_SIZE)
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run()
  })
}

async function downloadFile(client: Client, remotePath: string, localPath: string): Promise<void> {
  await client.downloadTo(localPath, remotePath)
}

async function uploadFile(client: Client, localPath: string, remotePath: string): Promise<void> {
  const dir = path.dirname(remotePath).replace(/\\/g, '/')
  if (dir) await client.ensureDir(dir)
  await client.uploadFrom(fs.createReadStream(localPath), remotePath)
}

async function processOne(
  client: Client,
  videoPath: string,
  index: number,
  total: number
): Promise<boolean> {
  const thumbRel = videoPathToThumbPath(videoPath)
  const tmpDir = os.tmpdir()
  const id = Math.random().toString(36).slice(2, 10)
  const tmpVideo = path.join(tmpDir, `bb-video-${id}${path.extname(videoPath)}`)
  const tmpThumb = path.join(tmpDir, `bb-thumb-${id}.jpg`)
  const thumbRemote = `${THUMB_DIR}/${thumbRel}`.replace(/\\/g, '/')

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await client.cd(FTP_BASE)
      await downloadFile(client, videoPath, tmpVideo)
      await extractFrameAtPercentWithDuration(tmpVideo, tmpThumb, FRAME_AT_PERCENT)
      await client.cd(FTP_BASE)
      await uploadFile(client, tmpThumb, thumbRemote)
      console.log(`[${index + 1}/${total}] OK ${videoPath} → ${thumbRel}`)
      return true
    } catch (e: unknown) {
      console.error(`[${index + 1}/${total}] Intento ${attempt}/${MAX_RETRIES} ${videoPath}:`, (e as Error).message)
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS)
    } finally {
      try {
        if (fs.existsSync(tmpVideo)) fs.unlinkSync(tmpVideo)
        if (fs.existsSync(tmpThumb)) fs.unlinkSync(tmpThumb)
      } catch {
        // ignore
      }
    }
  }
  return false
}

async function main(): Promise<void> {
  if (!FTP_HOST || !FTP_USER || FTP_PASSWORD === undefined) {
    console.error('❌ Configura FTP_HOST, FTP_USER y FTP_PASSWORD (Hetzner) en .env.local')
    process.exit(1)
  }

  const client = new Client(60 * 1000)
  try {
    await client.access({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASSWORD,
      secure: process.env.FTP_SECURE === 'true',
    })
    await client.cd(FTP_BASE)
    const videoPaths = await listFtpRecursive(client, '.')
    const existingThumbs = await listThumbnails(client)
    const missing = videoPaths.filter((p) => !existingThumbs.has(videoPathToThumbPath(p)))

    console.log(`✓ Videos: ${videoPaths.length}, thumbnails existentes: ${existingThumbs.size}, faltantes: ${missing.length}`)
    if (missing.length === 0) {
      console.log('Nada que generar.')
      return
    }

    let ok = 0
    for (let i = 0; i < missing.length; i += CONCURRENCY) {
      const batch = missing.slice(i, i + CONCURRENCY)
      await Promise.all(
        batch.map((videoPath, j) =>
          processOne(client, videoPath, i + j, missing.length).then((r) => {
            if (r) ok++
          })
        )
      )
    }
    console.log(`✓ Generados: ${ok}/${missing.length}`)
  } finally {
    client.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
