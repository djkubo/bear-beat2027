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
    let body: any = null
    try {
      body = await req.json()
    } catch (e) {
      // Tracking is non-critical: invalid/empty body should never spam logs or break UX.
      if (process.env.NODE_ENV === 'development') {
        const msg = e instanceof Error ? e.message : String(e)
        if (!/Unexpected end of JSON input/i.test(msg) && !/aborted|ECONNRESET/i.test(msg)) {
          console.warn('Facebook API route: invalid JSON body:', msg)
        }
      }
      return NextResponse.json({ success: false }, { status: 200 })
    }
    const headersList = await headers()
    
    const {
      eventName,
      eventId,
      eventSourceUrl,
      userData = {},
      customData,
    } = body
    
    if (!eventName) {
      // Tracking is non-critical: return 200 to avoid noisy console errors.
      return NextResponse.json({ success: false, error: 'eventName is required' }, { status: 200 })
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
    // Tracking is non-critical: avoid server errors and keep logs quiet.
    const msg = error instanceof Error ? error.message : String(error)
    if (process.env.NODE_ENV === 'development' && !/aborted|ECONNRESET/i.test(msg)) {
      console.warn('Facebook API route error:', msg)
    }
    return NextResponse.json({ success: false, error: msg || 'Internal server error' }, { status: 200 })
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
