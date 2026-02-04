/**
 * POST /api/admin/sms-whatsapp/send-whatsapp-test
 * Envía un WhatsApp de prueba vía Twilio (solo Admin).
 * Body: { to: string, templateId?: string, message?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'
import twilio from 'twilio'
import { WHATSAPP_TEMPLATES } from '../route'

function isTwilioWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    (process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER)
  )
}

function getTwilioWhatsAppDiagnostic(): { accountSid: string; authToken: string; whatsappNumber: string } {
  const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim()
  const token = (process.env.TWILIO_AUTH_TOKEN || '').trim()
  const wa = (process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER || '').trim()
  return {
    accountSid: !sid ? 'no definido' : sid.length < 30 ? 'formato incorrecto' : 'OK',
    authToken: !token ? 'no definido' : 'OK',
    whatsappNumber: !wa ? 'no definido' : 'OK',
  }
}

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

  if (!isTwilioWhatsAppConfigured()) {
    const diag = getTwilioWhatsAppDiagnostic()
    return NextResponse.json({
      error: 'Twilio WhatsApp no está configurado',
      diagnostic: diag,
      hint: 'Variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER (ej. whatsapp:+14155238886).',
    }, { status: 400 })
  }

  let body: { to?: string; templateId?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  let to = (body.to || '').trim().replace(/\s/g, '')
  if (!to || to.length < 10) {
    return NextResponse.json({ error: 'to debe ser un número (ej. +5215512345678)' }, { status: 400 })
  }
  if (!to.startsWith('whatsapp:')) to = `whatsapp:${to}`

  let content: string
  const templateId = (body.templateId || '').toLowerCase()
  if (body.message && body.message.trim()) {
    content = body.message.trim()
  } else if (templateId) {
    const tpl = WHATSAPP_TEMPLATES.find((t) => t.id === templateId)
    if (!tpl) {
      return NextResponse.json({ error: 'templateId debe ser: bienvenida, recordatorio o soporte' }, { status: 400 })
    }
    content = tpl.message
  } else {
    return NextResponse.json({ error: 'Indica templateId o message' }, { status: 400 })
  }

  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    )
    const from = process.env.TWILIO_WHATSAPP_NUMBER || `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`
    const result = await client.messages.create({
      body: content,
      from,
      to,
    })
    return NextResponse.json({ success: true, message: 'WhatsApp enviado', messageId: result.sid })
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}
