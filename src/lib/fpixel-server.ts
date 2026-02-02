/**
 * Facebook Conversions API (CAPI) - Server-Side
 * Event Match Quality: hashear emails/teléfonos (SHA256), incluir IP y User-Agent.
 * Deduplicación: event_id debe coincidir con el evento del frontend (Pixel).
 *
 * Env: NEXT_PUBLIC_FB_PIXEL_ID, FB_ACCESS_TOKEN, NEXT_PUBLIC_URL (opcional)
 */

import crypto from 'crypto'

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || ''
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN || process.env.FACEBOOK_CAPI_ACCESS_TOKEN || ''
const API_VERSION = 'v19.0'
const BASE_URL = process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || ''

export interface SendServerEventUserData {
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  clientIpAddress?: string
  clientUserAgent?: string
  fbp?: string
  fbc?: string
  externalId?: string
}

export interface SendServerEventCustomData {
  value?: number
  currency?: string
  content_ids?: string[]
  content_name?: string
  content_type?: string
  num_items?: number
  order_id?: string
  search_string?: string
  [key: string]: unknown
}

function hashSha256(value: string): string {
  if (!value?.trim()) return ''
  const normalized = value.toLowerCase().trim().replace(/\s+/g, '')
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

function hashPhone(phone: string): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  return crypto.createHash('sha256').update(digits).digest('hex')
}

/**
 * Envía un evento a Facebook CAPI (POST graph.facebook.com).
 * Emails y teléfonos se hashean (SHA256). Incluir IP y User-Agent cuando estén disponibles.
 * event_id: mismo que en el Pixel para deduplicación.
 */
export async function sendServerEvent(
  eventName: string,
  eventId: string,
  userData: SendServerEventUserData,
  customData?: SendServerEventCustomData
): Promise<{ events_received?: number; error?: { message: string } }> {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    if (!ACCESS_TOKEN) console.warn('FB_ACCESS_TOKEN (or FACEBOOK_CAPI_ACCESS_TOKEN) not set, skipping CAPI')
    return { error: { message: 'CAPI not configured' } }
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`
  const eventTime = Math.floor(Date.now() / 1000)

  const user_data: Record<string, string[] | string> = {}
  if (userData.email) user_data.em = [hashSha256(userData.email)]
  if (userData.phone) user_data.ph = [hashPhone(userData.phone)]
  if (userData.firstName) user_data.fn = [hashSha256(userData.firstName)]
  if (userData.lastName) user_data.ln = [hashSha256(userData.lastName)]
  if (userData.externalId) user_data.external_id = [hashSha256(userData.externalId)]
  if (userData.clientIpAddress) user_data.client_ip_address = userData.clientIpAddress
  if (userData.clientUserAgent) user_data.client_user_agent = userData.clientUserAgent
  if (userData.fbp) user_data.fbp = userData.fbp
  if (userData.fbc) user_data.fbc = userData.fbc

  const payload: Record<string, unknown> = {
    event_name: eventName,
    event_time: eventTime,
    event_id: eventId,
    action_source: 'website',
    user_data: user_data,
  }
  if (BASE_URL) payload.event_source_url = BASE_URL
  if (customData && Object.keys(customData).length > 0) {
    const cd: Record<string, unknown> = {}
    if (customData.value != null) cd.value = customData.value
    if (customData.currency) cd.currency = customData.currency.toUpperCase()
    if (customData.content_ids?.length) cd.content_ids = customData.content_ids
    if (customData.content_name) cd.content_name = customData.content_name
    if (customData.content_type) cd.content_type = customData.content_type
    if (customData.num_items != null) cd.num_items = customData.num_items
    if (customData.order_id) cd.order_id = customData.order_id
    if (customData.search_string) cd.search_string = customData.search_string
    Object.keys(customData).forEach((k) => {
      if (!(k in cd) && customData[k] !== undefined) cd[k] = customData[k]
    })
    payload.custom_data = cd
  }

  try {
    const res = await fetch(`${url}?access_token=${ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [payload] }),
    })
    const result = await res.json()
    if (result.error) {
      console.error('Facebook CAPI error:', result.error)
      return { error: result.error }
    }
    return { events_received: result.events_received }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Facebook CAPI request failed:', msg)
    return { error: { message: msg } }
  }
}
