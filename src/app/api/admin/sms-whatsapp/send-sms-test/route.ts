/**
 * POST /api/admin/sms-whatsapp/send-sms-test
 * Envía un SMS de prueba vía Brevo (solo Admin).
 * Body: { to: string, templateId?: string, message?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'
import { sendBrevoSms, isBrevoSmsConfigured, getBrevoSmsConfigDiagnostic } from '@/lib/brevo-sms'
import { SMS_TEMPLATES } from '../templates'

async function isAdmin(req: NextRequest): Promise<boolean> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  if (isAdminEmailWhitelist(user.email ?? undefined)) return true
  const { data: profile } = await (supabase.from('users') as any).select('role').eq('id', user.id).maybeSingle()
  return (profile as { role?: string } | null)?.role === 'admin'
}

export async function POST(req: NextRequest) {
  const ok = await isAdmin(req)
  if (!ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (!isBrevoSmsConfigured()) {
    const diag = getBrevoSmsConfigDiagnostic()
    return NextResponse.json({
      error: 'Brevo SMS no está configurado',
      diagnostic: { BREVO_API_KEY: diag.apiKey, BREVO_SMS_SENDER: diag.sender },
      hint: 'Variables: BREVO_API_KEY (misma que email), BREVO_SMS_SENDER (máx 11 caracteres).',
    }, { status: 400 })
  }

  let body: { to?: string; templateId?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const to = (body.to || '').trim().replace(/\s/g, '')
  if (!to || to.length < 10) {
    return NextResponse.json({ error: 'to debe ser un número de teléfono válido (ej. +5215512345678)' }, { status: 400 })
  }

  let content: string
  const templateId = (body.templateId || '').toLowerCase()
  if (body.message && body.message.trim()) {
    content = body.message.trim()
  } else if (templateId) {
    const tpl = SMS_TEMPLATES.find((t) => t.id === templateId)
    if (!tpl) {
      return NextResponse.json({ error: 'templateId debe ser: otp, bienvenida o recordatorio' }, { status: 400 })
    }
    content = tpl.message
  } else {
    return NextResponse.json({ error: 'Indica templateId o message' }, { status: 400 })
  }

  const result = await sendBrevoSms(to, content, undefined, { tag: templateId || 'test' })
  if (result.success) {
    return NextResponse.json({ success: true, message: 'SMS enviado', messageId: result.messageId })
  }
  return NextResponse.json({
    error: result.error || 'Error al enviar',
    hint: 'Revisa en Brevo: SMS activado, remitente aprobado, número en formato E.164 (ej. +5215512345678).',
  }, { status: 500 })
}
