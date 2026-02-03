import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getOpenAIChatModel } from '@/lib/openai-config';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build' });

/** Modelo de chat: configurable por OPENAI_CHAT_MODEL; si no existe en API, usar gpt-4o */
const CHAT_MODEL_FALLBACK = 'gpt-4o';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export const runtime = 'edge';

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
`.trim();
}

const DUMMY_KEY = 'dummy-key-for-build';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === DUMMY_KEY) {
      return NextResponse.json(
        { role: 'assistant', content: 'Sistema de IA reiniciando, intenta en breve.' },
        { status: 503 }
      );
    }

    const { message, history, userId, sessionId } = await req.json();
    const currentSessionId = sessionId || 'guest-' + Date.now();

    // —— Inyección de perfil de usuario (Conciencia de Usuario / Inteligencia Híbrida) ——
    let userContext = 'Usuario Anónimo (Tratar como Lead Frío).';
    if (userId) {
      const { data: profile } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', userId)
        .single();

      const { data: purchases } = await supabase
        .from('purchases')
        .select('pack_id, purchased_at')
        .eq('user_id', userId);

      const purchaseCount = purchases?.length ?? 0;
      const lastPurchase = purchases?.length
        ? purchases.reduce((prev, curr) =>
            new Date((curr?.purchased_at) || 0) > new Date((prev?.purchased_at) || 0) ? curr : prev
          )
        : null;
      const lastPurchaseDate = lastPurchase?.purchased_at
        ? new Date(lastPurchase.purchased_at).toLocaleDateString('es-MX', { dateStyle: 'short' })
        : 'N/A';

      userContext = `PERFIL DEL DJ:
- Nombre: ${profile?.name || 'Colega'}
- Estatus: ${purchaseCount ? 'CLIENTE VIP 💎' : 'VISITANTE 👀'}
- Compras Previas: ${purchaseCount} Packs.
- Última compra: ${lastPurchaseDate}
- Tono a usar: ${purchaseCount ? 'Familiar, de respeto, agradecido.' : 'Persuasivo, energético, enfocado en cierre.'}`;
    }

    const SYSTEM_PROMPT = buildSystemPrompt(userContext);

    let historyFromDb: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (userId) {
      const { data: pastMessages } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('user_id', userId)
        .in('role', ['user', 'assistant'])
        .order('created_at', { ascending: false })
        .limit(20);
      if (pastMessages?.length) {
        historyFromDb = [...pastMessages]
          .reverse()
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content || '' }));
      }
    }

    if (userId) {
      await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        user_id: userId,
        role: 'user',
        content: message,
      });
    }

    const conversationHistory = historyFromDb.length ? historyFromDb : (history || []).slice(-10).map((h: { role?: string; content?: string }) => ({
      role: (h.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: h.content || '',
    }));

    let reply: string;
    let contextText = '';
    try {
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: message,
      });

      const { data: documents } = await supabase.rpc('match_documents', {
        query_embedding: embedding.data[0].embedding,
        match_threshold: 0.3,
        match_count: 5,
      });

      contextText = documents?.map((d: any) => d.content).join('\n\n') || '';
      console.log('Contexto recuperado:', contextText.substring(0, 200));

      const chatModel = getOpenAIChatModel();
      const createParams: Parameters<typeof openai.chat.completions.create>[0] = {
        model: chatModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: "CONTEXTO RAG (USAR OBLIGATORIAMENTE):\n" + contextText },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_completion_tokens: 300,
        stream: false,
      };
      if (chatModel.startsWith('gpt-5')) {
        (createParams as unknown as Record<string, unknown>).reasoning_effort = 'none';
      }
      const response = await openai.chat.completions.create(createParams);
      const completion = response as { choices: Array<{ message?: { content?: string | null } }> };
      reply = completion.choices[0]?.message?.content ?? '';

      if (userId && reply) {
        await supabase.from('chat_messages').insert({
          session_id: currentSessionId,
          user_id: userId,
          role: 'assistant',
          content: reply,
          is_bot: true,
        });
      }
    } catch (apiError: unknown) {
      const errMsg = apiError instanceof Error ? apiError.message : String(apiError);
      console.error('AI API Error:', errMsg, apiError);
      if (errMsg.includes('model') || errMsg.includes('Invalid') || errMsg.includes('404')) {
        try {
          const fallbackParams: Parameters<typeof openai.chat.completions.create>[0] = {
            model: CHAT_MODEL_FALLBACK,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'system', content: "CONTEXTO RAG (USAR OBLIGATORIAMENTE):\n" + contextText },
              ...conversationHistory,
              { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_completion_tokens: 300,
            stream: false,
          };
          const fallback = await openai.chat.completions.create(fallbackParams);
          const fallbackCompletion = fallback as { choices: Array<{ message?: { content?: string | null } }> };
          const fallbackReply = fallbackCompletion.choices[0]?.message?.content ?? '';
          if (fallbackReply) {
            if (userId) {
              await supabase.from('chat_messages').insert({
                session_id: currentSessionId,
                user_id: userId,
                role: 'assistant',
                content: fallbackReply,
                is_bot: true,
              });
            }
            return NextResponse.json({ role: 'assistant', content: fallbackReply });
          }
        } catch (fallbackErr) {
          console.error('Fallback model failed:', fallbackErr);
        }
      }
      return NextResponse.json(
        { role: 'assistant', content: 'Estoy actualizando mis sistemas de venta, dame un momento.' },
        { status: 200 }
      );
    }

    return NextResponse.json({ role: 'assistant', content: reply });

  } catch (error) {
    console.error('Chat Error:', error);
    return NextResponse.json(
      { role: 'assistant', content: 'Estoy actualizando mis sistemas de venta, dame un momento.' },
      { status: 200 }
    );
  }
}
