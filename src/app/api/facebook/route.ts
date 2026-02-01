import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import {
  sendEventToCAPI,
  generateEventId,
  getFacebookCookies,
  type FacebookUserData,
  type FacebookCustomData,
} from '@/lib/facebook-capi'

/**
 * API Route para Facebook Conversions API
 * 
 * Recibe eventos del cliente y los envía a Facebook CAPI
 * con deduplicación perfecta usando event_id
 * 
 * POST /api/facebook
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const headersList = await headers()
    
    const {
      eventName,
      eventId,
      eventSourceUrl,
      userData = {},
      customData,
    } = body
    
    if (!eventName) {
      return NextResponse.json(
        { error: 'eventName is required' },
        { status: 400 }
      )
    }
    
    // Generar event_id si no viene
    const finalEventId = eventId || generateEventId()
    
    // Obtener IP del cliente
    const clientIp = headersList.get('x-forwarded-for')?.split(',')[0].trim() ||
                     headersList.get('x-real-ip') ||
                     'unknown'
    
    // Obtener User Agent
    const clientUserAgent = headersList.get('user-agent') || ''
    
    // Obtener cookies de Facebook
    const cookieHeader = headersList.get('cookie')
    const fbCookies = getFacebookCookies(cookieHeader)
    
    // Construir userData completo
    const fullUserData: FacebookUserData = {
      ...userData,
      clientIpAddress: clientIp !== 'unknown' ? clientIp : undefined,
      clientUserAgent: clientUserAgent || undefined,
      fbp: userData.fbp || fbCookies.fbp,
      fbc: userData.fbc || fbCookies.fbc,
    }
    
    // Enviar a Facebook CAPI
    const result = await sendEventToCAPI({
      eventName,
      eventId: finalEventId,
      eventSourceUrl: eventSourceUrl || headersList.get('referer') || '',
      userData: fullUserData,
      customData,
      actionSource: 'website',
    })
    
    // Retornar el event_id para que el cliente lo use con el Pixel
    return NextResponse.json({
      success: !result.error,
      eventId: finalEventId,
      eventsReceived: result.events_received,
      error: result.error?.message,
    })
    
  } catch (error: any) {
    console.error('Facebook API route error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/facebook
 * 
 * Genera un event_id para usar con el Pixel
 * Útil cuando necesitas el ID antes de enviar el evento
 */
export async function GET() {
  return NextResponse.json({
    eventId: generateEventId(),
  })
}
