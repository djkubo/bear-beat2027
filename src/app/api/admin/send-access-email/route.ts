/**
 * POST: Envía el email "Acceso Liberado" (Panel Web + Google Drive) a un correo.
 * Solo admin. Útil para reenviar el correo a quien ya pagó pero no lo recibió.
 * Body: { email: string, name?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'
import { sendEmail, buildAccessLiberatedEmailHtml, getDashboardUrl } from '@/lib/brevo-email'

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
    const email = (body.email as string)?.trim()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Indica un email válido' }, { status: 400 })
    }

    const name = (body.name as string)?.trim()
    const html = buildAccessLiberatedEmailHtml(getDashboardUrl())
    const result = await sendEmail(
      email,
      '🐺 Acceso Liberado: Tu Pack Bear Beat está listo',
      html,
      { name: name || undefined, tags: ['access_liberated', 'admin_manual'] }
    )

    if (result.success) {
      return NextResponse.json({ ok: true, message: `Email enviado a ${email}` })
    }
    return NextResponse.json(
      { error: result.error || 'Error al enviar' },
      { status: 500 }
    )
  } catch (e: any) {
    console.error('send-access-email error:', e)
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    )
  }
}
