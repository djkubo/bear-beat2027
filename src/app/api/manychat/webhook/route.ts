import { NextRequest, NextResponse } from 'next/server'
import { processMessage, type IncomingMessage } from '@/lib/chatbot'
import { sendFlow, addTagByName, setCustomFieldByName, BEAR_BEAT_TAGS } from '@/lib/manychat'

/**
 * Webhook de ManyChat
 * 
 * Recibe mensajes de usuarios y genera respuestas automáticas
 * 
 * Configurar en ManyChat:
 * 1. Ve a Settings → API
 * 2. Agrega este webhook: https://tudominio.com/api/manychat/webhook
 * 3. Selecciona los eventos a recibir (new_message, etc.)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    console.log('ManyChat Webhook received:', JSON.stringify(body, null, 2))
    
    // Extraer datos del mensaje según el formato de ManyChat
    const {
      subscriber_id,
      message_id,
      text,
      type,
      subscriber,
      custom_fields,
    } = body
    
    // Si no es un mensaje de texto, ignorar (por ahora)
    if (!text && type !== 'text') {
      return NextResponse.json({ success: true, skipped: true })
    }
    
    // Construir mensaje para procesar
    const incomingMessage: IncomingMessage = {
      subscriberId: subscriber_id || subscriber?.id,
      messageId: message_id,
      content: text || body.content || '',
      contentType: type || 'text',
      phone: subscriber?.phone || custom_fields?.phone,
      email: subscriber?.email || custom_fields?.email,
      name: subscriber?.name || subscriber?.first_name,
      customFields: custom_fields,
    }
    
    // Si no hay contenido, ignorar
    if (!incomingMessage.content || !incomingMessage.subscriberId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing content or subscriber_id' 
      }, { status: 400 })
    }
    
    // Procesar mensaje con el chatbot
    const response = await processMessage(incomingMessage)
    
    console.log('Bot response:', {
      intent: response.intent,
      confidence: response.confidence,
      shouldEscalate: response.shouldEscalate,
      textLength: response.text.length,
    })
    
    // Actualizar tags en ManyChat según la intención
    if (response.intent && incomingMessage.subscriberId) {
      const intentTagMap: Record<string, string> = {
        'password_reset': 'bb_needs_support',
        'payment_no_access': 'bb_payment_issue',
        'download_issue': 'bb_download_issue',
        'price_question': 'bb_interested_buyer',
        'payment_methods': 'bb_interested_buyer',
        'content_question': 'bb_interested_buyer',
        'complaint': 'bb_complaint',
        'human_request': 'bb_needs_human',
      }
      
      const tagToAdd = intentTagMap[response.intent]
      if (tagToAdd) {
        await addTagByName(incomingMessage.subscriberId, tagToAdd)
      }
      
      // Guardar última intención como custom field
      await setCustomFieldByName(
        incomingMessage.subscriberId,
        'bb_last_intent',
        response.intent
      )
    }
    
    // Si necesita humano, agregar tag
    if (response.shouldEscalate) {
      await addTagByName(incomingMessage.subscriberId, 'bb_needs_human')
    }
    
    // Retornar respuesta para ManyChat
    // ManyChat espera un formato específico para responder automáticamente
    return NextResponse.json({
      success: true,
      version: 'v2',
      content: {
        messages: [
          {
            type: 'text',
            text: response.text,
          },
        ],
        // Agregar quick replies si hay
        ...(response.quickReplies && {
          quick_replies: response.quickReplies.map(qr => ({
            type: 'text',
            title: qr,
            payload: qr,
          })),
        }),
      },
      // Datos adicionales para tracking
      metadata: {
        intent: response.intent,
        confidence: response.confidence,
        action: response.action,
        shouldEscalate: response.shouldEscalate,
      },
    })
    
  } catch (error: any) {
    console.error('ManyChat webhook error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      content: {
        messages: [
          {
            type: 'text',
            text: '😅 Tuve un problema técnico. Por favor escribe "agente" para hablar con una persona.',
          },
        ],
      },
    }, { status: 500 })
  }
}

/**
 * GET para verificar que el webhook está activo
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    webhook: 'ManyChat Chatbot Webhook',
    version: '1.0',
    capabilities: [
      'intent_detection',
      'auto_response',
      'password_reset',
      'payment_verification',
      'download_help',
      'human_escalation',
    ],
  })
}
