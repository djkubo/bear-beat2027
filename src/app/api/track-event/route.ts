import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { eventType, eventName, eventData = {}, userId } = await req.json()
    
    if (!eventType || !eventName) {
      return NextResponse.json(
        { error: 'Event type and name required' },
        { status: 400 }
      )
    }
    
    const supabase = await createServerClient()
    const headersList = await headers()
    
    // Obtener session ID de cookies o crear uno
    const sessionId = req.cookies.get('bear_session_id')?.value || 
      `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Obtener IP y user agent
    const ip = headersList.get('x-forwarded-for') || 
               headersList.get('x-real-ip') || 
               'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'
    const referer = headersList.get('referer') || '(direct)'
    
    // Insertar evento
    const { error } = await supabase.from('user_events').insert({
      session_id: sessionId,
      user_id: userId || null,
      event_type: eventType,
      event_name: eventName,
      event_data: eventData,
      page_url: eventData.pageUrl || referer,
      referrer: referer,
      user_agent: userAgent,
      ip_address: ip.split(',')[0].trim(), // Primera IP si hay múltiples
    })
    
    if (error) throw error
    
    // Establecer cookie de session si no existe
    const response = NextResponse.json({ success: true })
    
    if (!req.cookies.get('bear_session_id')) {
      response.cookies.set('bear_session_id', sessionId, {
        maxAge: 60 * 60 * 24 * 30, // 30 días
        path: '/',
      })
    }
    
    return response
  } catch (error: any) {
    console.error('Error tracking event:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to track event' },
      { status: 500 }
    )
  }
}
