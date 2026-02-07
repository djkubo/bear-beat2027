import { OpenAI } from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getOpenAIChatModel } from '@/lib/openai-config'

const DUMMY_KEY = 'dummy-key-for-build'
const CHAT_MODEL_FALLBACK = 'gpt-4o'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || DUMMY_KEY })

type RateBucket = { resetAt: number; count: number }
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 25

function getRateMap(): Map<string, RateBucket> {
  const g = globalThis as unknown as { __bb_chat_rate?: Map<string, RateBucket> }
  if (!g.__bb_chat_rate) g.__bb_chat_rate = new Map<string, RateBucket>()
  return g.__bb_chat_rate
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for') || ''
  const first = xff.split(',')[0]?.trim()
  return first || req.headers.get('x-real-ip') || 'unknown'
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const map = getRateMap()
  const bucket = map.get(key)
  if (!bucket || now > bucket.resetAt) {
    map.set(key, { resetAt: now + RATE_WINDOW_MS, count: 1 })
    return false
  }
  bucket.count += 1
  return bucket.count > RATE_MAX
}

/** Construye el system prompt con conciencia de usuario (perfil inyectado). Cerebro bipolar: Ventas + Soporte. */
function buildSystemPrompt(userContext: string): string {
  return `
ERES: BearBot, el Asistente de Élite de Bear Beat.
FECHA ACTUAL: ${new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}

TU USUARIO ACTUAL:
${userContext}

OBJETIVO DOBLE:
1. 💰 VENTAS (Si el usuario duda o pregunta info): Usa Neuroventas. Aplica escasez ("El precio sube pronto"), autoridad ("Usado por 10k DJs") y prueba social. Tu meta es que vayan al Checkout.
2. 🛠 SOPORTE (Si el usuario reporta fallo): Cambia a modo "Ingeniero Empático". Sé breve, técnico y soluciona. No vendas si el usuario tiene problemas.

PERSONALIDAD DJ:
- Hablas el idioma: "Tracks", "BPM", "Key", "Serato", "Rekordbox", "Pista", "Extended".
- Eres seguro pero no arrogante.
- Si es Cliente VIP: Trátalo como socio. "Claro que sí, hermano", "Para eso estamos".
- Si es Visitante: Sedúcelo. "Imagínate tu set con esto".

REGLAS DE ORO (INFORMACIÓN REAL):
- PRECIO: $350 MXN (o $19 USD). Único pago. Acceso Vitalicio.
- FORMATO: Video MP4 HD (1080p).
- ORGANIZACIÓN: Carpetas por Género > Artista - Título (Key - BPM).
- DESCARGA: Web (uno por uno) o FTP (Masivo/Veloz).
- SOPORTE: Si algo falla grave, diles que escriban a soporte@bearbeat.mx o usen el chat de la web (esquina), Messenger o Instagram.

MODULACIÓN DE RESPUESTA:
- Si pregunta "¿Cómo descargo?": Explica el FTP (es la mejor opción).
- Si pregunta "¿Sirve para Serato?": "100% compatible y con versiones Clean."
- Si dice "Es caro": "Hermano, es menos de lo que ganas en una hora de evento. Es una inversión, no un gasto."

IMPORTANTE: SIEMPRE consulta el bloque de "CONTEXTO RAG" que se te enviará abajo para respuestas específicas.
SI NO SABES ALGO: "Ese dato no lo tengo, escribe AGENTE para hablar con un humano."
`.trim()
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || apiKey === DUMMY_KEY) {
      return NextResponse.json(
        { role: 'assistant', content: 'Sistema de IA reiniciando, intenta en breve.' },
        { status: 503 }
      )
    }

    // Rate limit simple (anti-abuso/costos). No es perfecto en serverless, pero reduce spam.
    if (process.env.NODE_ENV === 'production') {
      const ip = getClientIp(req)
      if (isRateLimited(ip)) {
        return NextResponse.json(
          { role: 'assistant', content: 'Estás enviando demasiados mensajes. Espera un minuto y vuelve a intentar.' },
          { status: 429 }
        )
      }
    }

    const body = await req.json().catch(() => ({} as any))
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const history = Array.isArray(body.history) ? body.history : []
    const sessionId =
      typeof body.sessionId === 'string' && body.sessionId.trim()
        ? body.sessionId.trim()
        : `guest-${Date.now()}`

    if (!message) {
      return NextResponse.json(
        { role: 'assistant', content: 'No recibí tu mensaje. Intenta de nuevo.' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null

    // —— Inyección de perfil de usuario (solo si el request está autenticado) ——
    let userContext = 'Usuario Anónimo (Tratar como Lead Frío).'
    if (userId) {
      const { data: profile } = await (supabase.from('users') as any)
        .select('name, email')
        .eq('id', userId)
        .maybeSingle()

      const { data: purchases } = await (supabase.from('purchases') as any)
        .select('pack_id, purchased_at')
        .eq('user_id', userId)

      const purchaseCount = (purchases as any[])?.length ?? 0
      const lastPurchase = (purchases as any[])?.length
        ? (purchases as any[]).reduce((prev, curr) =>
            new Date(curr?.purchased_at || 0) > new Date(prev?.purchased_at || 0) ? curr : prev
          )
        : null
      const lastPurchaseDate = lastPurchase?.purchased_at
        ? new Date(lastPurchase.purchased_at).toLocaleDateString('es-MX', { dateStyle: 'short' })
        : 'N/A'

      userContext = `PERFIL DEL DJ:
- Nombre: ${profile?.name || 'Colega'}
- Estatus: ${purchaseCount ? 'CLIENTE VIP 💎' : 'VISITANTE 👀'}
- Compras Previas: ${purchaseCount} Packs.
- Última compra: ${lastPurchaseDate}
- Tono a usar: ${purchaseCount ? 'Familiar, de respeto, agradecido.' : 'Persuasivo, energético, enfocado en cierre.'}`
    }

    const SYSTEM_PROMPT = buildSystemPrompt(userContext)

    // Persistencia ligera (no crítica). chat_messages tiene policy de INSERT abierta.
    try {
      await (supabase.from('chat_messages') as any).insert({
        session_id: sessionId,
        user_id: userId,
        role: 'user',
        content: message.slice(0, 8000),
      })
    } catch {
      // ignore
    }

    const conversationHistory = history
      .slice(-10)
      .map((h: { role?: string; content?: string }) => ({
        role: (h?.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: typeof h?.content === 'string' ? h.content : '',
      }))

    let reply = ''
    let contextText = ''

    try {
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: message.slice(0, 8000),
      })

      const { data: documents } = await (supabase as any).rpc('match_documents', {
        query_embedding: embedding.data[0].embedding,
        match_threshold: 0.3,
        match_count: 5,
      })

      contextText = (documents as any[])?.map((d) => d?.content).filter(Boolean).join('\n\n') || ''

      const chatModel = getOpenAIChatModel()
      const createParams: Parameters<typeof openai.chat.completions.create>[0] = {
        model: chatModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: 'CONTEXTO RAG (USAR OBLIGATORIAMENTE):\n' + contextText },
          ...conversationHistory,
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_completion_tokens: 300,
        stream: false,
      }
      if (chatModel.startsWith('gpt-5')) {
        ;(createParams as unknown as Record<string, unknown>).reasoning_effort = 'none'
      }

      const response = await openai.chat.completions.create(createParams as any)
      reply = (response as any)?.choices?.[0]?.message?.content ?? ''

      try {
        await (supabase.from('chat_messages') as any).insert({
          session_id: sessionId,
          user_id: userId,
          role: 'assistant',
          content: reply.slice(0, 8000),
          is_bot: true,
        })
      } catch {
        // ignore
      }
    } catch (apiError: unknown) {
      const errMsg = apiError instanceof Error ? apiError.message : String(apiError)
      console.error('AI API Error:', errMsg, apiError)

      // Fallback de modelo si el configurado falla
      if (errMsg.includes('model') || errMsg.includes('Invalid') || errMsg.includes('404')) {
        try {
          const fallbackParams: Parameters<typeof openai.chat.completions.create>[0] = {
            model: CHAT_MODEL_FALLBACK,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'system', content: 'CONTEXTO RAG (USAR OBLIGATORIAMENTE):\n' + contextText },
              ...conversationHistory,
              { role: 'user', content: message },
            ],
            temperature: 0.7,
            max_completion_tokens: 300,
            stream: false,
          }
          const fallback = await openai.chat.completions.create(fallbackParams as any)
          reply = (fallback as any)?.choices?.[0]?.message?.content ?? ''
        } catch (fallbackErr) {
          console.error('Fallback model failed:', fallbackErr)
        }
      }
    }

    if (!reply) reply = 'Estoy actualizando mis sistemas de venta, dame un momento.'
    return NextResponse.json({ role: 'assistant', content: reply })
  } catch (error) {
    console.error('Chat Error:', error)
    return NextResponse.json(
      { role: 'assistant', content: 'Estoy actualizando mis sistemas de venta, dame un momento.' },
      { status: 200 }
    )
  }
}
