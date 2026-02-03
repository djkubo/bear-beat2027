import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, isBunnyConfigured, getBunnyPackPrefix, getBunnyConfigStatus } from '@/lib/bunny'
import { isFtpConfigured, streamFileFromFtp, getContentType } from '@/lib/ftp-stream'

export const dynamic = 'force-dynamic'

const DEMO_EXPIRY_SECONDS = 1800 // 30 min

/**
 * GET /api/demo-url?path=Genre/Video.mp4
 * Bunny: redirige a URL firmada. Si no está configurado: 503 con mensaje claro de qué variable falta.
 */
export async function GET(req: NextRequest) {
  try {
    const pathParam = req.nextUrl.searchParams.get('path')
    if (!pathParam || pathParam.includes('..')) {
      return NextResponse.json({ error: 'path required' }, { status: 400 })
    }

    let pathNorm: string
    try {
      pathNorm = decodeURIComponent(pathParam).replace(/^\//, '').trim()
    } catch {
      pathNorm = pathParam.replace(/^\//, '').trim()
    }
    pathNorm = pathNorm.replace(/^Videos Enero 2026\/?/i, '').trim() || pathNorm

    if (!isBunnyConfigured()) {
      const status = getBunnyConfigStatus()
      console.warn('[demo-url] Bunny no configurado o inválido:', { missing: status.missing, invalid: status.invalid })
      if (isFtpConfigured()) {
        try {
          const stream = await streamFileFromFtp(pathNorm, 'video')
          const { Readable } = await import('stream')
          const webStream = Readable.toWeb(stream) as ReadableStream
          const contentType = getContentType(pathNorm)
          return new NextResponse(webStream, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'private, max-age=300',
              'Accept-Ranges': 'bytes',
              'X-Content-Type-Options': 'nosniff',
            },
          })
        } catch (e) {
          console.error('demo-url FTP:', e)
          return NextResponse.json({ error: 'Error al cargar el demo', reason: 'ftp_error' }, { status: 503 })
        }
      }
      return NextResponse.json(
        {
          error: 'Demos no disponibles',
          reason: 'bunny_not_configured',
          message: status.invalid.length > 0 ? 'Revisa que las variables de Bunny en Render sean correctas.' : 'Configura en Render (Environment) las variables de BunnyCDN.',
          missing: status.missing,
          invalid: status.invalid,
          hints: status.hints,
        },
        { status: 503 }
      )
    }

    const prefix = getBunnyPackPrefix()
    const bunnyPath = prefix && !pathNorm.toLowerCase().startsWith(prefix.toLowerCase() + '/')
      ? `${prefix}/${pathNorm}`
      : pathNorm
    try {
      const signedUrl = generateSignedUrl(bunnyPath, DEMO_EXPIRY_SECONDS)
      if (!signedUrl || !signedUrl.startsWith('http') || signedUrl.length < 20) {
        console.warn('[demo-url] URL firmada inválida. No redirigir.')
        return NextResponse.json({ error: 'Demo no disponible', reason: 'invalid_signed_url' }, { status: 503 })
      }
      return NextResponse.redirect(signedUrl)
    } catch (e) {
      console.error('[demo-url] Bunny signed URL failed:', (e as Error)?.message || e, 'path:', pathNorm)
      return NextResponse.json({ error: 'Demo no disponible', reason: 'bunny_error' }, { status: 503 })
    }
  } catch (e) {
    console.error('[demo-url] Unhandled:', (e as Error)?.message || e)
    return NextResponse.json({ error: 'Demo no disponible' }, { status: 503 })
  }
}
