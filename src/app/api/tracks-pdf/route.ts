/**
 * GET /api/tracks-pdf
 * Genera un PDF con el listado completo de tracks del pack, con branding Bear Beat.
 * Manual de marca: bear-blue #08E1F7, bear-black #000000, logo en /public/logos/
 */
import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit')

import { createServerClient } from '@/lib/supabase/server'

const BEAR_BLUE = '#08E1F7'
const BEAR_BLACK = '#000000'
const PACK_SLUG = 'enero-2026'

interface VideoRow {
  id: string
  artist: string
  title: string
  duration?: number
  file_path?: string
  genre_id?: string
  genres?: { name: string; slug: string } | null
}

interface GenreGroup {
  name: string
  videos: { artist: string; title: string; duration?: string; key?: string; bpm?: string }[]
}

function formatDuration(seconds: number): string {
  if (!seconds) return ''
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

async function getTracksByGenre(): Promise<GenreGroup[]> {
  const supabase = await createServerClient()
  const { data: pack } = await supabase.from('packs').select('id, name').eq('slug', PACK_SLUG).single()
  if (!pack) return []

  const { data: rows, error } = await supabase
    .from('videos')
    .select('id, title, artist, duration, file_path, genre_id, genres(name, slug)')
    .eq('pack_id', pack.id)
    .order('genre_id')
    .order('artist')

  if (error || !rows?.length) return []

  const byGenre = new Map<string, GenreGroup>()
  for (const row of rows as unknown as VideoRow[]) {
    const genreName = row.genres?.name ?? row.file_path?.split('/')[0] ?? 'Sin género'
    if (!byGenre.has(genreName)) {
      byGenre.set(genreName, { name: genreName, videos: [] })
    }
    const g = byGenre.get(genreName)!
    g.videos.push({
      artist: row.artist || row.title,
      title: row.title,
      duration: row.duration != null ? formatDuration(row.duration) : undefined,
      key: undefined,
      bpm: undefined,
    })
  }
  return Array.from(byGenre.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function buildPdfBuffer(genres: GenreGroup[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const logoPath = path.join(process.cwd(), 'public', 'logos', 'BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png')
    const hasLogo = fs.existsSync(logoPath)

    // ----- Header (branding Bear Beat) -----
    doc.fillColor(BEAR_BLACK).rect(0, 0, doc.page.width, 100).fill()
    if (hasLogo) {
      try {
        doc.image(logoPath, 50, 20, { width: 100, height: 60 })
      } catch {
        // si falla la imagen, solo texto
      }
    }
    doc.fillColor(BEAR_BLUE).fontSize(22).font('Helvetica-Bold').text('Listado de Tracks', 50, hasLogo ? 88 : 35)
    doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica').text('Pack Enero 2026 · Bear Beat', 50, hasLogo ? 112 : 58)
    doc.y = 125

    // ----- Contenido por género -----
    const pageHeight = doc.page.height - 80
    const rowHeight = 14
    const colWidths = { genre: 90, artist: 120, title: 160, bpm: 40, key: 45, duration: 50 }

    doc.font('Helvetica-Bold').fontSize(10).fillColor(BEAR_BLUE)
    doc.text('Género', 50, doc.y)
    doc.text('Artista', 50 + colWidths.genre, doc.y)
    doc.text('Título', 50 + colWidths.genre + colWidths.artist, doc.y)
    doc.text('BPM', 50 + colWidths.genre + colWidths.artist + colWidths.title, doc.y)
    doc.text('Key', 50 + colWidths.genre + colWidths.artist + colWidths.title + colWidths.bpm, doc.y)
    doc.text('Duración', 50 + colWidths.genre + colWidths.artist + colWidths.title + colWidths.bpm + colWidths.key, doc.y)
    doc.moveTo(50, doc.y + 6).lineTo(doc.page.width - 50, doc.y + 6).strokeColor(BEAR_BLUE).lineWidth(0.5).stroke()
    doc.y += 12
    doc.font('Helvetica').fontSize(9).fillColor(BEAR_BLACK)

    for (const genre of genres) {
      for (const v of genre.videos) {
        if (doc.y > pageHeight) {
          doc.addPage()
          doc.y = 50
          doc.font('Helvetica-Bold').fontSize(10).fillColor(BEAR_BLUE)
          doc.text('Género', 50, doc.y)
          doc.text('Artista', 50 + colWidths.genre, doc.y)
          doc.text('Título', 50 + colWidths.genre + colWidths.artist, doc.y)
          doc.text('BPM', 50 + colWidths.genre + colWidths.artist + colWidths.title, doc.y)
          doc.text('Key', 50 + colWidths.genre + colWidths.artist + colWidths.title + colWidths.bpm, doc.y)
          doc.text('Duración', 50 + colWidths.genre + colWidths.artist + colWidths.title + colWidths.bpm + colWidths.key, doc.y)
          doc.moveTo(50, doc.y + 6).lineTo(doc.page.width - 50, doc.y + 6).strokeColor(BEAR_BLUE).lineWidth(0.5).stroke()
          doc.y += 12
          doc.font('Helvetica').fontSize(9).fillColor(BEAR_BLACK)
        }
        const y0 = doc.y
        doc.text(genre.name.substring(0, 12), 50, y0, { width: colWidths.genre, ellipsis: true })
        doc.text((v.artist || '').substring(0, 22), 50 + colWidths.genre, y0, { width: colWidths.artist, ellipsis: true })
        doc.text((v.title || '').substring(0, 28), 50 + colWidths.genre + colWidths.artist, y0, { width: colWidths.title, ellipsis: true })
        doc.text((v.bpm || '-').substring(0, 5), 50 + colWidths.genre + colWidths.artist + colWidths.title, y0, { width: colWidths.bpm })
        doc.text((v.key || '-').substring(0, 5), 50 + colWidths.genre + colWidths.artist + colWidths.title + colWidths.bpm, y0, { width: colWidths.key })
        doc.text((v.duration || '-').substring(0, 6), 50 + colWidths.genre + colWidths.artist + colWidths.title + colWidths.bpm + colWidths.key, y0, { width: colWidths.duration })
        doc.y += rowHeight
      }
    }

    // ----- Footer en cada página -----
    const pageCount = doc.bufferedPageRange().count
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)
      doc.fontSize(8).fillColor(BEAR_BLUE)
      doc.text('Bear Beat © 2026 · bearbeat.com', 50, doc.page.height - 40, { align: 'center', width: doc.page.width - 100 })
    }

    doc.end()
  })
}

export async function GET() {
  try {
    const genres = await getTracksByGenre()
    const buffer = await buildPdfBuffer(genres)
    const filename = 'listado-tracks-bear-beat.pdf'
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (err) {
    console.error('Error generating tracks PDF:', err)
    return NextResponse.json({ error: 'Error al generar el PDF' }, { status: 500 })
  }
}
