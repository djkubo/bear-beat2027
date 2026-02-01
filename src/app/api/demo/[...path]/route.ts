import { NextRequest, NextResponse } from 'next/server'
import { isHetznerWebDAVConfigured, createHetznerReadStream } from '@/lib/storage/hetzner-webdav'

// ==========================================
// API DE STREAMING DE DEMOS - Solo desde Hetzner WebDAV
// ==========================================

const DEMO_HEADERS = {
  'Content-Type': 'video/mp4',
  'Content-Disposition': 'inline',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'X-Content-Type-Options': 'nosniff',
} as const

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    if (!isHetznerWebDAVConfigured()) {
      return NextResponse.json(
        { error: 'Configura Hetzner Storage Box (HETZNER_STORAGEBOX_* en .env) para demos.' },
        { status: 503 }
      )
    }

    const { path: pathSegments } = await params
    const filePath = pathSegments.map((p) => decodeURIComponent(p)).join('/')
    const sanitizedPath = filePath.replace(/\.\./g, '').replace(/^\//, '')

    const remotePath = `/${sanitizedPath}`
    const readStream = createHetznerReadStream(remotePath)
    if (!readStream) {
      return NextResponse.json({ error: 'Video no encontrado' }, { status: 404 })
    }
    const webStream = new ReadableStream({
      start(controller) {
        readStream.on('data', (chunk: Buffer) => controller.enqueue(chunk))
        readStream.on('end', () => controller.close())
        readStream.on('error', (err) => controller.error(err))
      },
    })
    return new NextResponse(webStream, {
      status: 200,
      headers: {
        ...DEMO_HEADERS,
        'Accept-Ranges': 'bytes',
      },
    })
  } catch (error: any) {
    console.error('Error streaming demo:', error)
    return NextResponse.json(
      { error: 'Error al cargar video' },
      { status: 500 }
    )
  }
}
