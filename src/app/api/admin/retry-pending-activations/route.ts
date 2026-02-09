/**
 * POST: Reintentar activar todas las compras pendientes (status = awaiting_completion).
 * Llama a activate-pending por cada una. Solo admin.
 * Útil cuando el webhook falló y Stripe ya no reintenta.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'
import { activatePendingPurchase } from '@/lib/admin/activate-pending'
import { getErrorMessage } from '@/lib/http-error'

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

    const { data: pendings } = await supabase
      .from('pending_purchases')
      .select('id, stripe_session_id, customer_email')
      .eq('status', 'awaiting_completion')
      .eq('payment_status', 'paid')
      .not('stripe_session_id', 'is', null)

    if (!pendings?.length) {
      return NextResponse.json({
        ok: true,
        activated: 0,
        failed: 0,
        message: 'No hay pendientes por activar.',
      })
    }

    let activated = 0
    const errors: string[] = []
    const isProd = process.env.NODE_ENV === 'production'

    for (const row of pendings) {
      const sessionId = row.stripe_session_id
      if (!sessionId) continue
      // En producción, los IDs cs_test_ no existen con la Stripe live key.
      // Estos suelen venir de pruebas antiguas y no deben bloquear el "Reintentar todos".
      if (isProd && sessionId.startsWith('cs_test_')) {
        errors.push(`${row.customer_email || row.id}: Stripe TEST (cs_test_) ignorado en producción`)
        continue
      }
      try {
        const result = await activatePendingPurchase({ sessionId })
        if (result?.ok) activated++
      } catch (e: unknown) {
        errors.push(`${row.customer_email || row.id}: ${getErrorMessage(e)}`)
      }
    }

    const failed = pendings.length - activated
    return NextResponse.json({
      ok: true,
      activated,
      failed,
      total: pendings.length,
      errors: errors.slice(0, 10),
      message: `Activados: ${activated}, fallidos: ${failed}.`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
