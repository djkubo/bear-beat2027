import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// ==========================================
// API DE STREAMING DE DEMOS
// Sirve los videos con headers anti-descarga
// ==========================================

const VIDEOS_BASE_PATH = process.env.VIDEOS_PATH || path.join(process.cwd(), 'Videos Enero 2026')

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    const filePath = pathSegments.join('/')
    const fullPath = path.join(VIDEOS_BASE_PATH, decodeURIComponent(filePath))

    // Verificar que el archivo existe
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: 'Video no encontrado' },
        { status: 404 }
      )
    }

    // Obtener stats del archivo
    const stat = fs.statSync(fullPath)
    const fileSize = stat.size

    // Manejar Range requests para streaming
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
          // Headers anti-descarga
          'Content-Disposition': 'inline',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    }
  } catch (error: any) {
    console.error('Error streaming video:', error)
    return NextResponse.json(
      { error: 'Error al cargar video' },
      { status: 500 }
    )
  }
}
