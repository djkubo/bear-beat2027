import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl } from '@/lib/storage/bunny'

const BUNNY_PACK_PREFIX = process.env.BUNNY_PACK_PATH_PREFIX || 'packs/enero-2026'

/**
 * GET /api/thumbnail-cdn?path=Genre/filename.jpg
 * Redirige a la URL firmada de Bunny para esa imagen (portada del video).
 * Usado cuando thumbnail_url en la DB es un path relativo (ej. "Reggaeton/Artist - Title.jpg").
 */
export async function GET(req: NextRequest) {
  const pathParam = req.nextUrl.searchParams.get('path')
  if (!pathParam || pathParam.includes('..')) {
    return NextResponse.json({ error: 'path required' }, { status: 400 })
  }
  const sanitized = pathParam.replace(/^\//, '')
  const bunnyPath = `${BUNNY_PACK_PREFIX}/${sanitized}`
  const signedUrl = generateSignedUrl(bunnyPath, 3600, process.env.NEXT_PUBLIC_APP_URL)
  return NextResponse.redirect(signedUrl)
}
