import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { PassThrough } from 'stream'
import { Client } from 'basic-ftp'

// ==========================================
// API DE STREAMING DE DEMOS
// 1) Disco local (desarrollo). 2) En producción: proxy desde FTP si no hay archivo local.
// ==========================================

const VIDEOS_BASE_PATH = process.env.VIDEOS_PATH || path.join(process.cwd(), 'Videos Enero 2026')
const FTP_BASE = process.env.FTP_BASE_PATH || process.env.FTP_VIDEOS_PATH || 'Videos Enero 2026'

async function streamFromFtp(
  filePath: string,
  range: string | null
): Promise<{ status: 200 | 206; stream: PassThrough; headers: Record<string, string> } | null> {
  const ftpHost = process.env.FTP_HOST || process.env.HETZNER_FTP_HOST
  const ftpUser = process.env.FTP_USER || process.env.HETZNER_FTP_USER
  const ftpPassword = process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD
  if (!ftpHost || !ftpUser || !ftpPassword) return null

  const client = new Client(60 * 1000)
  try {
    await client.access({ host: ftpHost, user: ftpUser, password: ftpPassword, secure: false })
    await client.cd(FTP_BASE)
  } catch {
    return null
  }

  const remotePath = decodeURIComponent(filePath)
  let fileSize: number
  try {
    fileSize = await client.size(remotePath)
  } catch {
    try { client.close() } catch { /* ignore */ }
    return null
  }

  const pass = new PassThrough()
  let start = 0
  let end = fileSize - 1
  let status: 200 | 206 = 200
  const headers: Record<string, string> = {
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Content-Disposition': 'inline',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  }

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    start = parseInt(parts[0], 10) || 0
    status = 206
    const lengthFromStart = fileSize - start
    headers['Content-Range'] = `bytes ${start}-${fileSize - 1}/${fileSize}`
    headers['Content-Length'] = String(lengthFromStart)
  } else {
    headers['Content-Length'] = String(fileSize)
  }

  client.downloadTo(pass, remotePath, start).catch((err) => pass.destroy(err)).finally(() => {
    try { client.close() } catch { /* ignore */ }
  })
  return { status, stream: pass, headers }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    const filePath = pathSegments.join('/')
    const fullPath = path.join(VIDEOS_BASE_PATH, decodeURIComponent(filePath))

    // 1) Disco local
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath)
      const fileSize = stat.size
      const range = req.headers.get('range')

    if (range) {
      // Streaming parcial
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      const fileStream = fs.createReadStream(fullPath, { start, end })
      const chunks: Buffer[] = []

      for await (const chunk of fileStream) {
        chunks.push(Buffer.from(chunk))
      }

      const buffer = Buffer.concat(chunks)

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': 'video/mp4',
          // Headers anti-descarga
          'Content-Disposition': 'inline',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    } else {
      // Streaming completo
      const fileBuffer = fs.readFileSync(fullPath)

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Content-Disposition': 'inline',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    }
    }

    // 2) Producción: proxy desde FTP
    const range = req.headers.get('range')
    const ftpResult = await streamFromFtp(filePath, range)
    if (ftpResult) {
      return new NextResponse(ftpResult.stream as any, {
        status: ftpResult.status,
        headers: ftpResult.headers,
      })
    }

    return NextResponse.json({ error: 'Video no encontrado' }, { status: 404 })
  } catch (error: any) {
    console.error('Error streaming video:', error)
    return NextResponse.json(
      { error: 'Error al cargar video' },
      { status: 500 }
    )
  }
}
