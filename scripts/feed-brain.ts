/**
 * Feed Brain – Alimenta la base vectorial para el Chat Web (BearBot).
 * Fuentes: tabla `videos` (catálogo por género) y reglas de negocio hardcodeadas
 * (Precios, FTP, Drive, descargas, pagos).
 * Modelo: text-embedding-3-large (3072 dimensiones).
 *
 * Uso: npx tsx scripts/feed-brain.ts
 * Env: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const EMBEDDING_MODEL = 'text-embedding-3-large'
const EMBEDDING_DIMENSIONS = 3072

// ----- Reglas de negocio (Precios, FTP, Drive, descargas) -----
const HARDCODED_RULES: { content: string; metadata: Record<string, string> }[] = [
  {
    metadata: { source: 'precios' },
    content: `Precios Bear Beat. Pack Video Remixes 2026: $350 MXN o $19 USD. Pago único, acceso permanente. Incluye miles de videos HD/4K por género (Bachata, Reggaeton, Cumbia, Salsa, Banda, etc.) con Key y BPM. Métodos de pago: Tarjeta (inmediato), OXXO (México), SPEI (México), PayPal. Garantía 30 días reembolso completo.`,
  },
  {
    metadata: { source: 'ftp' },
    content: `Descarga por FTP Bear Beat. Después de comprar tienes acceso a servidor FTP (Hetzner Storage Box). Credenciales FTP se muestran en el dashboard y en el email de bienvenida. Puedes usar FileZilla o Air Explorer. Host, usuario y contraseña están en "Ver datos y guías" en la sección de descargas. La carpeta completa del pack está disponible por FTP si el ZIP no está listo.`,
  },
  {
    metadata: { source: 'drive' },
    content: `Google Drive Bear Beat. También ofrecemos enlace a carpeta de Google Drive con los videos del pack. El enlace "Abrir carpeta Drive" está en el dashboard de descargas. Puedes descargar por género o todo el pack desde Drive. Alternativas: descarga web (vídeo a vídeo) o FTP.`,
  },
  {
    metadata: { source: 'descargas' },
    content: `Descargas Bear Beat. Tres opciones: (1) Biblioteca online en la web, vídeo a vídeo. (2) Google Drive: enlace a carpeta compartida. (3) Servidor FTP: credenciales en el dashboard. Si el ZIP de un género no está disponible, usa FTP o descarga los videos individuales. Soporte por chat si tienes problemas.`,
  },
  {
    metadata: { source: 'pagos' },
    content: `Pagos Bear Beat. Aceptamos tarjeta (Visa, Mastercard), OXXO (efectivo México), SPEI (transferencia México), PayPal. Pago único $19 USD o $350 MXN. Acceso inmediato tras el pago. Si pagaste y no tienes acceso, escribe al chat con tu email para verificar. Reembolsos: garantía 30 días, 100% del monto.`,
  },
  {
    metadata: { source: 'reglas_negocio' },
    content: `Bear Beat - Reglas de negocio. E-commerce de música para DJs. Packs de video remixes. Precio $19 USD / $350 MXN. Descarga: web, Google Drive o FTP. Soporte solo por chat (web, Messenger, Instagram). Garantía 30 días. No reembolsos parciales. Incluye Key y BPM en los videos.`,
  },
]

async function main() {
  const openaiKey = process.env.OPENAI_API_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!openaiKey) {
    console.error('Falta OPENAI_API_KEY')
    process.exit(1)
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const openai = new OpenAI({ apiKey: openaiKey })
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const docs: { content: string; metadata: Record<string, unknown> }[] = [...HARDCODED_RULES]

  // ----- Catálogo: tabla videos por género -----
  try {
    const { data: genres } = await supabase.from('genres').select('id, name').order('name')
    const { data: videos } = await supabase
      .from('videos')
      .select('id, title, artist, genre_id, key, bpm')
      .order('genre_id')
      .limit(5000)

    const byGenre = new Map<
      number,
      { name: string; items: Array<{ title: string; artist: string | null; key?: string; bpm?: string }> }
    >()
    for (const g of genres || []) {
      byGenre.set(g.id, { name: g.name, items: [] })
    }
    for (const v of videos || []) {
      const g = byGenre.get(v.genre_id)
      if (g && g.items.length < 25) {
        g.items.push({
          title: v.title,
          artist: v.artist ?? null,
          key: (v as { key?: string }).key,
          bpm: (v as { bpm?: string }).bpm,
        })
      }
    }

    for (const [genreId, { name, items }] of byGenre) {
      if (items.length === 0) continue
      const examples = items
        .slice(0, 20)
        .map(
          (i) =>
            `${i.artist || 'Unknown'} - ${i.title}${i.key || i.bpm ? ` (${[i.key, i.bpm].filter(Boolean).join(' ')})` : ''}`
        )
        .join('. ')
      docs.push({
        metadata: { source: 'catalogo', genre_id: genreId, genre: name },
        content: `Catálogo Bear Beat - Género ${name}: ${items.length} videos. Ejemplos: ${examples}.`,
      })
    }
  } catch (e) {
    console.warn('No se pudo cargar catálogo videos:', e)
  }

  // ----- Generar embeddings e insertar en documents -----
  console.log(`Generando embeddings para ${docs.length} documentos (catálogo + reglas)...`)
  const table = 'documents'

  await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i]
    const res = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: doc.content.slice(0, 8000),
    })
    const embedding = res.data[0]?.embedding
    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      console.warn(`Embedding inválido para doc ${i}, skip`)
      continue
    }
    const { error } = await supabase.from(table).insert({
      content: doc.content,
      metadata: doc.metadata,
      embedding,
    })
    if (error) {
      console.error('Error insertando doc:', error)
      continue
    }
    console.log(`  [${i + 1}/${docs.length}] ${String(doc.metadata?.source || 'doc')} ok`)
  }

  console.log('✅ Cerebro alimentado (documents listo para RAG).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
