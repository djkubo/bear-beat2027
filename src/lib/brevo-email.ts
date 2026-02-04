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

/** Diagnóstico para admin: qué falta o falla (sin revelar valores). */
export function getBrevoConfigDiagnostic(): { apiKey: string; senderEmail: string; ok: boolean } {
  const apiKey =
    !BREVO_API_KEY || BREVO_API_KEY.length === 0
      ? 'no definida'
      : BREVO_API_KEY.length < 20
        ? `muy corta (${BREVO_API_KEY.length} caracteres, mínimo 20)`
        : 'OK'
  const senderEmail =
    !BREVO_SENDER_EMAIL || BREVO_SENDER_EMAIL.length === 0
      ? 'no definida'
      : !BREVO_SENDER_EMAIL.includes('@')
        ? 'inválida (debe contener @)'
        : 'OK'
  return {
    apiKey,
    senderEmail,
    ok: apiKey === 'OK' && senderEmail === 'OK',
  }
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
  subject?: string
}): Promise<SendWelcomeEmailResult> {
  if (!isBrevoEmailConfigured()) {
    return { success: false, error: 'Brevo email not configured' }
  }

  const displayName = (params.name || params.to.split('@')[0] || 'Cliente').trim()
  const loginUrl = params.loginUrl || (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') + '/login'
  const subject = params.subject || 'Bear Beat – Tu acceso está listo'

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #0ea5e9;">🔓 Tus accesos están listos</h2>
  <p>Hola <strong>${escapeHtml(displayName)}</strong>,</p>
  <p>Tu pago se ha confirmado. Aquí tienes tus credenciales para el <strong>Pack Video Remixes 2026</strong>:</p>
  <table style="width: 100%; border-collapse: collapse; background: #f1f5f9; border-radius: 8px; margin: 16px 0;">
    <tr><td style="padding: 12px 16px;">
      <strong>Email:</strong> ${escapeHtml(params.to)}<br>
      <strong>Contraseña:</strong> <code style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">${escapeHtml(params.password)}</code>
    </td></tr>
  </table>
  <p><a href="${escapeHtml(loginUrl)}" style="display: inline-block; background: #0ea5e9; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">Entrar a mi cuenta →</a></p>
  <p style="color: #64748b; font-size: 14px;">Guarda este correo. Si olvidas tu contraseña, restablecela desde la página de login.</p>
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
        subject,
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

/**
 * Envía un email transaccional con HTML libre (Neuroventas / copy agresivo).
 * Para credenciales de acceso, ofertas, etc.
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  options?: { name?: string; tags?: string[] }
): Promise<SendWelcomeEmailResult> {
  if (!isBrevoEmailConfigured()) {
    return { success: false, error: 'Brevo email not configured' }
  }
  const displayName = (options?.name || to.split('@')[0] || 'Cliente').trim()
  const textContent = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
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
        to: [{ email: to, name: displayName }],
        subject,
        htmlContent,
        textContent,
        tags: options?.tags || ['transactional'],
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

/**
 * Plantilla "Modo Bestia": email de bienvenida al registrarse (cuenta nueva).
 * Se envía desde api/auth/create-user al crear usuario.
 */
export async function sendWelcomeRegistroEmail(params: {
  to: string
  name?: string
}): Promise<SendTransactionalEmailResult> {
  if (!isBrevoEmailConfigured()) {
    return { success: false, error: 'Brevo email not configured' }
  }
  const displayName = (params.name || params.to.split('@')[0] || 'DJ').trim().replace(/[<>"&]/g, '')
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  const subject = '🔥 ¡Bienvenido a la Élite! Tu acceso a Bear Beat'
  const welcomeHtml = `
<div style="font-family: 'Arial', sans-serif; background-color: #000000; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border: 1px solid #333; border-radius: 12px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #00f0ff; text-transform: uppercase; font-size: 32px; margin: 0; letter-spacing: -1px;">BEAR<span style="color: #ffffff;">BEAT</span></h1>
    <p style="color: #666; font-size: 12px; letter-spacing: 2px; margin-top: 5px;">THE PRO DJ TOOLKIT</p>
  </div>
  <div style="background-color: #111; padding: 30px; border-radius: 8px; border-left: 4px solid #00f0ff;">
    <h2 style="margin-top: 0; font-size: 24px;">¡Ya estás dentro, ${escapeHtml(displayName)}! 🎧</h2>
    <p style="color: #ccc; line-height: 1.6; font-size: 16px;">
      Acabas de dar el paso que separa a los aficionados de los profesionales. Bienvenido a la plataforma definitiva de Video Remixes.
    </p>
    <p style="color: #ccc; line-height: 1.6; font-size: 16px;">
      Tu cuenta está activa y lista para detonar. No pierdas tiempo.
    </p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="${appUrl}/dashboard" style="background-color: #00f0ff; color: #000000; padding: 18px 40px; text-decoration: none; font-weight: 900; text-transform: uppercase; border-radius: 50px; display: inline-block; font-size: 18px; box-shadow: 0 0 20px rgba(0, 240, 255, 0.4);">
        ACCEDER A MI PANEL 🚀
      </a>
    </div>
  </div>
  <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
    <p style="margin: 0;">Bear Beat · Video Remixes para DJs</p>
  </div>
</div>
  `.trim()
  return sendEmail(params.to, subject, welcomeHtml, {
    name: params.name || displayName,
    tags: ['welcome', 'registro', 'elite'],
  })
}

/**
 * Email de confirmación de pago "Modo Élite" (dark/neon).
 * Enviar cuando se confirma el pago (Stripe webhook o complete-purchase/activate).
 */
export async function sendPaymentConfirmationEmail(params: {
  to: string
  userName?: string
  amount: number | string
  orderId: string
}): Promise<SendTransactionalEmailResult> {
  if (!isBrevoEmailConfigured()) {
    return { success: false, error: 'Brevo email not configured' }
  }
  const userName = (params.userName || params.to.split('@')[0] || 'Cliente').trim()
  const amountStr = typeof params.amount === 'number' ? String(params.amount) : params.amount
  const orderId = (params.orderId || 'CONFIRMADA').trim()
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  const subject = `🐺 Acceso Liberado: Tu Orden #${orderId}`
  const paymentHtml = `
  <div style="font-family: 'Arial', sans-serif; background-color: #050505; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border: 1px solid #333; border-radius: 12px;">
    <div style="text-align: center; border-bottom: 1px solid #222; padding-bottom: 20px; margin-bottom: 30px;">
      <h1 style="color: #00f0ff; text-transform: uppercase; font-size: 28px; margin: 0; letter-spacing: -1px;">PAGO <span style="color: #ffffff;">CONFIRMADO</span></h1>
      <p style="color: #444; font-size: 10px; letter-spacing: 3px; margin-top: 5px; text-transform: uppercase;">Transacción Segura • Bear Beat</p>
    </div>
    <div style="background-color: #111; padding: 30px; border-radius: 8px; border-left: 4px solid #00ff88;">
      <h2 style="margin-top: 0; font-size: 22px; color: #fff;">Todo listo, ${escapeHtml(userName)}. 💸</h2>
      <p style="color: #ccc; line-height: 1.6; font-size: 16px;">
        Tu inversión de <strong>$${escapeHtml(amountStr)}</strong> ha sido recibida correctamente. No compraste solo música, compraste tiempo y reputación.
      </p>
      <p style="color: #ccc; line-height: 1.6; font-size: 16px;">
        Tu cuenta tiene luz verde para descargas ilimitadas. Haz que valga la pena.
      </p>
      <div style="background: #000; padding: 15px; margin: 20px 0; border-radius: 6px; border: 1px solid #222; font-family: monospace; color: #888;">
        <p style="margin: 5px 0;">ID REF: <span style="color: #fff;">${escapeHtml(orderId)}</span></p>
        <p style="margin: 5px 0;">ESTADO: <span style="color: #00ff88;">APROBADO ✅</span></p>
      </div>
      <div style="text-align: center; margin: 40px 0;">
        <a href="${appUrl}/dashboard" style="background-color: #00ff88; color: #000000; padding: 18px 40px; text-decoration: none; font-weight: 900; text-transform: uppercase; border-radius: 50px; display: inline-block; font-size: 18px; box-shadow: 0 0 25px rgba(0, 255, 136, 0.4);">
          IR A MI DASHBOARD ⚡
        </a>
      </div>
    </div>
    <div style="margin-top: 30px; text-align: center; color: #444; font-size: 12px;">
      <p>Este correo sirve como comprobante de pago digital.</p>
      <p>Bear Beat 2027 | The Elite DJ Network</p>
    </div>
  </div>
  `.trim()
  return sendEmail(params.to, subject, paymentHtml, {
    name: userName,
    tags: ['payment', 'confirmation', 'elite'],
  })
}

/** Evento de actividad transaccional Brevo (API v3/smtp/statistics/events) */
export interface BrevoEmailEvent {
  date: string
  email: string
  event: string
  messageId?: string
  from?: string
  reason?: string
  tag?: string
  templateId?: number
}

/**
 * Tags que usa este proyecto al enviar (bienvenida, recuperación, transaccional).
 * Sirve para filtrar en la API de estadísticas y mostrar solo nuestros envíos.
 */
export const PROJECT_EMAIL_TAGS = [
  'welcome',
  'credentials',
  'registro',
  'elite',
  'payment',
  'confirmation',
  'payment_failed',
  'recovery',
  'transactional',
] as const

/** Nombre de plantilla por tag (para la UI) */
export const TEMPLATE_LABEL_BY_TAG: Record<string, string> = {
  welcome: 'Bienvenida',
  credentials: 'Bienvenida',
  registro: 'Bienvenida registro',
  elite: 'Bienvenida registro',
  payment: 'Confirmación pago',
  confirmation: 'Confirmación pago',
  payment_failed: 'Recuperación pago',
  recovery: 'Recuperación pago',
  transactional: 'Transaccional',
}

/** Agrupa tags por plantilla para filtros */
export const TEMPLATE_TO_TAGS: Record<string, string[]> = {
  bienvenida: ['welcome', 'credentials'],
  bienvenida_registro: ['welcome', 'registro', 'elite'],
  confirmacion_pago: ['payment', 'confirmation'],
  recuperacion: ['payment_failed', 'recovery'],
  transaccional: ['transactional'],
}

/**
 * Obtiene la actividad de emails transaccionales desde Brevo (últimos N días).
 * Si se pasan tags, la API de Brevo filtra por esos tags (solo eventos con al menos uno de esos tags).
 */
export async function getBrevoEmailEvents(params: {
  days?: number
  startDate?: string
  endDate?: string
  limit?: number
  tags?: string[]
}): Promise<{ events: BrevoEmailEvent[]; error?: string }> {
  if (!BREVO_API_KEY || BREVO_API_KEY.length < 20) {
    return { events: [], error: 'Brevo not configured' }
  }
  const limit = Math.min(5000, Math.max(1, params.limit ?? 2500))
  const url = new URL('https://api.brevo.com/v3/smtp/statistics/events')
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('sort', 'desc')
  if (params.startDate && params.endDate) {
    url.searchParams.set('startDate', params.startDate)
    url.searchParams.set('endDate', params.endDate)
  } else {
    url.searchParams.set('days', String(params.days ?? 30))
  }
  if (params.tags?.length) {
    params.tags.forEach((tag) => url.searchParams.append('tags', tag))
  }
  try {
    const res = await fetch(url.toString(), {
      headers: { accept: 'application/json', 'api-key': BREVO_API_KEY },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { events: [], error: data.message ?? data.code ?? `HTTP ${res.status}` }
    }
    const events = Array.isArray(data.events) ? data.events : []
    return { events }
  } catch (e) {
    return { events: [], error: e instanceof Error ? e.message : String(e) }
  }
}
