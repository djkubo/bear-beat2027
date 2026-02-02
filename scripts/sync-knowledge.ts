/**
 * "El Alimentador" – Sincroniza la base de conocimientos vectorial para el chatbot RAG.
 * Fuentes: páginas estáticas (términos, privacidad, reembolsos), catálogo videos, reglas de negocio.
 * Modelo: text-embedding-3-large (3072 dimensiones).
 *
 * Uso: npx tsx scripts/sync-knowledge.ts
 * Env: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const EMBEDDING_MODEL = 'text-embedding-3-large'
const EMBEDDING_DIMENSIONS = 3072

// ----- Páginas estáticas (texto crudo extraído de /terminos, /privacidad, /reembolsos) -----
const STATIC_PAGES: { content: string; metadata: Record<string, string } }[] = [
  {
    metadata: { source: 'terminos', page: '/terminos' },
    content: `Términos de Servicio - Bear Beat. Aceptación: Al usar Bear Beat aceptas estos términos. Descripción: Bear Beat proporciona packs de video remixes para DJs. Incluye descarga digital HD/4K, acceso web y/o FTP, soporte técnico, actualizaciones. Licencia: Personal e intransferible. Puedes usar videos en presentaciones como DJ, almacenar en dispositivos personales, uso indefinido. No permitido: redistribuir, revender, compartir archivos públicamente. Pagos: Stripe. Aceptamos tarjeta, OXXO (México), SPEI (México). Precios en MXN o USD. Reembolsos: Garantía 30 días. Consulta política de reembolsos. Privacidad: Ver política de privacidad. Contacto: soporte en la web o Messenger/Instagram.`,
  },
  {
    metadata: { source: 'privacidad', page: '/privacidad' },
    content: `Política de Privacidad - Bear Beat. Información que recopilamos: nombre, email, teléfono, información de pago (Stripe). Automáticamente: IP, navegador, páginas visitadas, fuente de tráfico, cookies. Uso: procesar compras, enviar confirmaciones, soporte, mejorar servicios, marketing si autorizas, prevenir fraudes. Compartimos con: Stripe (pagos), Supabase (datos), ManyChat (WhatsApp/Messenger), Meta (análisis). No vendemos datos. Cookies: sesión, preferencias, análisis. Seguridad: SSL/TLS, encriptación Supabase, PCI Stripe. Derechos: acceder, corregir, eliminar datos, oponerte. Retención: mientras cuenta activa; transacciones según ley (ej. 5 años). Menores: servicios para mayores de 18 años.`,
  },
  {
    metadata: { source: 'reembolsos', page: '/reembolsos' },
    content: `Garantía de Satisfacción 30 días - Bear Beat. Sin preguntas. 30 días desde la compra para solicitar reembolso. No necesitas explicación. Reembolso en 5-10 días hábiles. 100% de tu dinero. Cómo solicitar: chat en la esquina inferior derecha, opción Ayuda/Reembolsos. Tiempos: Tarjeta 5-10 días hábiles; OXXO/SPEI transferencia 3-5 días. FAQ: Sí puedes pedir reembolso aunque hayas descargado. Después del reembolso la cuenta se desactiva. Condición: solo dentro de los primeros 30 días. No hay reembolsos parciales; siempre 100% del monto. Bear Beat más de 3 años con DJs en México y LATAM. Tasa de reembolso menor al 1%.`,
  },
]

// ----- Reglas de negocio (hardcode) -----
const BUSINESS_RULES = {
  metadata: { source: 'reglas_negocio' },
  content: `Reglas de negocio Bear Beat. Precios: Pack Video Remixes 2026 cuesta $350 MXN o $19 USD (pago único, acceso permanente). Métodos de pago: Tarjeta (inmediato), OXXO (efectivo México), SPEI (transferencia México), PayPal. Soporte: solo por chat (web, Messenger, Instagram). No reembolsos parciales; garantía 30 días reembolso completo si no estás satisfecho. Descarga: web o FTP. Incluye miles de videos HD/4K por género (Bachata, Reggaeton, Cumbia, Salsa, etc.) con Key y BPM.`,
}

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

  const docs: { content: string; metadata: Record<string, unknown> }[] = [
    ...STATIC_PAGES,
    BUSINESS_RULES,
  ]

  // ----- Catálogo: videos por género (resúmenes) -----
  try {
    const { data: genres } = await supabase.from('genres').select('id, name').order('name')
    const { data: videos } = await supabase
      .from('videos')
      .select('id, title, artist, genre_id, key, bpm')
      .order('genre_id')
      .limit(5000)

    const byGenre = new Map<number, { name: string; items: Array<{ title: string; artist: string | null; key?: string; bpm?: string }> }>()
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
        .map((i) => `${i.artist || 'Unknown'} - ${i.title}${i.key || i.bpm ? ` (${[i.key, i.bpm].filter(Boolean).join(' ')})` : ''}`)
        .join('. ')
      docs.push({
        metadata: { source: 'catalogo', genre_id: genreId, genre: name },
        content: `Catálogo Bear Beat - Género ${name}: tenemos ${items.length} videos. Ejemplos: ${examples}.`,
      })
    }
  } catch (e) {
    console.warn('No se pudo cargar catálogo videos:', e)
  }

  // ----- Generar embeddings e insertar -----
  console.log(`Generando embeddings para ${docs.length} documentos...`)
  const table = 'documents'

  // Limpiar tabla (re-sync completo)
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
    console.log(`  [${i + 1}/${docs.length}] ${doc.metadata?.source || 'doc'} ok`)
  }

  console.log('✅ Base de conocimientos sincronizada.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
