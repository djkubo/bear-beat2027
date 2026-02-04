/**
 * Plantillas para SMS (Brevo) y WhatsApp (Twilio). Compartidas por las rutas de admin.
 */

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
