import { NextRequest, NextResponse } from 'next/server'
import { processMessage, type IncomingMessage } from '@/lib/chatbot'
import { cookies } from 'next/headers'

// Generar UUID sin dependencia externa
function generateId(): string {
  return `web_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * API de Chat Web
 * 
 * Endpoint para el widget de chat en la web
 * Usa el mismo motor de chatbot que ManyChat
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, sessionId, email, phone, name } = body
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }
    
    // Obtener o crear session ID
    let currentSessionId = sessionId
    if (!currentSessionId) {
      // Intentar obtener de cookies
      const cookieStore = await cookies()
      currentSessionId = cookieStore.get('chat_session_id')?.value
      
      if (!currentSessionId) {
        currentSessionId = generateId()
      }
    }
    
    // Construir mensaje para el chatbot
    const incomingMessage: IncomingMessage = {
      subscriberId: currentSessionId,
      content: message.trim(),
      contentType: 'text',
      email: email,
      phone: phone,
      name: name,
    }
    
    // Procesar con el chatbot
    const botResponse = await processMessage(incomingMessage)
    
    // Crear respuesta
    const response = NextResponse.json({
      success: true,
      response: botResponse.text,
      sessionId: currentSessionId,
      intent: botResponse.intent,
      confidence: botResponse.confidence,
      shouldEscalate: botResponse.shouldEscalate,
    })
    
    // Establecer cookie de sesión
    response.cookies.set('chat_session_id', currentSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 días
    })
    
    return response
    
  } catch (error: any) {
    console.error('Chat API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      response: '😅 Ups, tuve un problema técnico. Por favor intenta de nuevo o escríbenos por WhatsApp al +52 XXX XXX XXXX',
    }, { status: 500 })
  }
}

/**
 * GET - Estado del chat
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    name: 'Bear Beat Chat',
    version: '1.0',
    features: [
      'intent_detection',
      'auto_response', 
      'password_reset',
      'payment_verification',
      'download_help',
      'human_escalation',
    ],
  })
}
