import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { assignFtpToPurchase } from '@/lib/ftp-pool'

/**
 * POST /api/assign-ftp
 * Asigna una cuenta FTP del pool a la compra del usuario.
 * Solo el dueño de la compra puede llamar. Usado tras crear una compra (complete-purchase).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const purchaseId = Number(body.purchaseId)
    if (!purchaseId || Number.isNaN(purchaseId)) {
      return NextResponse.json({ error: 'purchaseId requerido' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: purchase } = await supabase
      .from('purchases')
      .select('id, user_id')
      .eq('id', purchaseId)
      .eq('user_id', user.id)
      .single()

    if (!purchase) {
      return NextResponse.json({ error: 'Compra no encontrada o no te pertenece' }, { status: 403 })
    }

    const admin = createServiceRoleClient()
    const assigned = await assignFtpToPurchase(admin, purchaseId)
    if (!assigned) {
      return NextResponse.json(
        { success: false, error: 'No hay cuentas FTP disponibles. Contacta soporte.' },
        { status: 503 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('assign-ftp error:', error)
    return NextResponse.json({ error: error.message || 'Error al asignar FTP' }, { status: 500 })
  }
}
