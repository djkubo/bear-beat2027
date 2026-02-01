import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// ==========================================
// API - Guardar suscripción push
// ==========================================

export async function POST(req: NextRequest) {
  try {
    const { subscription } = await req.json()

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Suscripción inválida' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Obtener usuario si está autenticado
    const { data: { user } } = await supabase.auth.getUser()

    // Guardar suscripción
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        user_id: user?.id || null,
        user_agent: req.headers.get('user-agent'),
        created_at: new Date().toISOString(),
        active: true
      }, {
        onConflict: 'endpoint'
      })

    if (error) {
      console.error('Error guardando suscripción:', error)
      return NextResponse.json(
        { error: 'Error guardando suscripción' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error en subscribe:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
