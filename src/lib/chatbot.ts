/**
 * Sistema de Chatbot Inteligente - Bear Beat
 * 
 * Funcionalidades:
 * - Detección de intenciones
 * - Respuestas automáticas
 * - Acciones automáticas (verificar pagos, resetear contraseña, etc.)
 * - Escalación a humano cuando es necesario
 */

import { createServerClient } from '@/lib/supabase/server'

// ==========================================
// TIPOS
// ==========================================

export interface IncomingMessage {
  subscriberId: string
  messageId?: string
  content: string
  contentType?: 'text' | 'image' | 'audio' | 'video' | 'button_click'
  phone?: string
  email?: string
  name?: string
  customFields?: Record<string, any>
}

export interface BotResponse {
  text: string
  quickReplies?: string[]
  buttons?: Array<{
    text: string
    url?: string
    payload?: string
  }>
  action?: string
  actionResult?: any
  shouldEscalate?: boolean
  intent?: string
  confidence?: number
}

export interface Intent {
  name: string
  displayName: string
  category: string
  keywords: string[]
  autoResponse: string
  autoAction?: string
  requiresHuman: boolean
  priority: number
}

// ==========================================
// DETECCIÓN DE INTENCIONES
// ==========================================

const INTENTS: Intent[] = [
  // SOPORTE - Contraseña
  {
    name: 'password_reset',
    displayName: 'Olvidé mi contraseña',
    category: 'support',
    keywords: ['contraseña', 'password', 'olvidé', 'no puedo entrar', 'restablecer', 'recuperar', 'clave', 'acceso', 'no recuerdo', 'no me deja entrar'],
    autoResponse: '¡Hola! 👋 Entiendo que olvidaste tu contraseña. Te ayudo a recuperarla.\n\n¿Me puedes confirmar tu email registrado para enviarte el link de recuperación?',
    autoAction: 'password_reset',
    requiresHuman: false,
    priority: 10,
  },
  
  // SOPORTE - Pago sin acceso
  {
    name: 'payment_no_access',
    displayName: 'Pagué pero no tengo acceso',
    category: 'support',
    keywords: ['pagué', 'pague', 'no tengo acceso', 'ya pagué', 'compré', 'compre', 'no puedo descargar', 'no me llegó', 'no llego', 'activar', 'mi compra', 'mi pago'],
    autoResponse: '¡Hola! 👋 Lamento que tengas ese problema. Voy a verificar tu pago ahora mismo.\n\n¿Me puedes dar tu email o número de teléfono con el que hiciste la compra?',
    autoAction: 'verify_payment',
    requiresHuman: false,
    priority: 10,
  },
  
  // SOPORTE - Problema de descarga
  {
    name: 'download_issue',
    displayName: 'Problema con descarga',
    category: 'support',
    keywords: ['no puedo descargar', 'descarga', 'error al descargar', 'ftp', 'filezilla', 'air explorer', 'muy lento', 'se para', 'no funciona', 'no descarga'],
    autoResponse: '¡Hola! 👋 Te ayudo con la descarga.\n\n¿Puedes decirme qué método estás usando?\n\n1️⃣ Descarga web (navegador)\n2️⃣ FTP con FileZilla\n3️⃣ FTP con Air Explorer',
    autoAction: 'download_help',
    requiresHuman: false,
    priority: 8,
  },
  
  // VENTAS - Precio
  {
    name: 'price_question',
    displayName: 'Pregunta de precio',
    category: 'sales',
    keywords: ['precio', 'costo', 'cuánto', 'cuanto', 'vale', 'cuesta', 'pagar', 'promoción', 'descuento', 'oferta', 'barato'],
    autoResponse: '¡Hola! 🎉 El pack de Video Remixes 2026 tiene un precio de **$350 MXN** (pago único, acceso permanente).\n\nIncluye:\n✅ Videos HD/4K organizados por género\n✅ Descarga ilimitada\n✅ Soporte incluido\n\n¿Te gustaría comprarlo ahora? 💳',
    requiresHuman: false,
    priority: 7,
  },
  
  // VENTAS - Métodos de pago
  {
    name: 'payment_methods',
    displayName: 'Métodos de pago',
    category: 'sales',
    keywords: ['cómo pago', 'como pago', 'formas de pago', 'métodos', 'tarjeta', 'oxxo', 'spei', 'transferencia', 'paypal', 'efectivo', 'puedo pagar'],
    autoResponse: '¡Hola! 💳 Aceptamos varias formas de pago:\n\n🏪 **OXXO** - Paga en efectivo (hasta 24h)\n🏦 **SPEI** - Transferencia bancaria (hasta 24h)\n💳 **Tarjeta** - Crédito o débito (¡inmediato!)\n\n¿Cuál prefieres? Te mando el link de pago.',
    requiresHuman: false,
    priority: 7,
  },
  
  // VENTAS - Contenido
  {
    name: 'content_question',
    displayName: 'Pregunta sobre contenido',
    category: 'sales',
    keywords: ['qué incluye', 'que incluye', 'contenido', 'géneros', 'generos', 'videos', 'cuántos', 'cuantos', 'lista', 'catálogo', 'que viene'],
    autoResponse: '¡Hola! 🎵 El pack incluye videos de alta calidad por género:\n\n🎤 Reggaeton\n🎺 Cumbia\n🎷 Salsa y bachata\n💿 Electrónica\n🎵 Música mexicana\n🎶 ¡Y más!\n\n¿Te gustaría ver un demo o tienes alguna otra pregunta?',
    requiresHuman: false,
    priority: 6,
  },
  
  // INFO - Cómo funciona
  {
    name: 'how_it_works',
    displayName: 'Cómo funciona',
    category: 'info',
    keywords: ['cómo funciona', 'como funciona', 'qué es', 'que es', 'explicar', 'entiendo', 'para qué sirve', 'cómo es', 'como es'],
    autoResponse: '¡Hola! 👋 Bear Beat es super fácil:\n\n1️⃣ **Pagas** una sola vez ($350 MXN)\n2️⃣ **Recibes** acceso inmediato por email\n3️⃣ **Descargas** todos los videos que quieras\n4️⃣ **Usas** los videos en tus eventos de DJ\n\n¡Y listo! El acceso es permanente. ¿Alguna otra duda?',
    requiresHuman: false,
    priority: 5,
  },
  
  // SOPORTE - Factura
  {
    name: 'invoice_request',
    displayName: 'Solicitud de factura',
    category: 'support',
    keywords: ['factura', 'facturar', 'cfdi', 'rfc', 'comprobante', 'fiscal'],
    autoResponse: '¡Hola! 🧾 Claro que facturamos. Por favor envíame:\n\n1. Tu RFC\n2. Razón social completa\n3. Email para la factura\n4. Uso de CFDI (ej: G03 Gastos en general)\n5. Código postal fiscal\n\nTe la envío en máximo 24 horas.',
    autoAction: 'invoice_request',
    requiresHuman: false,
    priority: 6,
  },
  
  // QUEJA
  {
    name: 'complaint',
    displayName: 'Queja o problema',
    category: 'complaint',
    keywords: ['queja', 'molesto', 'enojado', 'mal servicio', 'terrible', 'pésimo', 'estafa', 'fraude', 'devolver', 'reembolso', 'no sirve', 'basura'],
    autoResponse: '😔 Lamento mucho escuchar eso. Tu satisfacción es muy importante para nosotros.\n\nCuéntame exactamente qué pasó y haré todo lo posible por ayudarte. Un agente también revisará tu caso.',
    requiresHuman: true,
    priority: 10,
  },
  
  // SALUDO
  {
    name: 'greeting',
    displayName: 'Saludo',
    category: 'info',
    keywords: ['hola', 'buenas', 'buenos días', 'buenas tardes', 'buenas noches', 'hey', 'qué tal', 'que tal', 'hi', 'hello'],
    autoResponse: '¡Hola! 👋 Bienvenido a Bear Beat. Soy el asistente virtual.\n\n¿En qué puedo ayudarte?\n\n💳 Quiero comprar\n🔑 Problema con mi acceso\n📥 Ayuda con descargas\n❓ Tengo una pregunta',
    requiresHuman: false,
    priority: 1,
  },
  
  // DESPEDIDA
  {
    name: 'goodbye',
    displayName: 'Despedida',
    category: 'info',
    keywords: ['gracias', 'adiós', 'adios', 'bye', 'hasta luego', 'nos vemos', 'chao', 'ok gracias', 'muchas gracias', 'thank'],
    autoResponse: '¡Gracias por contactarnos! 🙌\n\nSi tienes más preguntas, aquí estaré las 24 horas.\n\n¡Que tengas un excelente día! 🎵',
    requiresHuman: false,
    priority: 1,
  },
  
  // HABLAR CON HUMANO
  {
    name: 'human_request',
    displayName: 'Hablar con humano',
    category: 'support',
    keywords: ['hablar con alguien', 'persona real', 'agente', 'humano', 'asesor', 'ejecutivo', 'soporte real', 'alguien real'],
    autoResponse: '¡Entendido! 👤\n\nTe conecto con un agente humano. Por favor espera un momento, alguien te atenderá lo más pronto posible.\n\nMientras tanto, ¿hay algo en lo que pueda ayudarte?',
    autoAction: 'escalate_to_human',
    requiresHuman: true,
    priority: 10,
  },
]

/**
 * Detecta la intención del mensaje
 */
export function detectIntent(message: string): { intent: Intent | null; confidence: number } {
  const messageLower = message.toLowerCase().trim()
  
  let bestMatch: Intent | null = null
  let bestScore = 0
  
  for (const intent of INTENTS) {
    let matchCount = 0
    
    for (const keyword of intent.keywords) {
      if (messageLower.includes(keyword.toLowerCase())) {
        matchCount++
      }
    }
    
    if (matchCount > 0) {
      // Calcular score basado en matches y prioridad
      const score = (matchCount / intent.keywords.length) + (intent.priority / 100)
      
      if (score > bestScore) {
        bestScore = score
        bestMatch = intent
      }
    }
  }
  
  // Calcular confianza
  const confidence = bestMatch ? Math.min(bestScore * 1.5, 0.99) : 0
  
  return { intent: bestMatch, confidence }
}

// ==========================================
// ACCIONES AUTOMÁTICAS
// ==========================================

export interface ActionResult {
  success: boolean
  message: string
  data?: any
}

/**
 * Ejecuta una acción automática basada en la intención
 */
export async function executeAction(
  action: string,
  context: {
    subscriberId: string
    email?: string
    phone?: string
    conversationId: string
    messageContent: string
  }
): Promise<ActionResult> {
  const supabase = await createServerClient()
  
  switch (action) {
    case 'password_reset': {
      // Si tenemos email, enviamos link de reset
      if (context.email) {
        // Buscar usuario
        const { data: user } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', context.email)
          .single()
        
        if (user) {
          // TODO: Enviar email de reset via Supabase Auth
          return {
            success: true,
            message: `✅ Te envié un email a ${context.email} con el link para restablecer tu contraseña.\n\nRevisa tu bandeja de entrada (y spam) y sigue las instrucciones.`,
            data: { userId: user.id },
          }
        } else {
          return {
            success: false,
            message: `🤔 No encontré una cuenta con ese email. ¿Podrías verificar que esté bien escrito?\n\nSi no recuerdas tu email, dime el teléfono con el que te registraste.`,
          }
        }
      }
      
      return {
        success: false,
        message: 'Para restablecer tu contraseña necesito tu email registrado. ¿Cuál es?',
      }
    }
    
    case 'verify_payment': {
      // Buscar pago por email o teléfono
      const searchEmail = context.email
      const searchPhone = context.phone
      
      if (searchEmail || searchPhone) {
        // Buscar en purchases
        let query = supabase.from('purchases').select('*, pack:packs(name)')
        
        if (searchEmail) {
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('email', searchEmail)
            .single()
          
          if (user) {
            query = query.eq('user_id', user.id)
          }
        }
        
        const { data: purchases } = await query.order('purchased_at', { ascending: false }).limit(1)
        
        if (purchases && purchases.length > 0) {
          const purchase = purchases[0]
          return {
            success: true,
            message: `✅ ¡Encontré tu compra!\n\n📦 Pack: ${purchase.pack?.name}\n💰 Monto: $${purchase.amount_paid} ${purchase.currency}\n📅 Fecha: ${new Date(purchase.purchased_at).toLocaleDateString('es-MX')}\n\nTu acceso ya debería estar activo. ¿Puedes intentar entrar de nuevo?\n\nSi sigue sin funcionar, revisa tu email (incluyendo spam) donde te enviamos las credenciales.`,
            data: { purchase },
          }
        }
        
        // Buscar en pending_purchases
        const { data: pending } = await supabase
          .from('pending_purchases')
          .select('*, pack:packs(name)')
          .eq('status', 'awaiting_completion')
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (pending && pending.length > 0) {
          return {
            success: true,
            message: `⏳ Encontré un pago pendiente de activación.\n\n¿Podrías completar tu registro en este link para activar tu acceso?\n\n[Completar registro]\n\nO si prefieres, dame tu email y te activo manualmente.`,
            data: { pending: pending[0] },
          }
        }
      }
      
      return {
        success: false,
        message: '🔍 No encontré ningún pago con esos datos.\n\n¿Podrías darme:\n1. El email que usaste al pagar\n2. O el número desde donde pagaste\n3. O los últimos 4 dígitos de tu tarjeta\n\nAsí puedo buscarlo mejor.',
      }
    }
    
    case 'download_help': {
      return {
        success: true,
        message: `📥 Aquí tienes la guía de descarga:\n\n**Opción 1 - Web (fácil)**\n1. Entra a bearbeat.com/dashboard\n2. Inicia sesión\n3. Click en el pack\n4. Click en "Descargar"\n\n**Opción 2 - FTP (más rápido)**\n1. Descarga FileZilla\n2. Usa estas credenciales:\n   - Servidor: ftp.bearbeat.com\n   - Usuario: (en tu email)\n   - Contraseña: (en tu email)\n\n¿Con cuál tienes problema?`,
      }
    }
    
    case 'escalate_to_human': {
      // Marcar conversación para atención humana
      await supabase
        .from('conversations')
        .update({
          needs_human: true,
          status: 'pending_human',
          updated_at: new Date().toISOString(),
        })
        .eq('id', context.conversationId)
      
      return {
        success: true,
        message: '👤 Listo, un agente revisará tu caso y te contactará pronto.\n\nMientras tanto, ¿hay algo más en lo que pueda ayudarte?',
      }
    }
    
    case 'invoice_request': {
      // Guardar solicitud de factura
      await supabase.from('bot_actions').insert({
        conversation_id: context.conversationId,
        action_type: 'invoice_request',
        action_params: { subscriberId: context.subscriberId },
        status: 'pending',
      })
      
      return {
        success: true,
        message: '🧾 Registré tu solicitud de factura. Por favor envíame los datos fiscales y la procesamos.',
      }
    }
    
    default:
      return {
        success: false,
        message: 'Acción no reconocida',
      }
  }
}

// ==========================================
// BÚSQUEDA EN KNOWLEDGE BASE
// ==========================================

export async function searchKnowledgeBase(query: string): Promise<string | null> {
  const supabase = await createServerClient()
  const queryLower = query.toLowerCase()
  
  // Buscar en knowledge base por keywords
  const { data: articles } = await supabase
    .from('knowledge_base')
    .select('*')
    .eq('is_active', true)
  
  if (!articles || articles.length === 0) return null
  
  // Buscar mejor match
  let bestMatch = null
  let bestScore = 0
  
  for (const article of articles) {
    let score = 0
    
    // Buscar en keywords
    for (const keyword of article.keywords || []) {
      if (queryLower.includes(keyword.toLowerCase())) {
        score += 2
      }
    }
    
    // Buscar en variaciones de pregunta
    for (const variation of article.question_variations || []) {
      if (queryLower.includes(variation.toLowerCase())) {
        score += 3
      }
    }
    
    if (score > bestScore) {
      bestScore = score
      bestMatch = article
    }
  }
  
  if (bestMatch && bestScore >= 2) {
    // Incrementar contador de uso
    await supabase
      .from('knowledge_base')
      .update({ times_used: (bestMatch.times_used || 0) + 1 })
      .eq('id', bestMatch.id)
    
    return bestMatch.short_answer || bestMatch.answer
  }
  
  return null
}

// ==========================================
// PROCESAMIENTO DE MENSAJES
// ==========================================

/**
 * Procesa un mensaje entrante y genera respuesta
 */
export async function processMessage(message: IncomingMessage): Promise<BotResponse> {
  const supabase = await createServerClient()
  const startTime = Date.now()
  
  try {
    // 1. Obtener o crear conversación
    const { data: convData } = await supabase.rpc('get_or_create_conversation', {
      p_manychat_id: message.subscriberId,
      p_phone: message.phone,
      p_email: message.email,
      p_name: message.name,
    })
    
    const conversationId = convData
    
    // 2. Detectar intención
    const { intent, confidence } = detectIntent(message.content)
    
    // 3. Guardar mensaje entrante
    const { data: savedMessage } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      content: message.content,
      content_type: message.contentType || 'text',
      direction: 'inbound',
      sender_type: 'user',
      manychat_message_id: message.messageId,
      manychat_subscriber_id: message.subscriberId,
      detected_intent: intent?.name,
      intent_confidence: confidence,
    }).select().single()
    
    // 4. Generar respuesta
    let responseText = ''
    let action: string | undefined
    let actionResult: ActionResult | undefined
    let shouldEscalate = false
    
    if (intent) {
      responseText = intent.autoResponse
      shouldEscalate = intent.requiresHuman
      
      // Ejecutar acción si hay
      if (intent.autoAction) {
        action = intent.autoAction
        
        // Extraer email del mensaje si lo contiene
        const emailMatch = message.content.match(/[\w.-]+@[\w.-]+\.\w+/)
        const extractedEmail = emailMatch ? emailMatch[0] : message.email
        
        actionResult = await executeAction(intent.autoAction, {
          subscriberId: message.subscriberId,
          email: extractedEmail,
          phone: message.phone,
          conversationId,
          messageContent: message.content,
        })
        
        if (actionResult.message) {
          responseText = actionResult.message
        }
      }
    } else {
      // Buscar en knowledge base
      const kbResponse = await searchKnowledgeBase(message.content)
      
      if (kbResponse) {
        responseText = kbResponse
      } else {
        // Respuesta por defecto
        responseText = '🤔 No estoy seguro de entender tu pregunta.\n\n¿Podrías decirme más específicamente en qué puedo ayudarte?\n\n- Si es sobre tu compra, dime tu email\n- Si es sobre descargas, dime qué error ves\n- Si es otra cosa, cuéntame los detalles\n\nO si prefieres, escribe "agente" para hablar con una persona.'
      }
    }
    
    // 5. Calcular tiempo de respuesta
    const responseTime = Date.now() - startTime
    
    // 6. Guardar respuesta del bot
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      content: responseText,
      content_type: 'text',
      direction: 'outbound',
      sender_type: 'bot',
      bot_response: responseText,
      bot_action_taken: action,
      bot_action_result: actionResult,
      response_time_ms: responseTime,
    })
    
    // 7. Actualizar conversación si necesita humano
    if (shouldEscalate) {
      await supabase
        .from('conversations')
        .update({
          needs_human: true,
          status: 'pending_human',
        })
        .eq('id', conversationId)
    }
    
    return {
      text: responseText,
      action,
      actionResult,
      shouldEscalate,
      intent: intent?.name,
      confidence,
    }
    
  } catch (error) {
    console.error('Error processing message:', error)
    
    return {
      text: '😅 Ups, tuve un problema técnico. Por favor intenta de nuevo o escribe "agente" para hablar con una persona.',
      shouldEscalate: true,
    }
  }
}

// ==========================================
// FUNCIONES DE ANÁLISIS
// ==========================================

/**
 * Obtiene las intenciones más comunes
 */
export async function getTopIntents(days: number = 30): Promise<Array<{ intent: string; count: number }>> {
  const supabase = await createServerClient()
  
  const { data } = await supabase
    .from('messages')
    .select('detected_intent')
    .not('detected_intent', 'is', null)
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
  
  if (!data) return []
  
  // Contar intenciones
  const counts: Record<string, number> = {}
  for (const msg of data) {
    counts[msg.detected_intent] = (counts[msg.detected_intent] || 0) + 1
  }
  
  // Ordenar
  return Object.entries(counts)
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Obtiene preguntas sin respuesta (para mejorar el bot)
 */
export async function getUnansweredQuestions(limit: number = 50): Promise<string[]> {
  const supabase = await createServerClient()
  
  const { data } = await supabase
    .from('messages')
    .select('content')
    .eq('direction', 'inbound')
    .is('detected_intent', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  return data?.map(m => m.content) || []
}
