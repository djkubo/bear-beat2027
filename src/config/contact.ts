// ==========================================
// CONFIGURACIÓN DE CONTACTO - Bear Beat
// ==========================================
// Número real: configura NEXT_PUBLIC_WHATSAPP_NUMBER en .env.local (código país + número sin espacios, ej. 5215512345678).

const whatsappNumber = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim()
  ? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER.trim().replace(/\s/g, '')
  : '5215512345678' // fallback solo desarrollo; en producción definir NEXT_PUBLIC_WHATSAPP_NUMBER

export const CONTACT_CONFIG = {
  whatsapp: {
    number: whatsappNumber,
    defaultMessage: 'Hola, necesito ayuda con Bear Beat',
  },

  // Email de soporte
  email: 'soporte@bearbeat.mx',

  // Facebook Messenger (usa NEXT_PUBLIC_MANYCHAT_PAGE_ID si está definido)
  messenger: {
    pageId: (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_MANYCHAT_PAGE_ID) || '104901938679498',
  },

  // Redes sociales
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=100076284276032',
    instagram: 'https://instagram.com/bearbeat.mx', // ← CAMBIAR EN PRODUCCIÓN
  },

  // Grupo VIP de la comunidad (WhatsApp)
  communityWhatsAppGroup: 'https://chat.whatsapp.com/DttyefzzSwuFfxitsck5nK?mode=gi_t',
}

// Generar URL de WhatsApp (solo para Grupo VIP u otros; soporte es por chat/Messenger/Instagram)
export function getWhatsAppUrl(customMessage?: string): string {
  const message = encodeURIComponent(customMessage || CONTACT_CONFIG.whatsapp.defaultMessage)
  return `https://wa.me/${CONTACT_CONFIG.whatsapp.number}?text=${message}`
}

// Generar URL de Messenger (soporte principal)
export function getMessengerUrl(): string {
  return `https://m.me/${CONTACT_CONFIG.messenger.pageId}`
}

// Instagram (soporte)
export function getInstagramUrl(): string {
  return CONTACT_CONFIG.social.instagram
}
