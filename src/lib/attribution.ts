/**
 * Sistema de Atribución de Tráfico - Bear Beat
 * 
 * Detecta y guarda de dónde viene cada usuario:
 * - UTM Parameters (utm_source, utm_medium, utm_campaign, etc.)
 * - Referrer (Facebook, Instagram, TikTok, WhatsApp, Google, etc.)
 * - Click IDs (fbclid, gclid, ttclid, etc.)
 * - Primera y última fuente de tráfico
 */

// ==========================================
// TIPOS
// ==========================================

export interface AttributionData {
  // UTM Parameters
  utm_source?: string       // facebook, google, tiktok, instagram, etc.
  utm_medium?: string       // cpc, social, email, organic, etc.
  utm_campaign?: string     // nombre de la campaña
  utm_content?: string      // variación del anuncio
  utm_term?: string         // keywords (para Google Ads)
  
  // Click IDs de plataformas
  fbclid?: string           // Facebook Click ID
  gclid?: string            // Google Click ID
  ttclid?: string           // TikTok Click ID
  li_fat_id?: string        // LinkedIn Click ID
  twclid?: string           // Twitter/X Click ID
  msclkid?: string          // Microsoft/Bing Click ID
  
  // Referrer detectado
  referrer?: string         // URL completa del referrer
  referrer_source?: string  // Fuente detectada (facebook, google, etc.)
  referrer_type?: string    // Tipo (social, search, direct, email, etc.)
  
  // Landing page
  landing_page?: string     // Primera página que visitó
  landing_params?: string   // Parámetros de la URL
  
  // Timestamps
  first_visit?: string      // Primera visita (ISO)
  last_visit?: string       // Última visita (ISO)
  
  // Dispositivo
  device_type?: string      // mobile, tablet, desktop
  browser?: string          // chrome, safari, firefox, etc.
  os?: string               // ios, android, windows, macos, etc.
}

export interface TrafficSource {
  source: string            // facebook, google, tiktok, direct, etc.
  medium: string            // cpc, social, organic, referral, etc.
  campaign?: string         // Nombre de la campaña
  content?: string          // Variación del anuncio
  isAd: boolean             // ¿Es tráfico de pago?
  platform: string          // Plataforma específica (instagram, messenger, etc.)
  displayName: string       // Nombre para mostrar
  icon: string              // Emoji para UI
}

// ==========================================
// DETECCIÓN DE FUENTES
// ==========================================

/**
 * Mapeo de referrers a fuentes conocidas
 */
const REFERRER_PATTERNS: Record<string, { source: string; platform: string; icon: string }> = {
  // Facebook & Meta
  'facebook.com': { source: 'facebook', platform: 'facebook', icon: '📘' },
  'fb.com': { source: 'facebook', platform: 'facebook', icon: '📘' },
  'fb.me': { source: 'facebook', platform: 'facebook', icon: '📘' },
  'm.facebook.com': { source: 'facebook', platform: 'facebook_mobile', icon: '📘' },
  'l.facebook.com': { source: 'facebook', platform: 'facebook_link', icon: '📘' },
  'lm.facebook.com': { source: 'facebook', platform: 'facebook_messenger', icon: '💬' },
  'instagram.com': { source: 'instagram', platform: 'instagram', icon: '📸' },
  'l.instagram.com': { source: 'instagram', platform: 'instagram_link', icon: '📸' },
  'messenger.com': { source: 'messenger', platform: 'messenger', icon: '💬' },
  'threads.net': { source: 'threads', platform: 'threads', icon: '🧵' },
  
  // WhatsApp
  'whatsapp.com': { source: 'whatsapp', platform: 'whatsapp', icon: '💚' },
  'wa.me': { source: 'whatsapp', platform: 'whatsapp', icon: '💚' },
  'api.whatsapp.com': { source: 'whatsapp', platform: 'whatsapp_api', icon: '💚' },
  'web.whatsapp.com': { source: 'whatsapp', platform: 'whatsapp_web', icon: '💚' },
  
  // TikTok
  'tiktok.com': { source: 'tiktok', platform: 'tiktok', icon: '🎵' },
  'vm.tiktok.com': { source: 'tiktok', platform: 'tiktok_video', icon: '🎵' },
  
  // Twitter/X
  'twitter.com': { source: 'twitter', platform: 'twitter', icon: '🐦' },
  'x.com': { source: 'twitter', platform: 'x', icon: '✖️' },
  't.co': { source: 'twitter', platform: 'twitter_link', icon: '🐦' },
  
  // Telegram
  'telegram.org': { source: 'telegram', platform: 'telegram', icon: '✈️' },
  't.me': { source: 'telegram', platform: 'telegram', icon: '✈️' },
  'web.telegram.org': { source: 'telegram', platform: 'telegram_web', icon: '✈️' },
  
  // YouTube
  'youtube.com': { source: 'youtube', platform: 'youtube', icon: '▶️' },
  'youtu.be': { source: 'youtube', platform: 'youtube', icon: '▶️' },
  'm.youtube.com': { source: 'youtube', platform: 'youtube_mobile', icon: '▶️' },
  
  // Google
  'google.com': { source: 'google', platform: 'google_search', icon: '🔍' },
  'google.com.mx': { source: 'google', platform: 'google_search', icon: '🔍' },
  'google.es': { source: 'google', platform: 'google_search', icon: '🔍' },
  
  // Bing
  'bing.com': { source: 'bing', platform: 'bing_search', icon: '🔍' },
  
  // LinkedIn
  'linkedin.com': { source: 'linkedin', platform: 'linkedin', icon: '💼' },
  'lnkd.in': { source: 'linkedin', platform: 'linkedin', icon: '💼' },
  
  // Pinterest
  'pinterest.com': { source: 'pinterest', platform: 'pinterest', icon: '📌' },
  'pin.it': { source: 'pinterest', platform: 'pinterest', icon: '📌' },
  
  // Reddit
  'reddit.com': { source: 'reddit', platform: 'reddit', icon: '🤖' },
  
  // Snapchat
  'snapchat.com': { source: 'snapchat', platform: 'snapchat', icon: '👻' },
  
  // Email providers (para detectar tráfico de email)
  'mail.google.com': { source: 'email', platform: 'gmail', icon: '📧' },
  'outlook.live.com': { source: 'email', platform: 'outlook', icon: '📧' },
  'mail.yahoo.com': { source: 'email', platform: 'yahoo_mail', icon: '📧' },
}

/**
 * Detecta la fuente de tráfico basado en el referrer
 */
export function detectReferrerSource(referrer: string): { source: string; platform: string; icon: string } | null {
  if (!referrer) return null
  
  try {
    const url = new URL(referrer)
    const hostname = url.hostname.toLowerCase().replace('www.', '')
    
    // Buscar en patrones conocidos
    for (const [pattern, data] of Object.entries(REFERRER_PATTERNS)) {
      if (hostname === pattern || hostname.endsWith('.' + pattern)) {
        return data
      }
    }
    
    // Si no se reconoce, retornar como referral genérico
    return {
      source: hostname.split('.')[0],
      platform: 'referral',
      icon: '🔗',
    }
  } catch {
    return null
  }
}

/**
 * Detecta si es tráfico de pago basado en click IDs
 */
export function isAdTraffic(params: URLSearchParams): boolean {
  return !!(
    params.get('fbclid') ||
    params.get('gclid') ||
    params.get('ttclid') ||
    params.get('li_fat_id') ||
    params.get('twclid') ||
    params.get('msclkid') ||
    params.get('utm_medium')?.toLowerCase().includes('cpc') ||
    params.get('utm_medium')?.toLowerCase().includes('paid') ||
    params.get('utm_medium')?.toLowerCase().includes('ad')
  )
}

/**
 * Detecta el tipo de dispositivo
 */
export function detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'
  
  const ua = navigator.userAgent.toLowerCase()
  
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet'
  }
  
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile'
  }
  
  return 'desktop'
}

/**
 * Detecta el sistema operativo
 */
export function detectOS(): string {
  if (typeof window === 'undefined') return 'unknown'
  
  const ua = navigator.userAgent
  
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/Windows/i.test(ua)) return 'windows'
  if (/Mac/i.test(ua)) return 'macos'
  if (/Linux/i.test(ua)) return 'linux'
  
  return 'unknown'
}

/**
 * Detecta el navegador
 */
export function detectBrowser(): string {
  if (typeof window === 'undefined') return 'unknown'
  
  const ua = navigator.userAgent
  
  if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) return 'chrome'
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'safari'
  if (/Firefox/i.test(ua)) return 'firefox'
  if (/Edge|Edg/i.test(ua)) return 'edge'
  if (/Opera|OPR/i.test(ua)) return 'opera'
  
  return 'unknown'
}

// ==========================================
// CAPTURA Y ALMACENAMIENTO
// ==========================================

const STORAGE_KEY = 'bear_attribution'
const FIRST_VISIT_KEY = 'bear_first_attribution'

/**
 * Captura los datos de atribución de la URL actual
 */
export function captureAttribution(): AttributionData {
  if (typeof window === 'undefined') return {}
  
  const params = new URLSearchParams(window.location.search)
  const referrer = document.referrer
  const referrerData = detectReferrerSource(referrer)
  
  const attribution: AttributionData = {
    // UTM Parameters
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_content: params.get('utm_content') || undefined,
    utm_term: params.get('utm_term') || undefined,
    
    // Click IDs
    fbclid: params.get('fbclid') || undefined,
    gclid: params.get('gclid') || undefined,
    ttclid: params.get('ttclid') || undefined,
    li_fat_id: params.get('li_fat_id') || undefined,
    twclid: params.get('twclid') || undefined,
    msclkid: params.get('msclkid') || undefined,
    
    // Referrer
    referrer: referrer || undefined,
    referrer_source: referrerData?.source,
    referrer_type: referrerData?.platform,
    
    // Landing page
    landing_page: window.location.pathname,
    landing_params: window.location.search || undefined,
    
    // Timestamps
    last_visit: new Date().toISOString(),
    
    // Device
    device_type: detectDeviceType(),
    browser: detectBrowser(),
    os: detectOS(),
  }
  
  // Determinar utm_source si no viene en la URL pero tenemos referrer
  if (!attribution.utm_source && referrerData) {
    attribution.utm_source = referrerData.source
  }
  
  // Determinar utm_medium si no viene
  if (!attribution.utm_medium) {
    if (isAdTraffic(params)) {
      attribution.utm_medium = 'cpc'
    } else if (referrerData) {
      // Determinar tipo basado en la fuente
      const socialSources = ['facebook', 'instagram', 'twitter', 'tiktok', 'linkedin', 'pinterest', 'snapchat', 'threads', 'youtube']
      const searchSources = ['google', 'bing', 'yahoo', 'duckduckgo']
      const messagingSources = ['whatsapp', 'messenger', 'telegram']
      
      if (socialSources.includes(referrerData.source)) {
        attribution.utm_medium = 'social'
      } else if (searchSources.includes(referrerData.source)) {
        attribution.utm_medium = 'organic'
      } else if (messagingSources.includes(referrerData.source)) {
        attribution.utm_medium = 'messaging'
      } else if (referrerData.source === 'email') {
        attribution.utm_medium = 'email'
      } else {
        attribution.utm_medium = 'referral'
      }
    } else if (!referrer) {
      attribution.utm_medium = 'direct'
      attribution.utm_source = 'direct'
    }
  }
  
  return attribution
}

/**
 * Guarda la atribución en localStorage
 * Mantiene la primera visita y actualiza la última
 */
export function saveAttribution(attribution: AttributionData): void {
  if (typeof window === 'undefined') return
  
  try {
    // Guardar primera visita si no existe
    const firstVisit = localStorage.getItem(FIRST_VISIT_KEY)
    if (!firstVisit) {
      const firstAttribution = {
        ...attribution,
        first_visit: new Date().toISOString(),
      }
      localStorage.setItem(FIRST_VISIT_KEY, JSON.stringify(firstAttribution))
    }
    
    // Siempre actualizar última visita
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution))
  } catch (error) {
    console.error('Error saving attribution:', error)
  }
}

/**
 * Obtiene la atribución guardada (última visita)
 */
export function getAttribution(): AttributionData | null {
  if (typeof window === 'undefined') return null
  
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

/**
 * Obtiene la atribución de la primera visita
 */
export function getFirstAttribution(): AttributionData | null {
  if (typeof window === 'undefined') return null
  
  try {
    const data = localStorage.getItem(FIRST_VISIT_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

/**
 * Combina primera y última atribución
 */
export function getFullAttribution(): {
  first: AttributionData | null
  last: AttributionData | null
  current: AttributionData
} {
  const current = captureAttribution()
  return {
    first: getFirstAttribution(),
    last: getAttribution(),
    current,
  }
}

// ==========================================
// FUENTE DE TRÁFICO FORMATEADA
// ==========================================

/**
 * Obtiene la fuente de tráfico formateada para mostrar
 */
export function getTrafficSource(attribution?: AttributionData | null): TrafficSource {
  const attr = attribution || getAttribution() || captureAttribution()
  
  const source = attr.utm_source || attr.referrer_source || 'direct'
  const medium = attr.utm_medium || 'unknown'
  const isAd = !!(attr.fbclid || attr.gclid || attr.ttclid || medium === 'cpc' || medium === 'paid')
  
  // Mapeo de fuentes a display names
  const sourceNames: Record<string, { name: string; icon: string }> = {
    facebook: { name: 'Facebook', icon: '📘' },
    instagram: { name: 'Instagram', icon: '📸' },
    whatsapp: { name: 'WhatsApp', icon: '💚' },
    messenger: { name: 'Messenger', icon: '💬' },
    tiktok: { name: 'TikTok', icon: '🎵' },
    twitter: { name: 'Twitter/X', icon: '🐦' },
    telegram: { name: 'Telegram', icon: '✈️' },
    threads: { name: 'Threads', icon: '🧵' },
    youtube: { name: 'YouTube', icon: '▶️' },
    google: { name: 'Google', icon: '🔍' },
    bing: { name: 'Bing', icon: '🔍' },
    linkedin: { name: 'LinkedIn', icon: '💼' },
    pinterest: { name: 'Pinterest', icon: '📌' },
    reddit: { name: 'Reddit', icon: '🤖' },
    snapchat: { name: 'Snapchat', icon: '👻' },
    email: { name: 'Email', icon: '📧' },
    direct: { name: 'Directo', icon: '🔗' },
  }
  
  const sourceInfo = sourceNames[source] || { name: source, icon: '🌐' }
  
  let displayName = sourceInfo.name
  if (isAd) {
    displayName += ' Ads'
  } else if (medium === 'organic') {
    displayName += ' (Orgánico)'
  }
  
  return {
    source,
    medium,
    campaign: attr.utm_campaign,
    content: attr.utm_content,
    isAd,
    platform: attr.referrer_type || source,
    displayName,
    icon: sourceInfo.icon,
  }
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

/**
 * Inicializa el sistema de atribución
 * Llamar en el componente raíz de la app
 */
export function initAttribution(): AttributionData {
  const attribution = captureAttribution()
  saveAttribution(attribution)
  return attribution
}

/**
 * Obtiene datos de atribución para enviar a APIs
 */
export function getAttributionForAPI(): Record<string, string | undefined> {
  const attr = getAttribution() || captureAttribution()
  const first = getFirstAttribution()
  
  return {
    // Última fuente (para optimización de ads)
    utm_source: attr.utm_source,
    utm_medium: attr.utm_medium,
    utm_campaign: attr.utm_campaign,
    utm_content: attr.utm_content,
    utm_term: attr.utm_term,
    
    // Click IDs
    fbclid: attr.fbclid,
    gclid: attr.gclid,
    ttclid: attr.ttclid,
    
    // Primera fuente (para atribución de conversión)
    first_source: first?.utm_source,
    first_medium: first?.utm_medium,
    first_campaign: first?.utm_campaign,
    
    // Landing page
    landing_page: first?.landing_page || attr.landing_page,
    
    // Device
    device_type: attr.device_type,
    browser: attr.browser,
    os: attr.os,
  }
}

// ==========================================
// COOKIE FIRST-TOUCH (bearbeat_attribution)
// Para lectura en APIs (create-payment-intent, create-checkout)
// ==========================================

export const ATTRIBUTION_COOKIE_NAME = 'bearbeat_attribution'
const ATTRIBUTION_COOKIE_DAYS = 30

export interface AttributionCookieData {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  ref?: string
  referrer_domain?: string
}

/**
 * Parsea la cookie bearbeat_attribution desde el header Cookie (servidor).
 */
export function parseAttributionCookie(cookieHeader: string | null): AttributionCookieData | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ATTRIBUTION_COOKIE_NAME}=([^;]*)`))
  const value = match?.[1]
  if (!value) return null
  try {
    const decoded = decodeURIComponent(value)
    return JSON.parse(decoded) as AttributionCookieData
  } catch {
    return null
  }
}

/**
 * Establece la cookie bearbeat_attribution en el cliente (document.cookie).
 * maxAge en segundos = 30 días.
 */
export function setAttributionCookieClient(data: AttributionCookieData): void {
  if (typeof document === 'undefined') return
  const value = encodeURIComponent(JSON.stringify(data))
  const maxAge = ATTRIBUTION_COOKIE_DAYS * 24 * 60 * 60
  document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`
}

/**
 * Lee la cookie bearbeat_attribution en el cliente.
 */
export function getAttributionCookieClient(): AttributionCookieData | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${ATTRIBUTION_COOKIE_NAME}=([^;]*)`))
  const value = match?.[1]
  if (!value) return null
  try {
    return JSON.parse(decodeURIComponent(value)) as AttributionCookieData
  } catch {
    return null
  }
}

/**
 * Indica si la visita actual es explícitamente de retargeting (se permite sobrescribir First-Touch).
 */
export function isRetargetingCampaign(params: URLSearchParams): boolean {
  const medium = (params.get('utm_medium') || '').toLowerCase()
  const content = (params.get('utm_content') || '').toLowerCase()
  return medium.includes('retargeting') || content.includes('retargeting') || medium === 'retargeting'
}
