import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import webpush from 'web-push'

// ==========================================
// API - Enviar notificaciones push (Admin)
// ==========================================

// Configurar VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:soporte@bearbeat.mx'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export async function POST(req: NextRequest) {
  try {
    const { title, body, url, icon, target } = await req.json()

    // Verificar que es admin
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Obtener suscripciones
    let query = supabase
      .from('push_subscriptions')
      .select('*')
      .eq('active', true)

    // Filtrar por target si se especifica
    if (target === 'users') {
      query = query.not('user_id', 'is', null)
    } else if (target === 'anonymous') {
      query = query.is('user_id', null)
    }

    const { data: subscriptions, error } = await query

    if (error || !subscriptions) {
      return NextResponse.json({ error: 'Error obteniendo suscripciones' }, { status: 500 })
    }

    // Payload de la notificación
    const payload = JSON.stringify({
      title: title || 'Bear Beat',
      body: body || '¡Tienes una nueva notificación!',
      icon: icon || '/favicon.png',
      badge: '/favicon.png',
      data: { url: url || '/' },
      requireInteraction: true
    })

    // Enviar a todos los suscritos
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys
            },
            payload
          )
          return { success: true, endpoint: sub.endpoint }
        } catch (err: any) {
          // Si la suscripción ya no es válida, desactivarla
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .update({ active: false })
              .eq('endpoint', sub.endpoint)
          }
          return { success: false, endpoint: sub.endpoint, error: err.message }
        }
      })
    )

    const sent = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length
    const failed = results.length - sent

    // Registrar en historial
    await supabase.from('notification_history').insert({
      title,
      body,
      url,
      sent_count: sent,
      failed_count: failed,
      target,
      sent_by: user.id
    })

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: subscriptions.length
    })
  } catch (error: any) {
    console.error('Error enviando notificaciones:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET - Obtener stats de suscripciones
export async function GET() {
  try {
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('active, user_id')
      .eq('active', true)

    if (error) throw error

    const total = data?.length || 0
    const withUser = data?.filter(s => s.user_id).length || 0
    const anonymous = total - withUser

    return NextResponse.json({
      total,
      withUser,
      anonymous
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
