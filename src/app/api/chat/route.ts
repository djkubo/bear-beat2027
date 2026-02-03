import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// --- CORRECCIÓN: Evita que explote el build si no hay keys ---
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build' 
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

const supabase = createClient(supabaseUrl, supabaseKey);
// -----------------------------------------------------------

export const runtime = 'edge';

const SYSTEM_PROMPT = \`Eres BearBot, el Vendedor Estrella de Bear Beat (bearbeat.com).
FECHA ACTUAL: \${new Date().toLocaleDateString()}
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

SI NO SABES ALGO: "Ese dato no lo tengo, escribe 'Agente' para hablar con un humano."\`;

export async function POST(req: Request) {
  try {
    // Validación de runtime: Si es dummy key, fallar elegante (para que no gaste intentos en vano)
    if (!process.env.OPENAI_API_KEY) {
      console.error('Falta OPENAI_API_KEY en runtime');
      return NextResponse.json({ role: 'assistant', content: 'Mantenimiento del cerebro IA. Intenta en unos minutos. 🔧' });
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

    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: message,
    });

    const { data: documents } = await supabase.rpc('match_documents', {
      query_embedding: embedding.data[0].embedding,
      match_threshold: 0.3,
      match_count: 5,
    });

    const context = documents?.map((d: any) => d.content).join('\\n\\n') || '';

    const response = await openai.chat.completions.create({
      model: 'gpt-5.2', // Tu modelo solicitado
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: \`CONTEXTO REAL DEL NEGOCIO:\\n\${context}\` },
        ...(history || []).slice(-5),
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const reply = response.choices[0].message.content;

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
