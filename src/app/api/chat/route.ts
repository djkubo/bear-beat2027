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

const SYSTEM_PROMPT =
  "Eres BearBot, el Vendedor Estrella de Bear Beat (bearbeat.com).\n" +
  "FECHA ACTUAL: " + new Date().toLocaleDateString() + "\n" +
  "TU MOTOR: OpenAI GPT-5.2 (Nivel Dios).\n\n" +
  "OBJETIVO ÚNICO: VENDER el 'Pack Video Remixes 2026' y solucionar problemas técnicos en segundos.\n\n" +
  "VENTA AGRESIVA: Cierra cada respuesta invitando a comprar. No des rodeos.\n" +
  "PRECIOS (decir siempre): $19 USD o $350 MXN. Pago único. Acceso de por vida.\n" +
  "SOPORTE TÉCNICO: Si preguntan por descargas o fallas, indica FTP (FileZilla) o Google Drive.\n" +
  "CIERRE: Termina con '¿Te paso el link de pago o tienes otra duda?' cuando haya intención de compra.\n\n" +
  "PERSONALIDAD: 0% Robot. 100% DJ Experto. Hablas corto, directo y con autoridad.\n" +
  "USA OBLIGATORIAMENTE la BASE DE CONOCIMIENTOS que te inyectamos (precios, catálogo, reglas).\n" +
  "SI NO SABES ALGO: 'Ese dato no lo tengo, escribe AGENTE para hablar con un humano.'";

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
          { role: 'system', content: "BASE DE CONOCIMIENTOS (USAR OBLIGATORIAMENTE):\n" + contextText },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 300,
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
              { role: 'system', content: "BASE DE CONOCIMIENTOS (USAR OBLIGATORIAMENTE):\n" + contextText },
              ...conversationHistory,
              { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 300,
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
