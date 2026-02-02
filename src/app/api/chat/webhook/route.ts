/**
 * Webhook RAG para ManyChat (External Request).
 *
 * Recibe { message, userId } desde ManyChat, busca contexto en la base vectorial,
 * genera respuesta con OpenAI y devuelve el formato JSON que ManyChat espera.
 *
 * Configuración en ManyChat: Actions → External Request → POST a esta URL.
 * Body ejemplo: { "message": "{{last_user_message}}", "userId": "{{user.id}}" }
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, getOpenAIChatModel } from '@/lib/openai-config'
const MATCH_THRESHOLD = 0.5
const MATCH_COUNT = 5
const RAG_SYSTEM_PREFIX = `Eres el Asistente AI de Bear Beat (Experto en DJ y Video Remixes).
Responde en el mismo idioma que el usuario.
Usa SOLO el siguiente contexto para responder. Si no sabes algo, di amablemente que contacten a un humano por el chat.
No inventes precios ni políticas que no estén en el contexto.`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const userId = body.userId ?? body.subscriber_id ?? body.uid ?? ''

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'message is required', content: { messages: [{ type: 'text', text: 'No recibí tu mensaje. Escribe de nuevo o contacta a soporte.' }] } },
        { status: 400 }
      )
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      console.error('OPENAI_API_KEY not set')
      return NextResponse.json(
        { success: false, error: 'Server misconfiguration', content: { messages: [{ type: 'text', text: 'Configuración temporal. Por favor intenta en unos minutos o contacta a soporte.' }] } },
        { status: 500 }
      )
    }

    const supabase = createAdminClient()
    const openai = new OpenAI({ apiKey: openaiKey })

    // 1. Embedding de la pregunta
    const embedRes = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: message.slice(0, 8000),
    })
    const queryEmbedding = embedRes.data[0]?.embedding
    if (!queryEmbedding || queryEmbedding.length !== EMBEDDING_DIMENSIONS) {
      return NextResponse.json(
        { success: false, error: 'Embedding failed', content: { messages: [{ type: 'text', text: 'No pude procesar tu pregunta. Intenta de nuevo o escribe "agente" para hablar con alguien.' }] } },
        { status: 500 }
      )
    }

    // 2. Búsqueda por similitud en Supabase (RPC no tipada en cliente genérico)
    const { data: matches, error: rpcError } = await (supabase as any).rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: MATCH_THRESHOLD,
      match_count: MATCH_COUNT,
    })

    if (rpcError) {
      console.error('match_documents RPC error:', rpcError)
      return NextResponse.json(
        { success: false, error: 'Search failed', content: { messages: [{ type: 'text', text: 'Error al buscar información. Escribe "agente" para hablar con soporte.' }] } },
        { status: 500 }
      )
    }

    const fragments = (matches ?? []).map((r: { content?: string }) => r?.content).filter(Boolean)
    const contextBlock = fragments.length > 0
      ? `Contexto:\n${fragments.join('\n\n')}`
      : 'No hay contexto específico; responde con cortesía que para detalles concretos (precios, reembolsos, descargas) pueden revisar la web o contactar por chat.'

    const systemPrompt = `${RAG_SYSTEM_PREFIX}\n\n${contextBlock}\n\nFecha actual: Febrero 2026.`

    // 3. Respuesta con OpenAI (GPT-5.2)
    const completion = await openai.chat.completions.create({
      model: getOpenAIChatModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.3,
      max_tokens: 600,
    })

    const reply = completion.choices[0]?.message?.content?.trim() ?? 'No pude generar una respuesta. Por favor contacta a un agente escribiendo "agente".'

    // 4. Formato ManyChat v2
    return NextResponse.json({
      success: true,
      version: 'v2',
      content: {
        messages: [
          {
            type: 'text',
            text: reply,
          },
        ],
      },
      metadata: { userId, model: getOpenAIChatModel(), fragmentsCount: fragments.length },
    })
  } catch (err: any) {
    console.error('Chat webhook RAG error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? 'Internal server error',
        content: {
          messages: [
            {
              type: 'text',
              text: '😅 Tuve un problema técnico. Por favor escribe "agente" para hablar con una persona.',
            },
          ],
        },
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    webhook: 'Bear Beat RAG Chat (ManyChat External Request)',
    version: '1.0',
    usage: 'POST { "message": "pregunta del usuario", "userId": "opcional" }',
  })
}
