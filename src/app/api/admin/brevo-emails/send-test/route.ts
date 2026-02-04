/**
 * POST /api/admin/brevo-emails/send-test
 * Envía un email de prueba de una plantilla (solo Admin).
 * Body: { template: 'bienvenida' | 'recuperacion' | 'transaccional', to: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'
import {
  sendWelcomeEmail,
  sendWelcomeRegistroEmail,
  sendPaymentConfirmationEmail,
  sendPaymentFailedRecoveryEmail,
  sendEmail,
  isBrevoEmailConfigured,
  getBrevoConfigDiagnostic,
} from '@/lib/brevo-email'

async function isAdmin(req: NextRequest): Promise<boolean> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  if (isAdminEmailWhitelist(user.email ?? undefined)) return true
  const { data: profile } = await (supabase.from('users') as any).select('role').eq('id', user.id).maybeSingle()
  return (profile as { role?: string } | null)?.role === 'admin'
}

const TEMPLATES = ['bienvenida', 'bienvenida_registro', 'confirmacion_pago', 'recuperacion', 'transaccional'] as const

export async function POST(req: NextRequest) {
  const ok = await isAdmin(req)
  if (!ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (!isBrevoEmailConfigured()) {
    const diag = getBrevoConfigDiagnostic()
    return NextResponse.json({
      error: 'Brevo no está configurado',
      diagnostic: {
        BREVO_API_KEY: diag.apiKey,
        BREVO_SENDER_EMAIL: diag.senderEmail,
      },
      hint: 'En Render: Environment. En local: .env.local. Redeploy tras cambiar variables.',
    }, { status: 400 })
  }

  let body: { template?: string; to?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const template = (body.template || '').toLowerCase()
  const to = (body.to || '').trim()

  if (!TEMPLATES.includes(template as any)) {
    return NextResponse.json({ error: 'template debe ser: bienvenida, bienvenida_registro, confirmacion_pago, recuperacion o transaccional' }, { status: 400 })
  }
  if (!to || !to.includes('@')) {
    return NextResponse.json({ error: 'to debe ser un email válido' }, { status: 400 })
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')

  if (template === 'bienvenida') {
    const result = await sendWelcomeEmail({
      to,
      name: 'Prueba Admin',
      password: 'TempPrueba123',
      loginUrl: `${appUrl}/login`,
      subject: '[PRUEBA] Bear Beat – Tu acceso está listo',
    })
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Email de bienvenida enviado', messageId: result.messageId })
    }
    return NextResponse.json({ error: result.error || 'Error al enviar' }, { status: 500 })
  }

  if (template === 'bienvenida_registro') {
    const result = await sendWelcomeRegistroEmail({ to, name: 'Prueba Admin' })
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Email bienvenida registro enviado', messageId: result.messageId })
    }
    return NextResponse.json({ error: result.error || 'Error al enviar' }, { status: 500 })
  }

  if (template === 'confirmacion_pago') {
    const result = await sendPaymentConfirmationEmail({
      to,
      userName: 'Prueba Admin',
      amount: 350,
      orderId: 'PRUEBA-ADMIN-' + Date.now(),
    })
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Email confirmación de pago enviado', messageId: result.messageId })
    }
    return NextResponse.json({ error: result.error || 'Error al enviar' }, { status: 500 })
  }

  if (template === 'recuperacion') {
    const result = await sendPaymentFailedRecoveryEmail({
      to,
      name: 'Prueba Admin',
      recoveryUrl: `${appUrl}/checkout`,
    })
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Email de recuperación enviado', messageId: result.messageId })
    }
    return NextResponse.json({ error: result.error || 'Error al enviar' }, { status: 500 })
  }

  // transaccional
  const result = await sendEmail(
    to,
    '[PRUEBA] Bear Beat – Email transaccional',
    `
    <p>Hola,</p>
    <p>Este es un <strong>email de prueba</strong> de la plantilla transaccional.</p>
    <p>— Bear Beat</p>
    `.trim(),
    { name: 'Prueba Admin', tags: ['transactional'] }
  )
  if (result.success) {
    return NextResponse.json({ success: true, message: 'Email transaccional enviado', messageId: result.messageId })
  }
  return NextResponse.json({ error: result.error || 'Error al enviar' }, { status: 500 })
}
