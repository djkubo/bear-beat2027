/**
 * API de Chat Web (BearBot) – RAG + GPT + persistencia en chat_messages.
 *
 * POST { message, history?, sessionId? }
 * 1. Embedding del mensaje → match_documents (Supabase).
 * 2. System prompt BearBot + fragmentos RAG.
 * 3. OpenAI (GPT-5.2 vía OPENAI_CHAT_MODEL).
 * 4. Guarda user message y assistant response en chat_messages.
 *
 * Output: { role: 'assistant', content: '...' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, getOpenAIChatModel } from '@/lib/openai-config'
const MATCH_THRESHOLD = 0.5
const MATCH_COUNT = 5
const SYSTEM_PROMPT = `Eres BearBot, el asistente de ventas de Bear Beat. Experto en DJ, packs de video y soporte técnico.
Tu tono es "Nivel Dios": seguro, breve y solucionador.
Usa el contexto para responder sobre precios ($19 USD / $350 MXN), descargas (FTP/Drive/web) y catálogo.
Si no sabes algo, di amablemente que contacten por chat o soporte. No inventes precios ni políticas.`

function generateSessionId(): string {
  return `web_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { message, history = [], sessionId: bodySessionId } = body as {
      message?: string
      history?: Array<{ role: string; content: string }>
      sessionId?: string
    }

    const text = typeof message === 'string' ? message.trim() : ''
    if (!text) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    let sessionId = bodySessionId
    if (!sessionId) {
      const cookieStore = await cookies()
      sessionId = cookieStore.get('chat_session_id')?.value ?? generateSessionId()
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration', role: 'assistant', content: 'Configuración temporal. Intenta más tarde o usa el chat de soporte.' },
        { status: 500 }
      )
    }

    const supabase = createAdminClient()
    const serverSupabase = await createServerClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    const userId = user?.id ?? null

    const openai = new OpenAI({ apiKey: openaiKey })

    // ----- 1. Embedding + RAG -----
    const embedRes = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000),
    })
    const queryEmbedding = embedRes.data[0]?.embedding
    if (!queryEmbedding || queryEmbedding.length !== EMBEDDING_DIMENSIONS) {
      return NextResponse.json(
        { error: 'Embedding failed', role: 'assistant', content: 'No pude procesar tu mensaje. Intenta de nuevo.' },
        { status: 500 }
      )
    }

    const { data: matches, error: rpcError } = await (supabase as any).rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: MATCH_THRESHOLD,
      match_count: MATCH_COUNT,
    })

    const fragments = (matches ?? []).map((r: { content?: string }) => r?.content).filter(Boolean)
    const contextBlock =
      fragments.length > 0
        ? `Contexto relevante:\n${fragments.join('\n\n')}`
        : 'No hay contexto específico; responde con cortesía y recomienda contactar soporte para detalles.'

    // ----- 2. Mensajes para OpenAI -----
    const systemContent = `${SYSTEM_PROMPT}\n\n${contextBlock}`
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
      ...(Array.isArray(history)
        ? history
            .slice(-20)
            .filter((m) => m && typeof m.role === 'string' && typeof m.content === 'string')
            .map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }))
        : []),
      { role: 'user', content: text },
    ]

    // ----- 3. Generación GPT (GPT-5.2) -----
    const completion = await openai.chat.completions.create({
      model: getOpenAIChatModel(),
      messages,
      temperature: 0.3,
    })

    const assistantContent = completion.choices[0]?.message?.content?.trim() ?? 'No pude generar una respuesta. Intenta de nuevo.'

    // ----- 4. Persistencia en chat_messages (para Panel Admin) -----
    try {
      await (supabase.from('chat_messages') as any).insert([
        {
          session_id: sessionId,
          user_id: userId,
          role: 'user',
          content: text,
          is_bot: false,
        },
        {
          session_id: sessionId,
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
          is_bot: true,
        },
      ])
    } catch (err) {
      console.error('Error guardando chat_messages:', err)
    }

    const response = NextResponse.json({
      role: 'assistant',
      content: assistantContent,
      sessionId,
    })

    response.cookies.set('chat_session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30,
    })

    return response
  } catch (e: unknown) {
    console.error('Chat API error:', e)
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : 'Internal server error',
        role: 'assistant',
        content: 'Tuve un problema técnico. Por favor intenta de nuevo o escribe "agente" para hablar con soporte.',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    name: 'Bear Beat Chat',
    version: '2.0',
    features: ['rag', 'gpt', 'chat_messages_persistence'],
  })
}
