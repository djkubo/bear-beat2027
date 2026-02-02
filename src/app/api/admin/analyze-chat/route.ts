/**
 * POST: Analizar conversaciones recientes con OpenAI y devolver reporte estratégico.
 * Solo admin. Lee últimos 50–100 mensajes de usuarios (inbound), prioriza sin intención / needs_human.
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'

const SYSTEM_PROMPT = `Eres un Analista de Negocios Digitales experto.
Analiza los siguientes mensajes de usuarios en un e-commerce de música para DJs (packs de videos, descargas, pagos).
Identifica:
1. 🔥 **Tendencia Principal:** ¿Qué es lo que más preguntan o piden hoy?
2. ⚠️ **Puntos de Dolor:** ¿Dónde se están trabando? (Ej: no pueden descargar, no pasa el pago, olvidaron contraseña).
3. 💰 **Oportunidades de Venta:** Usuarios que dijeron que quieren comprar, preguntan precios o dejaron correo y no se atendieron.
4. 💡 **Recomendación:** Una acción concreta para el Admin (ej: revisar descargas, contactar a X, mejorar mensaje del bot).
Responde ÚNICAMENTE con un JSON válido (sin markdown, sin \`\`\`) con estas claves exactas:
{
  "tendencia_principal": "string",
  "puntos_dolor": "string",
  "oportunidades_venta": "string",
  "recomendacion": "string"
}
Sé conciso y en español. Si no hay datos suficientes, indica "Datos insuficientes" en la clave correspondiente.`

export type AnalyzeChatResponse = {
  tendencia_principal: string
  puntos_dolor: string
  oportunidades_venta: string
  recomendacion: string
}

async function isAdmin(req: NextRequest): Promise<boolean> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  if (isAdminEmailWhitelist(user.email ?? undefined)) return true
  const { data: profile } = await (supabase.from('users') as any).select('role').eq('id', user.id).maybeSingle()
  const row = profile as { role?: string } | null
  return row?.role === 'admin'
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY no configurada' }, { status: 500 })
    }

    const admin = createAdminClient()

    // Últimos 100 mensajes de usuarios (inbound); priorizar sin intención y conversaciones que necesitan humano
    const { data: messages, error } = await (admin.from('messages') as any)
      .select('id, content, direction, detected_intent, conversation_id, created_at')
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error || !messages?.length) {
      const fallback = {
        tendencia_principal: 'No hay mensajes de usuarios recientes.',
        puntos_dolor: 'N/A',
        oportunidades_venta: 'N/A',
        recomendacion: 'Revisa cuando haya conversaciones en el chatbot.',
      }
      return NextResponse.json(fallback)
    }

    // Construir bloque de texto para la IA (más recientes primero; incluir contexto de intención)
    const lines = messages.map((m: { content: string; detected_intent: string | null; created_at: string }) => {
      const intent = m.detected_intent ? ` [intención: ${m.detected_intent}]` : ' [sin intención detectada]'
      return `[${new Date(m.created_at).toLocaleString('es-MX')}]${intent} ${(m.content || '').trim()}`
    })
    const textBlock = lines.join('\n')

    const openai = new OpenAI({ apiKey: openaiKey })
    const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o'

    const completion = await openai.chat.completions.create({
      model: model as string,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Mensajes recientes de usuarios (del más reciente al más antiguo):\n\n${textBlock.slice(0, 28000)}` },
      ],
      temperature: 0.3,
    })

    const raw = completion.choices[0]?.message?.content?.trim() || ''
    let parsed: AnalyzeChatResponse
    try {
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
      parsed = JSON.parse(cleaned) as AnalyzeChatResponse
    } catch {
      parsed = {
        tendencia_principal: raw || 'No se pudo analizar.',
        puntos_dolor: '—',
        oportunidades_venta: '—',
        recomendacion: 'Revisar respuesta del modelo manualmente.',
      }
    }

    return NextResponse.json(parsed)
  } catch (e: unknown) {
    console.error('analyze-chat error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al analizar' },
      { status: 500 }
    )
  }
}
