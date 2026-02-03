/**
 * Brevo – Emails transaccionales (API v3 SMTP)
 * POST https://api.brevo.com/v3/smtp/email
 * Env: BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME
 */

const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').trim()
const BREVO_SENDER_EMAIL = (process.env.BREVO_SENDER_EMAIL || '').trim()
const BREVO_SENDER_NAME = (process.env.BREVO_SENDER_NAME || 'Bear Beat').trim()

export function isBrevoEmailConfigured(): boolean {
  return Boolean(
    BREVO_API_KEY.length >= 20 &&
    BREVO_SENDER_EMAIL.includes('@')
  )
}

export interface SendWelcomeEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envía correo de bienvenida con credenciales (email + contraseña temporal).
 * Llamar desde el webhook de Stripe justo después de crear el usuario.
 */
export async function sendWelcomeEmail(params: {
  to: string
  name?: string
  password: string
  loginUrl?: string
}): Promise<SendWelcomeEmailResult> {
  if (!isBrevoEmailConfigured()) {
    return { success: false, error: 'Brevo email not configured' }
  }

  const displayName = (params.name || params.to.split('@')[0] || 'Cliente').trim()
  const loginUrl = params.loginUrl || (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') + '/login'

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #0ea5e9;">¡Bienvenido a Bear Beat!</h2>
  <p>Hola <strong>${escapeHtml(displayName)}</strong>,</p>
  <p>Tu pago se ha confirmado y tu acceso ya está activo. Aquí tienes tus credenciales para entrar:</p>
  <table style="width: 100%; border-collapse: collapse; background: #f1f5f9; border-radius: 8px; margin: 16px 0;">
    <tr><td style="padding: 12px 16px;">
      <strong>Email:</strong> ${escapeHtml(params.to)}<br>
      <strong>Contraseña:</strong> <code style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">${escapeHtml(params.password)}</code>
    </td></tr>
  </table>
  <p><a href="${escapeHtml(loginUrl)}" style="display: inline-block; background: #0ea5e9; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">Entrar a mi cuenta →</a></p>
  <p style="color: #64748b; font-size: 14px;">Guarda este correo. Si olvidas tu contraseña, puedes restablecerla desde la página de inicio de sesión.</p>
  <p>— El equipo Bear Beat</p>
</body>
</html>
`.trim()

  const textContent = [
    `¡Bienvenido a Bear Beat!`,
    ``,
    `Hola ${displayName},`,
    `Tu pago se ha confirmado. Tus credenciales:`,
    ``,
    `Email: ${params.to}`,
    `Contraseña: ${params.password}`,
    ``,
    `Entra aquí: ${loginUrl}`,
    ``,
    `— El equipo Bear Beat`,
  ].join('\n')

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        to: [{ email: params.to, name: displayName }],
        subject: 'Bear Beat – Tu acceso está listo',
        htmlContent,
        textContent,
        tags: ['welcome', 'credentials'],
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (res.ok && (data.messageId ?? data.message_id)) {
      return {
        success: true,
        messageId: String(data.messageId ?? data.message_id ?? ''),
      }
    }
    const errMsg = data.message ?? data.code ?? `HTTP ${res.status}`
    return { success: false, error: errMsg }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e)
    return { success: false, error: err }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Resultado genérico para envío de email */
export interface SendTransactionalEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Email de recuperación cuando el pago falla (payment_intent.payment_failed).
 * Mensaje directo: "Tu pago falló, pero te guardé los videos 10 mins más. Intenta con otra tarjeta aquí."
 */
export async function sendPaymentFailedRecoveryEmail(params: {
  to: string
  name?: string
  recoveryUrl: string
}): Promise<SendTransactionalEmailResult> {
  if (!isBrevoEmailConfigured()) {
    return { success: false, error: 'Brevo email not configured' }
  }

  const displayName = (params.name || params.to.split('@')[0] || 'DJ').trim()

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #0ea5e9;">Bear Beat – Tu pago no pasó</h2>
  <p>Hola <strong>${escapeHtml(displayName)}</strong>,</p>
  <p>Tu intento de pago no se completó, pero <strong>te guardamos los videos 10 minutos más</strong>.</p>
  <p>Puedes intentar con otra tarjeta, OXXO o SPEI desde el mismo enlace:</p>
  <p><a href="${escapeHtml(params.recoveryUrl)}" style="display: inline-block; background: #0ea5e9; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">Intentar de nuevo →</a></p>
  <p style="color: #64748b; font-size: 14px;">Si el problema continúa, responde este correo y te ayudamos.</p>
  <p>— El equipo Bear Beat</p>
</body>
</html>
`.trim()

  const textContent = [
    `Bear Beat – Tu pago no pasó`,
    ``,
    `Hola ${displayName},`,
    `Tu intento de pago no se completó. Te guardamos los videos 10 minutos más.`,
    `Intenta con otra tarjeta aquí: ${params.recoveryUrl}`,
    ``,
    `— Bear Beat`,
  ].join('\n')

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
        to: [{ email: params.to, name: displayName }],
        subject: 'Bear Beat: Tu pago falló – Intenta de nuevo (te guardamos el precio 10 min)',
        htmlContent,
        textContent,
        tags: ['payment_failed', 'recovery'],
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && (data.messageId ?? data.message_id)) {
      return { success: true, messageId: String(data.messageId ?? data.message_id ?? '') }
    }
    return { success: false, error: data.message ?? data.code ?? `HTTP ${res.status}` }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}
