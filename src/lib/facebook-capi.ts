/**
 * Facebook Conversions API (CAPI) - Server-Side Tracking
 * 
 * Esta implementación trabaja en conjunto con el Meta Pixel para:
 * - Tracking redundante (cliente + servidor)
 * - Deduplicación perfecta usando event_id
 * - Mejor atribución de conversiones
 * - Funciona aunque el usuario tenga bloqueadores de ads
 * 
 * Documentación: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import crypto from 'crypto'

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1325763147585869'
const ACCESS_TOKEN = process.env.FACEBOOK_CAPI_ACCESS_TOKEN || ''
const API_VERSION = 'v18.0'
const CAPI_URL = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`

// ==========================================
// UTILIDADES DE HASHING
// Facebook requiere que los datos de usuario estén hasheados con SHA256
// ==========================================

/**
 * Hashea un valor con SHA256 (requerido por Facebook)
 */
function hashValue(value: string): string {
  if (!value) return ''
  // Normalizar: lowercase, trim espacios
  const normalized = value.toLowerCase().trim()
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

/**
 * Hashea un email
 */
function hashEmail(email: string): string {
  if (!email) return ''
  return hashValue(email.toLowerCase().trim())
}

/**
 * Hashea un teléfono (debe estar en formato E.164, sin +)
 */
function hashPhone(phone: string): string {
  if (!phone) return ''
  // Remover + y espacios, solo números
  const cleaned = phone.replace(/[^0-9]/g, '')
  return hashValue(cleaned)
}

/**
 * Hashea un nombre
 */
function hashName(name: string): string {
  if (!name) return ''
  return hashValue(name.toLowerCase().trim())
}

// ==========================================
// TIPOS
// ==========================================

export interface FacebookUserData {
  // Identificadores de usuario (al menos uno requerido)
  email?: string          // Se hashea automáticamente
  phone?: string          // Se hashea automáticamente
  firstName?: string      // Se hashea automáticamente
  lastName?: string       // Se hashea automáticamente
  
  // Datos adicionales para mejor matching
  dateOfBirth?: string    // YYYYMMDD
  gender?: 'm' | 'f'
  city?: string
  state?: string
  zipCode?: string
  country?: string        // Código ISO 2 letras (MX, US, etc)
  
  // Identificadores de Facebook (si disponibles)
  fbp?: string            // Cookie _fbp del pixel
  fbc?: string            // Cookie _fbc del pixel (click ID)
  
  // IP y User Agent para mejor matching
  clientIpAddress?: string
  clientUserAgent?: string
  
  // External ID (tu ID de usuario interno)
  externalId?: string
}

export interface FacebookCustomData {
  // Datos de la transacción
  value?: number
  currency?: string       // MXN, USD, etc
  
  // Datos del contenido
  contentName?: string
  contentCategory?: string
  contentIds?: string[]
  contentType?: string    // 'product', 'product_group', etc
  contents?: Array<{
    id: string
    quantity: number
    item_price?: number
  }>
  
  // Otros datos
  numItems?: number
  orderId?: string
  searchString?: string
  status?: string
  
  // Datos personalizados adicionales
  [key: string]: any
}

export interface FacebookEvent {
  eventName: string
  eventTime?: number      // Unix timestamp en segundos
  eventId: string         // CRÍTICO para deduplicación con Pixel
  eventSourceUrl?: string
  userData: FacebookUserData
  customData?: FacebookCustomData
  actionSource?: 'website' | 'app' | 'email' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other'
  optOut?: boolean
}

interface CAPIResponse {
  events_received?: number
  messages?: string[]
  fbtrace_id?: string
  error?: {
    message: string
    type: string
    code: number
    fbtrace_id: string
  }
}

// ==========================================
// FUNCIÓN PRINCIPAL PARA ENVIAR EVENTOS
// ==========================================

/**
 * Envía un evento a Facebook Conversions API
 * 
 * @param event - El evento a enviar
 * @returns Respuesta de la API
 */
export async function sendEventToCAPI(event: FacebookEvent): Promise<CAPIResponse> {
  if (!ACCESS_TOKEN) {
    console.warn('FACEBOOK_CAPI_ACCESS_TOKEN not set, skipping CAPI')
    return { events_received: 0, messages: ['No access token configured'] }
  }
  
  try {
    // Construir el payload
    const payload = buildEventPayload(event)
    
    console.log('Facebook CAPI: Sending event', {
      event_name: event.eventName,
      event_id: event.eventId,
    })
    
    const response = await fetch(`${CAPI_URL}?access_token=${ACCESS_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: [payload] }),
    })
    
    const result: CAPIResponse = await response.json()
    
    if (result.error) {
      console.error('Facebook CAPI Error:', result.error)
      return result
    }
    
    console.log('Facebook CAPI: Event sent successfully', {
      events_received: result.events_received,
      event_name: event.eventName,
      event_id: event.eventId,
    })
    
    return result
  } catch (error) {
    console.error('Facebook CAPI: Failed to send event', error)
    return {
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'network_error',
        code: 0,
        fbtrace_id: '',
      },
    }
  }
}

/**
 * Envía múltiples eventos a Facebook CAPI (batch)
 */
export async function sendEventsToCAPI(events: FacebookEvent[]): Promise<CAPIResponse> {
  if (!ACCESS_TOKEN) {
    console.warn('FACEBOOK_CAPI_ACCESS_TOKEN not set, skipping CAPI')
    return { events_received: 0, messages: ['No access token configured'] }
  }
  
  try {
    const payloads = events.map(event => buildEventPayload(event))
    
    console.log('Facebook CAPI: Sending batch of', events.length, 'events')
    
    const response = await fetch(`${CAPI_URL}?access_token=${ACCESS_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: payloads }),
    })
    
    const result: CAPIResponse = await response.json()
    
    if (result.error) {
      console.error('Facebook CAPI Batch Error:', result.error)
    } else {
      console.log('Facebook CAPI: Batch sent successfully', {
        events_received: result.events_received,
      })
    }
    
    return result
  } catch (error) {
    console.error('Facebook CAPI: Failed to send batch', error)
    return {
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'network_error',
        code: 0,
        fbtrace_id: '',
      },
    }
  }
}

// ==========================================
// CONSTRUCCIÓN DEL PAYLOAD
// ==========================================

function buildEventPayload(event: FacebookEvent): any {
  const payload: any = {
    event_name: event.eventName,
    event_time: event.eventTime || Math.floor(Date.now() / 1000),
    event_id: event.eventId, // CRÍTICO para deduplicación
    action_source: event.actionSource || 'website',
    user_data: buildUserData(event.userData),
  }
  
  // URL del evento (requerido para website)
  if (event.eventSourceUrl) {
    payload.event_source_url = event.eventSourceUrl
  }
  
  // Datos personalizados
  if (event.customData) {
    payload.custom_data = buildCustomData(event.customData)
  }
  
  // Opt out (para usuarios que no quieren ser trackeados)
  if (event.optOut) {
    payload.opt_out = true
  }
  
  return payload
}

function buildUserData(userData: FacebookUserData): any {
  const data: any = {}
  
  // Email (hasheado)
  if (userData.email) {
    data.em = [hashEmail(userData.email)]
  }
  
  // Teléfono (hasheado)
  if (userData.phone) {
    data.ph = [hashPhone(userData.phone)]
  }
  
  // Nombre (hasheado)
  if (userData.firstName) {
    data.fn = [hashName(userData.firstName)]
  }
  
  // Apellido (hasheado)
  if (userData.lastName) {
    data.ln = [hashName(userData.lastName)]
  }
  
  // Fecha de nacimiento (hasheado)
  if (userData.dateOfBirth) {
    data.db = [hashValue(userData.dateOfBirth)]
  }
  
  // Género (hasheado)
  if (userData.gender) {
    data.ge = [hashValue(userData.gender)]
  }
  
  // Ciudad (hasheado)
  if (userData.city) {
    data.ct = [hashName(userData.city)]
  }
  
  // Estado (hasheado)
  if (userData.state) {
    data.st = [hashName(userData.state)]
  }
  
  // Código postal (hasheado)
  if (userData.zipCode) {
    data.zp = [hashValue(userData.zipCode)]
  }
  
  // País (hasheado)
  if (userData.country) {
    data.country = [hashValue(userData.country.toLowerCase())]
  }
  
  // Cookie _fbp (NO hashear)
  if (userData.fbp) {
    data.fbp = userData.fbp
  }
  
  // Cookie _fbc (NO hashear)
  if (userData.fbc) {
    data.fbc = userData.fbc
  }
  
  // IP del cliente (NO hashear)
  if (userData.clientIpAddress) {
    data.client_ip_address = userData.clientIpAddress
  }
  
  // User Agent (NO hashear)
  if (userData.clientUserAgent) {
    data.client_user_agent = userData.clientUserAgent
  }
  
  // External ID (hasheado)
  if (userData.externalId) {
    data.external_id = [hashValue(userData.externalId)]
  }
  
  return data
}

function buildCustomData(customData: FacebookCustomData): any {
  const data: any = {}
  
  if (customData.value !== undefined) {
    data.value = customData.value
  }
  
  if (customData.currency) {
    data.currency = customData.currency.toUpperCase()
  }
  
  if (customData.contentName) {
    data.content_name = customData.contentName
  }
  
  if (customData.contentCategory) {
    data.content_category = customData.contentCategory
  }
  
  if (customData.contentIds && customData.contentIds.length > 0) {
    data.content_ids = customData.contentIds
  }
  
  if (customData.contentType) {
    data.content_type = customData.contentType
  }
  
  if (customData.contents && customData.contents.length > 0) {
    data.contents = customData.contents
  }
  
  if (customData.numItems !== undefined) {
    data.num_items = customData.numItems
  }
  
  if (customData.orderId) {
    data.order_id = customData.orderId
  }
  
  if (customData.searchString) {
    data.search_string = customData.searchString
  }
  
  if (customData.status) {
    data.status = customData.status
  }
  
  // Agregar cualquier dato personalizado adicional
  for (const key of Object.keys(customData)) {
    if (!data[key] && customData[key] !== undefined) {
      data[key] = customData[key]
    }
  }
  
  return data
}

// ==========================================
// FUNCIONES DE ALTO NIVEL PARA BEAR BEAT
// ==========================================

/**
 * Genera un event_id único para deduplicación
 * Este mismo ID debe enviarse al Pixel y a CAPI
 */
export function generateEventId(): string {
  return `bb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Obtiene las cookies de Facebook del request
 */
export function getFacebookCookies(cookieHeader: string | null): { fbp?: string; fbc?: string } {
  if (!cookieHeader) return {}
  
  const cookies: Record<string, string> = {}
  cookieHeader.split(';').forEach(cookie => {
    const [key, value] = cookie.split('=').map(s => s.trim())
    if (key && value) cookies[key] = value
  })
  
  return {
    fbp: cookies._fbp,
    fbc: cookies._fbc,
  }
}

// Eventos predefinidos para Bear Beat

export async function capiTrackPageView(data: {
  eventId: string
  url: string
  userData: FacebookUserData
}) {
  return sendEventToCAPI({
    eventName: 'PageView',
    eventId: data.eventId,
    eventSourceUrl: data.url,
    userData: data.userData,
  })
}

export async function capiTrackViewContent(data: {
  eventId: string
  url: string
  userData: FacebookUserData
  contentName: string
  contentIds: string[]
  value?: number
  currency?: string
}) {
  return sendEventToCAPI({
    eventName: 'ViewContent',
    eventId: data.eventId,
    eventSourceUrl: data.url,
    userData: data.userData,
    customData: {
      contentName: data.contentName,
      contentIds: data.contentIds,
      contentType: 'product',
      value: data.value,
      currency: data.currency || 'MXN',
    },
  })
}

export async function capiTrackAddToCart(data: {
  eventId: string
  url: string
  userData: FacebookUserData
  contentName: string
  contentIds: string[]
  value: number
  currency?: string
}) {
  return sendEventToCAPI({
    eventName: 'AddToCart',
    eventId: data.eventId,
    eventSourceUrl: data.url,
    userData: data.userData,
    customData: {
      contentName: data.contentName,
      contentIds: data.contentIds,
      contentType: 'product',
      value: data.value,
      currency: data.currency || 'MXN',
      numItems: 1,
    },
  })
}

export async function capiTrackInitiateCheckout(data: {
  eventId: string
  url: string
  userData: FacebookUserData
  contentName?: string
  contentIds: string[]
  value: number
  currency?: string
}) {
  return sendEventToCAPI({
    eventName: 'InitiateCheckout',
    eventId: data.eventId,
    eventSourceUrl: data.url,
    userData: data.userData,
    customData: {
      contentName: data.contentName,
      contentIds: data.contentIds,
      contentType: 'product',
      value: data.value,
      currency: data.currency || 'MXN',
      numItems: 1,
    },
  })
}

export async function capiTrackAddPaymentInfo(data: {
  eventId: string
  url: string
  userData: FacebookUserData
  contentIds: string[]
  value: number
  currency?: string
}) {
  return sendEventToCAPI({
    eventName: 'AddPaymentInfo',
    eventId: data.eventId,
    eventSourceUrl: data.url,
    userData: data.userData,
    customData: {
      contentIds: data.contentIds,
      contentType: 'product',
      value: data.value,
      currency: data.currency || 'MXN',
    },
  })
}

export async function capiTrackPurchase(data: {
  eventId: string
  url: string
  userData: FacebookUserData
  contentName?: string
  contentIds: string[]
  value: number
  currency?: string
  orderId?: string
}) {
  return sendEventToCAPI({
    eventName: 'Purchase',
    eventId: data.eventId,
    eventSourceUrl: data.url,
    userData: data.userData,
    customData: {
      contentName: data.contentName,
      contentIds: data.contentIds,
      contentType: 'product',
      value: data.value,
      currency: data.currency || 'MXN',
      numItems: 1,
      orderId: data.orderId,
    },
  })
}

export async function capiTrackLead(data: {
  eventId: string
  url: string
  userData: FacebookUserData
  contentName?: string
}) {
  return sendEventToCAPI({
    eventName: 'Lead',
    eventId: data.eventId,
    eventSourceUrl: data.url,
    userData: data.userData,
    customData: {
      contentName: data.contentName,
    },
  })
}

export async function capiTrackCompleteRegistration(data: {
  eventId: string
  url: string
  userData: FacebookUserData
  status?: string
}) {
  return sendEventToCAPI({
    eventName: 'CompleteRegistration',
    eventId: data.eventId,
    eventSourceUrl: data.url,
    userData: data.userData,
    customData: {
      status: data.status || 'registered',
    },
  })
}

export async function capiTrackCustomEvent(data: {
  eventName: string
  eventId: string
  url: string
  userData: FacebookUserData
  customData?: FacebookCustomData
}) {
  return sendEventToCAPI({
    eventName: data.eventName,
    eventId: data.eventId,
    eventSourceUrl: data.url,
    userData: data.userData,
    customData: data.customData,
  })
}
