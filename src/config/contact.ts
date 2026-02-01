// ==========================================
// CONFIGURACIÓN DE CONTACTO - Bear Beat
// ==========================================
// Cambia estos valores para producción

export const CONTACT_CONFIG = {
  // WhatsApp de soporte (formato: código de país + número sin espacios)
  // Ejemplo México: 5215512345678 (52 = código, 1 = ciudad, resto = número)
  whatsapp: {
    number: '5215512345678', // ← CAMBIAR EN PRODUCCIÓN
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
}

// Generar URL de WhatsApp con mensaje
export function getWhatsAppUrl(customMessage?: string): string {
  const message = encodeURIComponent(customMessage || CONTACT_CONFIG.whatsapp.defaultMessage)
  return `https://wa.me/${CONTACT_CONFIG.whatsapp.number}?text=${message}`
}

// Generar URL de Messenger
export function getMessengerUrl(): string {
  return `https://m.me/${CONTACT_CONFIG.messenger.pageId}`
}
