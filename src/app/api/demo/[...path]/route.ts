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

type FtpResult =
  | { ok: true; status: 200 | 206; stream: PassThrough; headers: Record<string, string> }
  | { ok: false; reason: 'ftp_connection_failed' | 'file_not_found'; message: string }

async function streamFromFtp(
  filePath: string,
  range: string | null
): Promise<FtpResult> {
  const ftpHost = process.env.FTP_HOST || process.env.HETZNER_FTP_HOST
  const ftpUser = process.env.FTP_USER || process.env.HETZNER_FTP_USER
  const ftpPassword = process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD
  if (!ftpHost || !ftpUser || !ftpPassword) {
    return { ok: false, reason: 'ftp_connection_failed', message: 'FTP no configurado' }
  }

  const useSecure = process.env.FTP_SECURE === 'true' || process.env.FTP_USE_TLS === 'true'
  const ftpPort = process.env.FTP_PORT ? parseInt(process.env.FTP_PORT, 10) : (useSecure ? 990 : 21)

  const client = new Client(60 * 1000)
  try {
    await client.access({
      host: ftpHost,
      port: ftpPort,
      user: ftpUser,
      password: ftpPassword,
      secure: useSecure ? 'implicit' : false,
    })
    await client.cd(FTP_BASE)
  } catch (err: any) {
    console.error('Demo FTP connection failed:', err?.message || err)
    try { client.close() } catch { /* ignore */ }
    return {
      ok: false,
      reason: 'ftp_connection_failed',
      message: err?.message || 'No se pudo conectar al servidor FTP. Revisa FTP_HOST, FTP_USER, FTP_PASSWORD y, si el host bloquea puerto 21, prueba FTP_SECURE=true (FTPS puerto 990).',
    }
  }

  const decoded = decodeURIComponent(filePath)
  const normalized = decoded.replace(/\u2013/g, '-') // en dash → guión
  let pathToUse = normalized
  let fileSize: number
  try {
    fileSize = await client.size(normalized)
  } catch {
    try {
      fileSize = await client.size(decoded)
      pathToUse = decoded
    } catch {
      try { client.close() } catch { /* ignore */ }
      return { ok: false, reason: 'file_not_found', message: 'Archivo no encontrado en el servidor FTP' }
    }
  }

  const pass = new PassThrough()
  let start = 0
  const headers: Record<string, string> = {
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Content-Disposition': 'inline',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  }

  let status: 200 | 206 = 200
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    start = parseInt(parts[0], 10) || 0
    status = 206
    headers['Content-Range'] = `bytes ${start}-${fileSize - 1}/${fileSize}`
    headers['Content-Length'] = String(fileSize - start)
  } else {
    headers['Content-Length'] = String(fileSize)
  }

  client.downloadTo(pass, pathToUse, start).catch((err) => pass.destroy(err)).finally(() => {
    try { client.close() } catch { /* ignore */ }
  })
  return { ok: true, status, stream: pass, headers }
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
    const ftpHost = process.env.FTP_HOST || process.env.HETZNER_FTP_HOST
    const ftpUser = process.env.FTP_USER || process.env.HETZNER_FTP_USER
    const ftpPassword = process.env.FTP_PASSWORD || process.env.HETZNER_FTP_PASSWORD
    if (!ftpHost || !ftpUser || !ftpPassword) {
      return NextResponse.json(
        {
          error: 'Demos no disponibles',
          reason: 'ftp_not_configured',
          message: 'En Render → Environment añade FTP_HOST, FTP_USER y FTP_PASSWORD (o HETZNER_FTP_*). Si el host bloquea puerto 21, añade FTP_SECURE=true para FTPS (puerto 990).',
        },
        { status: 503 }
      )
    }
    const range = req.headers.get('range')
    const ftpResult = await streamFromFtp(filePath, range)
    if (ftpResult.ok) {
      return new NextResponse(ftpResult.stream as any, {
        status: ftpResult.status,
        headers: ftpResult.headers,
      })
    }
    if (ftpResult.reason === 'file_not_found') {
      return NextResponse.json({ error: 'Video no encontrado', reason: 'file_not_found', message: ftpResult.message }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Demos no disponibles', reason: ftpResult.reason, message: ftpResult.message },
      { status: 503 }
    )
  } catch (error: any) {
    console.error('Error streaming video:', error)
    return NextResponse.json(
      { error: 'Error al cargar video' },
      { status: 500 }
    )
  }
}
