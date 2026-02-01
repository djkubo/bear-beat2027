import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js'

/**
 * Normaliza un número de teléfono al formato internacional
 */
export function normalizePhoneNumber(phone: string, country: CountryCode = 'MX'): string | null {
  try {
    // Limpiar el número (quitar espacios, guiones, paréntesis)
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
    
    // Parsear el número
    const phoneNumber = parsePhoneNumber(cleaned, country)
    
    if (phoneNumber && phoneNumber.isValid()) {
      // Retornar en formato E.164 (ej: +525512345678)
      return phoneNumber.number
    }
    
    return null
  } catch (error) {
    console.error('Error parsing phone:', error)
    return null
  }
}

/**
 * Valida si un número de teléfono es válido
 */
export function validatePhoneNumber(phone: string, country?: CountryCode): boolean {
  try {
    return isValidPhoneNumber(phone, country)
  } catch {
    return false
  }
}

/**
 * Formatea un número de teléfono para mostrar (con espacios y guiones)
 */
export function formatPhoneNumber(phone: string, country: CountryCode = 'MX'): string {
  try {
    const phoneNumber = parsePhoneNumber(phone, country)
    
    if (phoneNumber) {
      // Formato nacional (ej: 55 1234 5678)
      return phoneNumber.formatNational()
    }
    
    return phone
  } catch {
    return phone
  }
}

/**
 * Detecta el país desde un número de teléfono
 */
export function getCountryFromPhone(phone: string): CountryCode | undefined {
  try {
    const phoneNumber = parsePhoneNumber(phone)
    return phoneNumber?.country
  } catch {
    return undefined
  }
}
