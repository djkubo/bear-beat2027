import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Configuración Directa a GPT-5.2
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = 'edge';

const SYSTEM_PROMPT = `Eres BearBot, el Vendedor Estrella de Bear Beat (bearbeat.com).
FECHA ACTUAL: ${new Date().toLocaleDateString()}
TU MOTOR: OpenAI GPT-5.2 (Nivel Dios).

OBJETIVO ÚNICO: VENDER el "Pack Video Remixes 2026" ($19 USD / $350 MXN) y solucionar problemas técnicos en segundos.

PERSONALIDAD:
- 0% Robot aburrido. 100% DJ Experto.
- Hablas corto, directo y con autoridad.
- Si detectas intención de compra, CIERRAS YA.
- Si detectas un problema técnico, das la solución (FTP/Drive) sin rodeos.

REGLAS DE ORO:
1. SIEMPRE responde usando la info del contexto (RAG).
2. PRECIO: $19 USD o $350 MXN. Pago único. Acceso de por vida.
3. CIERRE: "¿Te paso el link de pago o tienes otra duda?".
4. SOPORTE: Si la web falla, mándalos al FTP (FileZilla) o Google Drive.

SI NO SABES ALGO: "Ese dato no lo tengo, escribe 'Agente' para hablar con un humano."`;

export async function POST(req: Request) {
  try {
    const { message, history, userId, sessionId } = await req.json();
    const currentSessionId = sessionId || 'guest-' + Date.now();

    // 1. Guardar mensaje usuario
    if (userId) {
      await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        user_id: userId,
        role: 'user',
        content: message,
      });
    }

    // 2. Buscar Contexto (RAG)
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: message,
    });

    const { data: documents } = await supabase.rpc('match_documents', {
      query_embedding: embedding.data[0].embedding,
      match_threshold: 0.3,
      match_count: 5,
    });

    const context = documents?.map((d: any) => d.content).join('\n\n') || '';

    // 3. Generar respuesta con GPT-5.2 (La Bestia)
    const response = await openai.chat.completions.create({
      model: 'gpt-5.2', // <--- AQUÍ ESTÁ LO QUE PEDISTE
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: `CONTEXTO REAL DEL NEGOCIO:\n${context}` },
        ...(history || []).slice(-5),
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const reply = response.choices[0].message.content;

    // 4. Guardar respuesta bot
    if (userId) {
      await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        user_id: userId,
        role: 'assistant',
        content: reply,
        is_bot: true,
      });
    }

    return NextResponse.json({ role: 'assistant', content: reply });

  } catch (error) {
    console.error('AI Error:', error);
    return NextResponse.json({ 
      role: 'assistant', 
      content: 'El cerebro está saturado de ventas. Intenta de nuevo en 5 seg. 🔥' 
    }, { status: 500 });
  }
}
