import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/placeholder/thumb?artist=...&title=...
 * Devuelve un SVG que sirve como portada/thumbnail cuando no hay imagen real.
 * Usado en producción para que cada video tenga una "portada" visual (iniciales + gradiente).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const artist = searchParams.get('artist')?.trim() || ''
  const title = searchParams.get('title')?.trim() || ''
  const text = searchParams.get('text')?.trim() || ''

  const initial = (artist?.[0] || title?.[0] || text?.[0] || 'V').toUpperCase()
  const secondLetter = (artist?.[1] || title?.[1] || '').toUpperCase()
  const twoLetters = secondLetter ? `${initial}${secondLetter}` : initial

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a5f;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4c1d95;stop-opacity:0.8" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.4"/>
    </filter>
  </defs>
  <rect width="480" height="270" fill="url(#bg)"/>
  <text x="240" y="155" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-family="system-ui, -apple-system, sans-serif" font-size="120" font-weight="800" filter="url(#shadow)">${escapeXml(twoLetters)}</text>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
