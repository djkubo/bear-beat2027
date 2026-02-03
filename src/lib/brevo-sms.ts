/**
 * Brevo (ex Sendinblue) – SMS transaccionales
 * Usamos la API v3: POST https://api.brevo.com/v3/transactionalSMS/send
 * En el panel de Brevo (SMS → Configuración) el ejemplo en PHP usa la API antigua (Mailin);
 * la clave que necesitas es la "Clave API" (formato xkeysib-...), no la del ejemplo PHP.
 * Variables: BREVO_API_KEY, BREVO_SMS_SENDER. Opcional: BREVO_SMS_WEBHOOK_URL para seguimiento.
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY || process.env.BREVO_SMS_API_KEY || ''
const BREVO_SMS_SENDER = (process.env.BREVO_SMS_SENDER || 'BearBeat').trim().slice(0, 11) // máx 11 caracteres alfanumérico
const BREVO_SMS_WEBHOOK_URL = (process.env.BREVO_SMS_WEBHOOK_URL || '').trim() // opcional: callback para estado envío/entrega

export function isBrevoSmsConfigured(): boolean {
  return BREVO_API_KEY.length >= 20 && BREVO_API_KEY.startsWith('xkeysib-')
}

/**
 * Normaliza número para Brevo: debe ser E.164 (ej. +5215512345678).
 */
function toE164(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (phone.startsWith('+')) return phone
  if (cleaned.startsWith('52')) return `+${cleaned}`
  return `+${cleaned}`
}

export interface SendBrevoSmsResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envía un SMS transaccional vía Brevo.
 * Opcional: tag (ej. "otp", "welcome") y webUrl para recibir notificaciones de envío/entrega en tu backend.
 */
export async function sendBrevoSms(
  recipient: string,
  content: string,
  sender?: string,
  options?: { tag?: string; webUrl?: string }
): Promise<SendBrevoSmsResult> {
  if (!isBrevoSmsConfigured()) {
    return { success: false, error: 'Brevo SMS not configured' }
  }

  const to = toE164(recipient)
  const from = (sender || BREVO_SMS_SENDER || 'BearBeat').slice(0, 11)
  const body: Record<string, string> = {
    sender: from,
    recipient: to,
    content,
  }
  if (options?.tag) body.tag = options.tag.slice(0, 50)
  const webUrl = options?.webUrl || (BREVO_SMS_WEBHOOK_URL || '').trim()
  if (webUrl) body.webUrl = webUrl

  try {
    const res = await fetch('https://api.brevo.com/v3/transactionalSMS/send', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({}))
    if (res.ok && (data.messageId ?? data.reference)) {
      return {
        success: true,
        messageId: String(data.messageId ?? data.reference ?? ''),
      }
    }
    const errMsg = data.message ?? data.error ?? `HTTP ${res.status}`
    return { success: false, error: errMsg }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e)
    return { success: false, error: err }
  }
}

/** Alias para uso tipo sendSms(phone, body) en copy de Neuroventas */
export const sendSms = sendBrevoSms

/** Re-export: email transaccional (Brevo SMTP) para credenciales / ofertas */
export { sendEmail } from './brevo-email'
