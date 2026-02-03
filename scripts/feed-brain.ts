import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// --- CONFIGURACIÓN DE IA ---
const EMBEDDING_MODEL = 'text-embedding-3-large'

// --- DATOS DUROS DEL NEGOCIO ---
const HARDCODED_RULES = [
  {
    metadata: { source: 'precios' },
    content: `Precios Bear Beat. Pack Video Remixes 2026: $350 MXN o $19 USD. Pago único, acceso permanente. Incluye miles de videos HD/4K por género. Métodos de pago: Tarjeta, OXXO, SPEI, PayPal. Garantía 30 días.`,
  },
  {
    metadata: { source: 'ftp' },
    content: `Descarga por FTP. Servidor Hetzner Storage Box. Credenciales en el dashboard. Usar FileZilla o Air Explorer. Carpeta completa disponible si el ZIP falla.`,
  },
  {
    metadata: { source: 'descargas' },
    content: `Descargas Bear Beat. Opciones: (1) Web video a video. (2) Google Drive (link en dashboard). (3) FTP (rápido y masivo). Si tienes problemas, usa el chat de soporte.`,
  },
  {
    metadata: { source: 'pagos' },
    content: `Pagos. Aceptamos Visa, Mastercard, OXXO, SPEI, PayPal. Acceso inmediato. Si falla, contactar soporte con comprobante.`,
  },
  {
    metadata: { source: 'reglas' },
    content: `Reglas. E-commerce para DJs. No reembolsos parciales. Videos incluyen Key y BPM. Soporte técnico incluido.`,
  }
]

async function main() {
  // 1. BUSQUEDA INTELIGENTE DE VARIABLES
  const openaiKey = process.env.OPENAI_API_KEY
  
  // Busca SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  
  // La clave Service Role es CRÍTICA para escribir en la base de datos sin restricciones
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('🔍 Verificando credenciales...')

  if (!openaiKey) {
    console.error('❌ ERROR: Falta OPENAI_API_KEY en .env.local')
    process.exit(1)
  }
  if (!supabaseUrl) {
    console.error('❌ ERROR: Falta NEXT_PUBLIC_SUPABASE_URL en .env.local')
    process.exit(1)
  }
  if (!supabaseServiceKey) {
    console.error('❌ ERROR: Falta SUPABASE_SERVICE_ROLE_KEY en .env.local')
    console.error('💡 TIP: Ve a Supabase Dashboard > Project Settings > API > service_role (secret) y agrégalo a tu archivo .env.local')
    process.exit(1)
  }

  console.log('✅ Credenciales encontradas. Conectando...')

  const openai = new OpenAI({ apiKey: openaiKey })
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const docs = [...HARDCODED_RULES]

  // 2. LEER CATÁLOGO DE SUPABASE
  try {
    console.log('📚 Leyendo catálogo de videos...')
    const { data: videos } = await supabase
      .from('videos')
      .select('title, artist, genre_id, key, bpm')
      .limit(2000)

    if (videos && videos.length > 0) {
       docs.push({
         metadata: { source: 'catalogo_sample' },
         content: `Ejemplos del catálogo actual: ${videos.slice(0, 50).map(v => `${v.artist} - ${v.title}`).join(', ')}... Tenemos más de ${videos.length} videos disponibles.`
       })
    }
  } catch (e) {
    console.warn('⚠️ No se pudo leer videos (no pasa nada, seguimos con las reglas básicas)', e)
  }

  // 3. GENERAR EMBEDDINGS (PENSAMIENTOS DE LA IA)
  console.log(`🧠 Generando conocimiento para ${docs.length} bloques de información...`)
  
  // Limpiamos la memoria anterior para no duplicar
  await supabase.from('documents').delete().neq('id', 0)

  for (const doc of docs) {
    const res = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: doc.content,
    })
    
    const { error } = await supabase.from('documents').insert({
      content: doc.content,
      metadata: doc.metadata,
      embedding: res.data[0].embedding,
    })
    
    if (error) console.error('Error insertando:', error.message)
    else process.stdout.write('.')
  }

  console.log('\n✅ ¡CEREBRO ALIMENTADO! El chat ya sabe vender.')
}

main().catch(console.error)
