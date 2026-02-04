/**
 * GET /api/admin/sms-whatsapp
 * Diagnóstico de Brevo SMS y Twilio WhatsApp + plantillas predefinidas (solo Admin).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'
import { getBrevoSmsConfigDiagnostic, isBrevoSmsConfigured } from '@/lib/brevo-sms'

/** Nombres de env que pueden tener el número de WhatsApp (Twilio). Se usa el primero que exista. */
const TWILIO_WHATSAPP_ENV_KEYS = [
  'TWILIO_WHATSAPP_NUMBER',
  'TWILIO_PHONE_NUMBER',
  'TWILIO_WHATSAPP_SENDER',
  'TWILIO_WHATSAPP_FROM',
  'TWILIO_FROM_NUMBER',
] as const

function getTwilioWhatsAppFromNumber(): { value: string; usedKey: string | null } {
  for (const key of TWILIO_WHATSAPP_ENV_KEYS) {
    const v = (process.env[key] || '').trim()
    if (v) return { value: v, usedKey: key }
  }
  return { value: '', usedKey: null }
}

function getTwilioWhatsAppDiagnostic(): { accountSid: string; authToken: string; whatsappNumber: string; whatsappUsedKey: string | null; ok: boolean } {
  const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim()
  const token = (process.env.TWILIO_AUTH_TOKEN || '').trim()
  const { value: wa, usedKey: whatsappUsedKey } = getTwilioWhatsAppFromNumber()
  const whatsappNumber =
    !wa
      ? `no definido (prueba: ${TWILIO_WHATSAPP_ENV_KEYS.join(', ')})`
      : 'OK'
  return {
    accountSid: !sid ? 'no definido' : sid.length < 30 ? 'formato incorrecto' : 'OK',
    authToken: !token ? 'no definido' : 'OK',
    whatsappNumber,
    whatsappUsedKey,
    ok: Boolean(sid && token && wa),
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

export const SMS_TEMPLATES = [
  { id: 'otp', label: 'OTP / Código', message: 'Tu código Bear Beat: 123456. Válido 10 min.' },
  { id: 'bienvenida', label: 'Bienvenida', message: '¡Hola! Gracias por comprar Bear Beat. Tu acceso está listo en la app.' },
  { id: 'recordatorio', label: 'Recordatorio', message: 'Bear Beat: no olvides completar tu pago para activar tu pack.' },
] as const

export const WHATSAPP_TEMPLATES = [
  { id: 'bienvenida', label: 'Bienvenida', message: '¡Hola! Gracias por comprar Bear Beat. Tu acceso está listo.' },
  { id: 'recordatorio', label: 'Recordatorio', message: 'Bear Beat: te recordamos completar tu pago para activar tu pack.' },
  { id: 'soporte', label: 'Soporte', message: 'Hola, somos Bear Beat. ¿En qué podemos ayudarte?' },
] as const

export async function GET(req: NextRequest) {
  const ok = await isAdmin(req)
  if (!ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const smsDiag = getBrevoSmsConfigDiagnostic()
  const whatsappDiag = getTwilioWhatsAppDiagnostic()

  return NextResponse.json({
    sms: {
      configured: isBrevoSmsConfigured(),
      diagnostic: { BREVO_API_KEY: smsDiag.apiKey, BREVO_SMS_SENDER: smsDiag.sender },
    },
    whatsapp: {
      configured: whatsappDiag.ok,
      diagnostic: {
        TWILIO_ACCOUNT_SID: whatsappDiag.accountSid,
        TWILIO_AUTH_TOKEN: whatsappDiag.authToken,
        TWILIO_WHATSAPP_NUMBER: whatsappDiag.whatsappNumber,
        whatsappUsedKey: whatsappDiag.whatsappUsedKey,
      },
    },
    sms_templates: SMS_TEMPLATES,
    whatsapp_templates: WHATSAPP_TEMPLATES,
  })
}
