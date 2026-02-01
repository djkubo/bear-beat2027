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
    
    // Insertar evento (campos acotados para evitar 400 por schema/RLS)
    const payload: Record<string, unknown> = {
      session_id: (sessionId || '').slice(0, 255),
      user_id: userId || null,
      event_type: String(eventType).slice(0, 50),
      event_name: eventName ? String(eventName).slice(0, 255) : null,
      event_data: typeof eventData === 'object' && eventData !== null ? eventData : {},
      page_url: (eventData?.pageUrl || referer || '').slice(0, 2048),
      referrer: (referer || '').slice(0, 2048),
      user_agent: (userAgent || '').slice(0, 512),
      ip_address: (ip.split(',')[0] || '').trim().slice(0, 45),
    }
    const { error } = await supabase.from('user_events').insert(payload)

    if (error) {
      if (error.code === '23505') return NextResponse.json({ success: true }) // duplicate ok
      if (process.env.NODE_ENV === 'development') console.warn('user_events API:', error.message)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }
    
    // Establecer cookie de session si no existe
    const response = NextResponse.json({ success: true })
    
    if (!req.cookies.get('bear_session_id')) {
      response.cookies.set('bear_session_id', sessionId, {
        maxAge: 60 * 60 * 24 * 30, // 30 días
        path: '/',
      })
    }
    
    return response
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to track event'
    if (process.env.NODE_ENV === 'development') console.warn('track-event:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
