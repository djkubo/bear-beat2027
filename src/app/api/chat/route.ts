import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build' });

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

    if (userId) {
      await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        user_id: userId,
        role: 'user',
        content: message,
      });
    }

    let reply: string;
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

      const contextText = documents?.map((d: any) => d.content).join('\n\n') || '';
      console.log('Contexto recuperado:', contextText.substring(0, 200));

      const response = await openai.chat.completions.create({
        model: 'gpt-5.2',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: "BASE DE CONOCIMIENTOS (USAR OBLIGATORIAMENTE):\n" + contextText },
          ...(history || []).slice(-5),
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      reply = response.choices[0].message.content ?? '';

      if (userId && reply) {
        await supabase.from('chat_messages').insert({
          session_id: currentSessionId,
          user_id: userId,
          role: 'assistant',
          content: reply,
          is_bot: true,
        });
      }
    } catch (apiError) {
      console.error('AI API Error:', apiError);
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
