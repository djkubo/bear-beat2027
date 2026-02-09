/**
 * POST: Activar una compra pendiente (cobrada en Stripe pero sin completar /complete-purchase).
 * Body: { sessionId?: string, pendingId?: number }
 * Solo admin. Busca en pending_purchases; si no hay fila (webhook no corrió), obtiene datos desde Stripe
 * (Checkout Session cs_xxx o Payment Intent pi_xxx) y activa igual.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'
import { activatePendingPurchase } from '@/lib/admin/activate-pending'
import { getErrorMessage, HttpError } from '@/lib/http-error'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    const isAdmin = userRow?.role === 'admin' || isAdminEmailWhitelist(user.email)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const sessionId = body.sessionId as string | undefined
    const pendingId = body.pendingId as number | undefined

    const result = await activatePendingPurchase({ sessionId, pendingId })
    return NextResponse.json(result)
  } catch (e: unknown) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error('activate-pending error:', e)
    return NextResponse.json({ error: getErrorMessage(e) || 'Error interno' }, { status: 500 })
  }
}

