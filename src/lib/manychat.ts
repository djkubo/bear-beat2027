/**
 * ManyChat API Integration
 * Documentación: https://api.manychat.com/swagger
 * 
 * Este servicio permite:
 * - Crear/actualizar suscriptores
 * - Agregar/remover tags
 * - Establecer custom fields
 * - Enviar flujos/automations
 * - Buscar usuarios por email/teléfono
 */

const MANYCHAT_API_URL = 'https://api.manychat.com'
// Siempre usar .trim() para evitar 401 por espacios/saltos al pegar en Render
const getManyChatApiKey = () => (process.env.MANYCHAT_API_KEY || '').trim()
const MANYCHAT_PAGE_ID = process.env.NEXT_PUBLIC_MANYCHAT_PAGE_ID || '104901938679498'

// Headers comunes para todas las peticiones (Bearer con clave sin espacios)
const getHeaders = () => ({
  'Authorization': `Bearer ${getManyChatApiKey()}`,
  'Content-Type': 'application/json',
})

// Tipos
export interface ManyChatSubscriber {
  id: string
  page_id: string
  first_name: string
  last_name: string
  name: string
  email?: string
  phone?: string
  whatsapp_phone?: string
  gender?: string
  profile_pic?: string
  subscribed?: string
  last_interaction?: string
  tags?: ManyChatTag[]
  custom_fields?: ManyChatCustomField[]
}

export interface ManyChatTag {
  id: number
  name: string
}

export interface ManyChatCustomField {
  id: number
  name: string
  type: string
  value: any
}

export interface ManyChatResponse<T> {
  status: 'success' | 'error'
  data?: T
  error?: {
    message: string
    code?: number
  }
}

// ==========================================
// BUSCAR SUSCRIPTORES
// ==========================================

/**
 * Buscar suscriptor por campo del sistema (email, phone, etc)
 */
export async function findSubscriberByField(
  field: 'email' | 'phone' | 'whatsapp_phone',
  value: string
): Promise<ManyChatSubscriber | null> {
  try {
    const response = await fetch(
      `${MANYCHAT_API_URL}/fb/subscriber/findBySystemField?field=${field}&value=${encodeURIComponent(value)}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    )
    
    const result: ManyChatResponse<ManyChatSubscriber[]> = await response.json()
    
    if (result.status === 'success' && result.data && result.data.length > 0) {
      return result.data[0]
    }
    
    return null
  } catch (error) {
    console.error('ManyChat findSubscriberByField error:', error)
    return null
  }
}

/**
 * Obtener info completa de un suscriptor por ID
 */
export async function getSubscriberInfo(subscriberId: string): Promise<ManyChatSubscriber | null> {
  try {
    const response = await fetch(
      `${MANYCHAT_API_URL}/fb/subscriber/getInfo?subscriber_id=${subscriberId}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    )
    
    const result: ManyChatResponse<ManyChatSubscriber> = await response.json()
    
    if (result.status === 'success' && result.data) {
      return result.data
    }
    
    return null
  } catch (error) {
    console.error('ManyChat getSubscriberInfo error:', error)
    return null
  }
}

// ==========================================
// CREAR/ACTUALIZAR SUSCRIPTORES
// ==========================================

export interface CreateSubscriberData {
  phone?: string
  whatsapp_phone?: string
  email?: string
  first_name?: string
  last_name?: string
  has_opt_in_sms?: boolean
  has_opt_in_email?: boolean
  consent_phrase?: string
}

/**
 * Crear un nuevo suscriptor en ManyChat
 * Si ya existe (por email/phone), retorna error 400
 */
export async function createSubscriber(data: CreateSubscriberData): Promise<ManyChatSubscriber | null> {
  try {
    const response = await fetch(
      `${MANYCHAT_API_URL}/fb/subscriber/createSubscriber`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ...data,
          has_opt_in_sms: data.has_opt_in_sms ?? true,
          has_opt_in_email: data.has_opt_in_email ?? true,
          consent_phrase: data.consent_phrase ?? 'Opted in via Bear Beat website',
        }),
      }
    )
    
    const result: ManyChatResponse<ManyChatSubscriber> = await response.json()
    
    if (result.status === 'success' && result.data) {
      console.log('ManyChat: Subscriber created:', result.data.id)
      return result.data
    }
    
    // Si hay error 400 probablemente ya existe
    if (result.error) {
      console.log('ManyChat createSubscriber error:', result.error.message)
    }
    
    return null
  } catch (error) {
    console.error('ManyChat createSubscriber error:', error)
    return null
  }
}

/**
 * Actualizar un suscriptor existente
 */
export async function updateSubscriber(
  subscriberId: string,
  data: Partial<CreateSubscriberData>
): Promise<boolean> {
  try {
    const response = await fetch(
      `${MANYCHAT_API_URL}/fb/subscriber/updateSubscriber`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          subscriber_id: subscriberId,
          ...data,
        }),
      }
    )
    
    const result: ManyChatResponse<any> = await response.json()
    
    if (result.status === 'success') {
      console.log('ManyChat: Subscriber updated:', subscriberId)
      return true
    }
    
    return false
  } catch (error) {
    console.error('ManyChat updateSubscriber error:', error)
    return false
  }
}

/**
 * Crear o actualizar suscriptor (upsert)
 * Busca primero por email o teléfono, si existe actualiza, si no crea
 */
export async function upsertSubscriber(data: CreateSubscriberData): Promise<ManyChatSubscriber | null> {
  try {
    // Buscar por email primero
    let existingSubscriber: ManyChatSubscriber | null = null
    
    if (data.email) {
      existingSubscriber = await findSubscriberByField('email', data.email)
    }
    
    // Si no encontró por email, buscar por teléfono
    if (!existingSubscriber && data.phone) {
      existingSubscriber = await findSubscriberByField('phone', data.phone)
    }
    
    // Si no encontró por teléfono, buscar por WhatsApp
    if (!existingSubscriber && data.whatsapp_phone) {
      existingSubscriber = await findSubscriberByField('whatsapp_phone', data.whatsapp_phone)
    }
    
    if (existingSubscriber) {
      // Actualizar suscriptor existente
      await updateSubscriber(existingSubscriber.id, data)
      
      // Obtener info actualizada
      const updated = await getSubscriberInfo(existingSubscriber.id)
      return updated
    } else {
      // Crear nuevo suscriptor
      const newSubscriber = await createSubscriber(data)
      return newSubscriber
    }
  } catch (error) {
    console.error('ManyChat upsertSubscriber error:', error)
    return null
  }
}

// ==========================================
// TAGS
// ==========================================

/**
 * Agregar tag a un suscriptor por nombre del tag
 */
export async function addTagByName(subscriberId: string, tagName: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${MANYCHAT_API_URL}/fb/subscriber/addTagByName`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          subscriber_id: subscriberId,
          tag_name: tagName,
        }),
      }
    )
    
    const result: ManyChatResponse<any> = await response.json()
    
    if (result.status === 'success') {
      console.log(`ManyChat: Tag "${tagName}" added to subscriber ${subscriberId}`)
      return true
    }
    
    return false
  } catch (error) {
    console.error('ManyChat addTagByName error:', error)
    return false
  }
}

/**
 * Agregar múltiples tags a un suscriptor
 */
export async function addMultipleTags(subscriberId: string, tagNames: string[]): Promise<boolean> {
  try {
    const results = await Promise.all(
      tagNames.map(tagName => addTagByName(subscriberId, tagName))
    )
    return results.every(r => r)
  } catch (error) {
    console.error('ManyChat addMultipleTags error:', error)
    return false
  }
}

/**
 * Remover tag de un suscriptor por nombre
 */
export async function removeTagByName(subscriberId: string, tagName: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${MANYCHAT_API_URL}/fb/subscriber/removeTagByName`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          subscriber_id: subscriberId,
          tag_name: tagName,
        }),
      }
    )
    
    const result: ManyChatResponse<any> = await response.json()
    return result.status === 'success'
  } catch (error) {
    console.error('ManyChat removeTagByName error:', error)
    return false
  }
}

// ==========================================
// CUSTOM FIELDS
// ==========================================

/**
 * Establecer valor de custom field por nombre
 */
export async function setCustomFieldByName(
  subscriberId: string,
  fieldName: string,
  fieldValue: string | number | boolean
): Promise<boolean> {
  try {
    const response = await fetch(
      `${MANYCHAT_API_URL}/fb/subscriber/setCustomFieldByName`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          subscriber_id: subscriberId,
          field_name: fieldName,
          field_value: fieldValue,
        }),
      }
    )
    
    const result: ManyChatResponse<any> = await response.json()
    
    if (result.status === 'success') {
      console.log(`ManyChat: Custom field "${fieldName}" set to "${fieldValue}" for subscriber ${subscriberId}`)
      return true
    }
    
    return false
  } catch (error) {
    console.error('ManyChat setCustomFieldByName error:', error)
    return false
  }
}

/**
 * Establecer múltiples custom fields
 */
export async function setMultipleCustomFields(
  subscriberId: string,
  fields: Record<string, string | number | boolean>
): Promise<boolean> {
  try {
    const results = await Promise.all(
      Object.entries(fields).map(([name, value]) => 
        setCustomFieldByName(subscriberId, name, value)
      )
    )
    return results.some(r => r) // Al menos uno debe ser exitoso
  } catch (error) {
    console.error('ManyChat setMultipleCustomFields error:', error)
    return false
  }
}

// ==========================================
// ENVIAR FLUJOS / AUTOMATIONS
// ==========================================

/**
 * Enviar un flujo/automation a un suscriptor
 */
export async function sendFlow(subscriberId: string, flowNamespace: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${MANYCHAT_API_URL}/fb/sending/sendFlow`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          subscriber_id: subscriberId,
          flow_ns: flowNamespace,
        }),
      }
    )
    
    const result: ManyChatResponse<any> = await response.json()
    
    if (result.status === 'success') {
      console.log(`ManyChat: Flow "${flowNamespace}" sent to subscriber ${subscriberId}`)
      return true
    }
    
    return false
  } catch (error) {
    console.error('ManyChat sendFlow error:', error)
    return false
  }
}

// ==========================================
// VERIFICAR CONEXIÓN (API KEY)
// ==========================================

const CONNECTION_ERROR_MSG = 'No se pudo conectar a ManyChat. Verifica la API KEY.'
export const MANYCHAT_KEY_MISSING_MSG = 'MANYCHAT_API_KEY no está configurada. En producción: Render → Environment (y redeploy). En local: .env.local'

/**
 * Verifica que la API Key de ManyChat sea válida haciendo una llamada simple (getTags).
 * Si falla por 401/403 o error de API, lanza con mensaje claro.
 */
export async function verifyConnection(): Promise<void> {
  const key = getManyChatApiKey()
  if (!key) {
    throw new Error(MANYCHAT_KEY_MISSING_MSG)
  }
  try {
    const response = await fetch(
      `${MANYCHAT_API_URL}/fb/page/getTags`,
      { method: 'GET', headers: getHeaders() }
    )
    const result: ManyChatResponse<ManyChatTag[]> = await response.json().catch(() => ({} as any))
    if (response.status === 401 || response.status === 403) {
      const apiMsg = result?.error?.message ? ` ManyChat: "${result.error.message}"` : ''
      throw new Error(
        `API key rechazada por ManyChat (${response.status}).${apiMsg}\n\n` +
        '• Usa la clave de Account Public API: ManyChat → Settings → API → "Generate your API Key". NO uses la de Profile (app.manychat.com/profile).\n' +
        '• Al pegarla en Render, no dejes espacios ni saltos de línea al inicio o final.\n' +
        '• Después de guardar en Render, haz "Manual Deploy".'
      )
    }
    if (result.status !== 'success') {
      throw new Error(result?.error?.message || CONNECTION_ERROR_MSG)
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('API key') || err.message.includes('MANYCHAT_API_KEY') || err.message.includes('No se pudo'))) throw err
    console.error('ManyChat verifyConnection error:', err)
    throw new Error(err?.message || CONNECTION_ERROR_MSG)
  }
}

// ==========================================
// OBTENER INFO DE LA PÁGINA
// ==========================================

/**
 * Obtener todos los tags de la página
 */
export async function getPageTags(): Promise<ManyChatTag[]> {
  try {
    const response = await fetch(
      `${MANYCHAT_API_URL}/fb/page/getTags`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    )
    
    const result: ManyChatResponse<ManyChatTag[]> = await response.json()
    
    if (result.status === 'success' && result.data) {
      return result.data
    }
    
    return []
  } catch (error) {
    console.error('ManyChat getPageTags error:', error)
    return []
  }
}

/**
 * Obtener todos los custom fields de la página
 */
export async function getPageCustomFields(): Promise<ManyChatCustomField[]> {
  try {
    const response = await fetch(
      `${MANYCHAT_API_URL}/fb/page/getCustomFields`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    )
    
    const result: ManyChatResponse<ManyChatCustomField[]> = await response.json()
    
    if (result.status === 'success' && result.data) {
      return result.data
    }
    
    return []
  } catch (error) {
    console.error('ManyChat getPageCustomFields error:', error)
    return []
  }
}

/**
 * Obtener todos los flujos de la página
 */
export async function getPageFlows(): Promise<any[]> {
  try {
    const response = await fetch(
      `${MANYCHAT_API_URL}/fb/page/getFlows`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    )
    
    const result: ManyChatResponse<any[]> = await response.json()
    
    if (result.status === 'success' && result.data) {
      return result.data
    }
    
    return []
  } catch (error) {
    console.error('ManyChat getPageFlows error:', error)
    return []
  }
}

// ==========================================
// CREAR TAGS Y CUSTOM FIELDS
// ==========================================

export type CreateTagResult = ManyChatTag | { exists: true }
export type CreateCustomFieldResult = ManyChatCustomField | { exists: true }

/**
 * Crear un tag en ManyChat.
 * - Éxito: devuelve el tag creado.
 * - "Tag already exists": devuelve { exists: true }.
 * - Auth/red/otro error: lanza excepción (no devuelve null).
 */
export async function createTag(tagName: string): Promise<CreateTagResult> {
  const response = await fetch(
    `${MANYCHAT_API_URL}/fb/page/createTag`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name: tagName }),
    }
  )

  const result: ManyChatResponse<ManyChatTag> = await response.json()

  if (response.status === 401 || response.status === 403) {
    throw new Error(CONNECTION_ERROR_MSG)
  }

  if (result.status === 'success' && result.data) {
    console.log(`ManyChat: Tag "${tagName}" created with ID: ${result.data.id}`)
    return result.data
  }

  const msg = (result.error?.message || '').toLowerCase()
  if (msg.includes('already') || msg.includes('exist') || msg.includes('duplicate')) {
    console.log(`ManyChat: Tag "${tagName}" already exists`)
    return { exists: true }
  }

  throw new Error(result.error?.message || CONNECTION_ERROR_MSG)
}

/**
 * Crear un custom field en ManyChat.
 * - Éxito: devuelve el field creado.
 * - "Field already exists": devuelve { exists: true }.
 * - Auth/red/otro error: lanza excepción (no devuelve null).
 */
export async function createCustomField(
  fieldName: string,
  fieldType: 'text' | 'number' | 'date' | 'datetime' | 'boolean' = 'text',
  description?: string
): Promise<CreateCustomFieldResult> {
  const response = await fetch(
    `${MANYCHAT_API_URL}/fb/page/createCustomField`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        name: fieldName,
        type: fieldType,
        description: description || `Bear Beat field: ${fieldName}`,
      }),
    }
  )

  const result: ManyChatResponse<ManyChatCustomField> = await response.json()

  if (response.status === 401 || response.status === 403) {
    throw new Error(CONNECTION_ERROR_MSG)
  }

  if (result.status === 'success' && result.data) {
    console.log(`ManyChat: Custom field "${fieldName}" created with ID: ${result.data.id}`)
    return result.data
  }

  const msg = (result.error?.message || '').toLowerCase()
  if (msg.includes('already') || msg.includes('exist') || msg.includes('duplicate')) {
    console.log(`ManyChat: Custom field "${fieldName}" already exists`)
    return { exists: true }
  }

  throw new Error(result.error?.message || CONNECTION_ERROR_MSG)
}

/**
 * Inicializar todos los tags de Bear Beat en ManyChat
 */
export async function initializeBearBeatTags(): Promise<{
  created: string[]
  failed: string[]
}> {
  const allTags = Object.values(BEAR_BEAT_TAGS)
  const created: string[] = []
  const failed: string[] = []
  
  console.log('ManyChat: Initializing Bear Beat tags...')
  
  for (const tagName of allTags) {
    const result = await createTag(tagName)
    if (result && typeof result === 'object' && 'exists' in result) {
      failed.push(tagName) // ya existía
    } else if (result && typeof result === 'object' && 'id' in result) {
      created.push(tagName)
    }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  console.log(`ManyChat: Tags initialized. Created: ${created.length}, Failed/Existing: ${failed.length}`)
  return { created, failed }
}

/**
 * Inicializar todos los custom fields de Bear Beat en ManyChat
 */
export async function initializeBearBeatCustomFields(): Promise<{
  created: string[]
  failed: string[]
}> {
  const fieldsToCreate: Array<{
    name: string
    type: 'text' | 'number' | 'date' | 'datetime' | 'boolean'
    description: string
  }> = [
    { name: BEAR_BEAT_FIELDS.LAST_PAGE_VISITED, type: 'text', description: 'Última página visitada por el usuario' },
    { name: BEAR_BEAT_FIELDS.TOTAL_PURCHASES, type: 'number', description: 'Número total de compras' },
    { name: BEAR_BEAT_FIELDS.TOTAL_SPENT, type: 'number', description: 'Total gastado en MXN' },
    { name: BEAR_BEAT_FIELDS.LAST_PACK_PURCHASED, type: 'text', description: 'Nombre del último pack comprado' },
    { name: BEAR_BEAT_FIELDS.REFERRER_SOURCE, type: 'text', description: 'Fuente de donde llegó el usuario' },
    { name: BEAR_BEAT_FIELDS.USER_ID, type: 'text', description: 'ID del usuario en Supabase' },
    { name: BEAR_BEAT_FIELDS.COUNTRY, type: 'text', description: 'País del usuario (código ISO)' },
    { name: BEAR_BEAT_FIELDS.REGISTRATION_DATE, type: 'datetime', description: 'Fecha de registro' },
    { name: BEAR_BEAT_FIELDS.LAST_LOGIN, type: 'datetime', description: 'Último inicio de sesión' },
  ]
  
  const created: string[] = []
  const failed: string[] = []
  
  console.log('ManyChat: Initializing Bear Beat custom fields...')
  
  for (const field of fieldsToCreate) {
    const result = await createCustomField(field.name, field.type, field.description)
    if (result && typeof result === 'object' && 'exists' in result) {
      failed.push(field.name) // ya existía
    } else if (result && typeof result === 'object' && 'id' in result) {
      created.push(field.name)
    }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  console.log(`ManyChat: Custom fields initialized. Created: ${created.length}, Failed/Existing: ${failed.length}`)
  return { created, failed }
}

/**
 * Inicializar TODO lo necesario en ManyChat para Bear Beat
 */
export async function initializeManyChat(): Promise<{
  tags: { created: string[], failed: string[] }
  customFields: { created: string[], failed: string[] }
  existingTags: ManyChatTag[]
  existingFields: ManyChatCustomField[]
}> {
  console.log('=== ManyChat: Starting full initialization ===')
  await verifyConnection()

  // 1. Crear todos los tags
  const tags = await initializeBearBeatTags()
  
  // 2. Crear todos los custom fields
  const customFields = await initializeBearBeatCustomFields()
  
  // 3. Obtener lista actual para confirmar
  const existingTags = await getPageTags()
  const existingFields = await getPageCustomFields()
  
  console.log('=== ManyChat: Initialization complete ===')
  console.log(`Tags totales: ${existingTags.length}`)
  console.log(`Custom Fields totales: ${existingFields.length}`)
  
  return {
    tags,
    customFields,
    existingTags,
    existingFields,
  }
}

// ==========================================
// FUNCIONES DE ALTO NIVEL PARA BEAR BEAT
// ==========================================

/**
 * Tags predefinidos para Bear Beat
 */
export const BEAR_BEAT_TAGS = {
  // Etapa del funnel
  VISITOR: 'bb_visitor',
  LEAD: 'bb_lead',
  CUSTOMER: 'bb_customer',
  REPEAT_CUSTOMER: 'bb_repeat_customer',
  
  // Acciones
  VIEWED_LANDING: 'bb_viewed_landing',
  CLICKED_CTA: 'bb_clicked_cta',
  STARTED_CHECKOUT: 'bb_started_checkout',
  PAYMENT_INTENT: 'bb_payment_intent',
  PAYMENT_SUCCESS: 'bb_payment_success',
  REGISTERED: 'bb_registered',
  LOGGED_IN: 'bb_logged_in',
  DOWNLOADED: 'bb_downloaded',
  
  // Método de pago usado
  PAID_CARD: 'bb_paid_card',
  PAID_OXXO: 'bb_paid_oxxo',
  PAID_SPEI: 'bb_paid_spei',
  PAID_PAYPAL: 'bb_paid_paypal',
  
  // País
  COUNTRY_MX: 'bb_country_mx',
  COUNTRY_US: 'bb_country_us',
  COUNTRY_OTHER: 'bb_country_other',
}

/**
 * Custom Fields predefinidos para Bear Beat
 */
export const BEAR_BEAT_FIELDS = {
  LAST_PAGE_VISITED: 'bb_last_page',
  TOTAL_PURCHASES: 'bb_total_purchases',
  TOTAL_SPENT: 'bb_total_spent',
  LAST_PACK_PURCHASED: 'bb_last_pack',
  REFERRER_SOURCE: 'bb_referrer',
  USER_ID: 'bb_user_id',
  COUNTRY: 'bb_country',
  REGISTRATION_DATE: 'bb_registration_date',
  LAST_LOGIN: 'bb_last_login',
}

/**
 * Registrar nuevo visitante en ManyChat
 */
export async function trackVisitor(data: {
  sessionId: string
  referrer?: string
  pageUrl?: string
  country?: string
}): Promise<string | null> {
  // No podemos crear suscriptor sin email o teléfono
  // Solo guardamos en nuestra DB y esperamos a que proporcione datos
  console.log('ManyChat: Visitor tracked in local DB only (no email/phone yet)', data.sessionId)
  return null
}

/**
 * Sincronizar usuario completo con ManyChat
 * Se usa cuando el usuario se registra o completa una compra
 */
export async function syncUserToManyChat(data: {
  email: string
  phone?: string
  firstName?: string
  lastName?: string
  country?: string
  userId?: string
  referrer?: string
}): Promise<ManyChatSubscriber | null> {
  try {
    // Crear o actualizar suscriptor
    const subscriber = await upsertSubscriber({
      email: data.email,
      phone: data.phone,
      whatsapp_phone: data.phone, // Usar mismo teléfono para WhatsApp
      first_name: data.firstName,
      last_name: data.lastName,
      has_opt_in_sms: true,
      has_opt_in_email: true,
    })
    
    if (!subscriber) {
      console.error('ManyChat: Failed to create/update subscriber')
      return null
    }
    
    // Agregar tags básicos
    await addMultipleTags(subscriber.id, [
      BEAR_BEAT_TAGS.LEAD,
      BEAR_BEAT_TAGS.REGISTERED,
    ])
    
    // Establecer custom fields
    const fields: Record<string, string | number> = {
      [BEAR_BEAT_FIELDS.REGISTRATION_DATE]: new Date().toISOString(),
    }
    
    if (data.userId) {
      fields[BEAR_BEAT_FIELDS.USER_ID] = data.userId
    }
    
    if (data.country) {
      fields[BEAR_BEAT_FIELDS.COUNTRY] = data.country
      
      // Tag de país
      if (data.country === 'MX') {
        await addTagByName(subscriber.id, BEAR_BEAT_TAGS.COUNTRY_MX)
      } else if (data.country === 'US') {
        await addTagByName(subscriber.id, BEAR_BEAT_TAGS.COUNTRY_US)
      } else {
        await addTagByName(subscriber.id, BEAR_BEAT_TAGS.COUNTRY_OTHER)
      }
    }
    
    if (data.referrer) {
      fields[BEAR_BEAT_FIELDS.REFERRER_SOURCE] = data.referrer
    }
    
    await setMultipleCustomFields(subscriber.id, fields)
    
    console.log('ManyChat: User synced successfully:', subscriber.id)
    return subscriber
  } catch (error) {
    console.error('ManyChat syncUserToManyChat error:', error)
    return null
  }
}

/**
 * Registrar compra exitosa en ManyChat
 */
export async function trackPurchaseInManyChat(data: {
  email: string
  phone?: string
  packName: string
  amount: number
  currency: string
  paymentMethod: 'card' | 'oxxo' | 'spei' | 'paypal'
}): Promise<boolean> {
  try {
    // Buscar suscriptor por email
    let subscriber = await findSubscriberByField('email', data.email)
    
    // Si no existe por email, buscar por teléfono
    if (!subscriber && data.phone) {
      subscriber = await findSubscriberByField('phone', data.phone)
    }
    
    // Si no existe, crear nuevo
    if (!subscriber) {
      subscriber = await createSubscriber({
        email: data.email,
        phone: data.phone,
        whatsapp_phone: data.phone,
        has_opt_in_sms: true,
        has_opt_in_email: true,
      })
    }
    
    if (!subscriber) {
      console.error('ManyChat: Could not find or create subscriber for purchase')
      return false
    }
    
    // Agregar tags de compra
    const tags = [
      BEAR_BEAT_TAGS.CUSTOMER,
      BEAR_BEAT_TAGS.PAYMENT_SUCCESS,
    ]
    
    // Tag de método de pago
    switch (data.paymentMethod) {
      case 'card':
        tags.push(BEAR_BEAT_TAGS.PAID_CARD)
        break
      case 'oxxo':
        tags.push(BEAR_BEAT_TAGS.PAID_OXXO)
        break
      case 'spei':
        tags.push(BEAR_BEAT_TAGS.PAID_SPEI)
        break
      case 'paypal':
        tags.push(BEAR_BEAT_TAGS.PAID_PAYPAL)
        break
    }
    
    await addMultipleTags(subscriber.id, tags)
    
    // Remover tag de lead (ya es customer)
    await removeTagByName(subscriber.id, BEAR_BEAT_TAGS.LEAD)
    
    // Actualizar custom fields
    await setMultipleCustomFields(subscriber.id, {
      [BEAR_BEAT_FIELDS.LAST_PACK_PURCHASED]: data.packName,
      [BEAR_BEAT_FIELDS.TOTAL_SPENT]: data.amount,
    })
    
    console.log('ManyChat: Purchase tracked for subscriber:', subscriber.id)
    return true
  } catch (error) {
    console.error('ManyChat trackPurchaseInManyChat error:', error)
    return false
  }
}

/**
 * Trackear evento genérico en ManyChat
 */
export async function trackEventInManyChat(data: {
  email?: string
  phone?: string
  eventType: string
  eventData?: Record<string, any>
}): Promise<boolean> {
  try {
    // Necesitamos email o teléfono para identificar al usuario
    if (!data.email && !data.phone) {
      console.log('ManyChat: Cannot track event without email or phone')
      return false
    }
    
    // Buscar suscriptor
    let subscriber: ManyChatSubscriber | null = null
    
    if (data.email) {
      subscriber = await findSubscriberByField('email', data.email)
    }
    
    if (!subscriber && data.phone) {
      subscriber = await findSubscriberByField('phone', data.phone)
    }
    
    if (!subscriber) {
      console.log('ManyChat: Subscriber not found for event tracking')
      return false
    }
    
    // Agregar tag según el tipo de evento
    let tagToAdd: string | null = null
    
    switch (data.eventType) {
      case 'page_view':
        tagToAdd = BEAR_BEAT_TAGS.VIEWED_LANDING
        break
      case 'click_cta':
        tagToAdd = BEAR_BEAT_TAGS.CLICKED_CTA
        break
      case 'start_checkout':
        tagToAdd = BEAR_BEAT_TAGS.STARTED_CHECKOUT
        break
      case 'payment_intent':
        tagToAdd = BEAR_BEAT_TAGS.PAYMENT_INTENT
        break
      case 'payment_success':
        tagToAdd = BEAR_BEAT_TAGS.PAYMENT_SUCCESS
        break
      case 'login':
        tagToAdd = BEAR_BEAT_TAGS.LOGGED_IN
        break
      case 'download':
        tagToAdd = BEAR_BEAT_TAGS.DOWNLOADED
        break
    }
    
    if (tagToAdd) {
      await addTagByName(subscriber.id, tagToAdd)
    }
    
    // Actualizar último página visitada si aplica
    if (data.eventData?.page) {
      await setCustomFieldByName(
        subscriber.id,
        BEAR_BEAT_FIELDS.LAST_PAGE_VISITED,
        data.eventData.page
      )
    }
    
    console.log(`ManyChat: Event "${data.eventType}" tracked for subscriber:`, subscriber.id)
    return true
  } catch (error) {
    console.error('ManyChat trackEventInManyChat error:', error)
    return false
  }
}
