import {
  fbTrackPageView,
  fbTrackViewContent,
  fbTrackAddToCart,
  fbTrackInitiateCheckout,
  fbTrackAddPaymentInfo,
  fbTrackPurchase,
  fbTrackLead,
  fbTrackCompleteRegistration,
  fbTrackContact,
  fbTrackCTAClick,
  fbTrackVideoPreview,
  fbTrackSelectPaymentMethod,
  fbTrackStartDownload,
  fbTrackCompleteDownload,
  fbTrackFAQView,
  fbTrackCartAbandonment,
  fbTrackLogin as fbLogin,
  fbTrackViewPack,
} from '@/components/analytics/MetaPixel'
import { getAttributionForAPI, getTrafficSource } from '@/lib/attribution'

// Obtener o crear session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  
  let sessionId = sessionStorage.getItem('bear_session_id')
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('bear_session_id', sessionId)
  }
  
  return sessionId
}

// Obtener info del navegador
function getBrowserInfo() {
  if (typeof window === 'undefined') return {}
  
  return {
    userAgent: navigator.userAgent,
    referrer: document.referrer || '(direct)',
    pageUrl: window.location.href,
  }
}

// Obtener email del usuario si está autenticado (para ManyChat)
function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('bear_user_email') || null
}

// Obtener teléfono del usuario si está autenticado (para ManyChat)
function getUserPhone(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('bear_user_phone') || null
}

// Guardar info del usuario para tracking (llamar después de login/registro)
export function setUserTrackingInfo(email?: string, phone?: string) {
  if (typeof window === 'undefined') return
  
  if (email) localStorage.setItem('bear_user_email', email)
  if (phone) localStorage.setItem('bear_user_phone', phone)
}

// Limpiar info del usuario (llamar al logout)
export function clearUserTrackingInfo() {
  if (typeof window === 'undefined') return
  
  localStorage.removeItem('bear_user_email')
  localStorage.removeItem('bear_user_phone')
}

interface TrackEventParams {
  eventType: string
  eventName: string
  eventData?: any
  userId?: string
  email?: string
  phone?: string
}

/**
 * Trackea un evento del usuario
 * - Guarda en Supabase (user_events) con atribución
 * - Envía a ManyChat si hay email o teléfono disponible
 * - Incluye datos de fuente de tráfico
 */
export async function trackEvent({ 
  eventType, 
  eventName, 
  eventData = {}, 
  userId,
  email,
  phone,
}: TrackEventParams) {
  try {
    const sessionId = getSessionId()
    const browserInfo = getBrowserInfo()
    const attribution = getAttributionForAPI()
    const trafficSource = getTrafficSource()

    // 1. Guardar evento vía API (evita 400 directo a Supabase desde el cliente)
    fetch('/api/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType,
        eventName,
        eventData: {
          ...(typeof eventData === 'object' && eventData !== null ? eventData : {}),
          attribution: {
            source: trafficSource?.source,
            medium: trafficSource?.medium,
            campaign: trafficSource?.campaign,
            is_ad: trafficSource?.isAd,
            display_name: trafficSource?.displayName,
          },
          pageUrl: browserInfo.pageUrl,
          referrer: browserInfo.referrer,
        },
        userId: userId || undefined,
      }),
    }).catch(() => {})

    // 2. Enviar a ManyChat si tenemos email o teléfono
    const userEmail = email || getUserEmail()
    const userPhone = phone || getUserPhone()
    
    if (userEmail || userPhone) {
      // Enviar a ManyChat de forma asíncrona (no bloquear)
      sendToManyChat({
        eventType,
        eventData: {
          ...eventData,
          page: browserInfo.pageUrl,
          referrer: browserInfo.referrer,
          // Enviar atribución a ManyChat también
          traffic_source: trafficSource?.displayName,
          utm_source: attribution.utm_source,
          utm_campaign: attribution.utm_campaign,
        },
        email: userEmail || undefined,
        phone: userPhone || undefined,
      }).catch(err => console.error('ManyChat track error:', err))
    }
    
  } catch (_) {
    // No llenar consola en producción por fallos de tracking
  }
}

/**
 * Envía evento a ManyChat via API
 */
async function sendToManyChat(data: {
  eventType: string
  eventData?: any
  email?: string
  phone?: string
}) {
  try {
    await fetch('/api/manychat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'track_event',
        ...data,
      }),
    })
  } catch (error) {
    console.error('Error sending to ManyChat:', error)
  }
}

/**
 * Sincroniza usuario con ManyChat (llamar en registro/login)
 */
export async function syncUserWithManyChat(data: {
  email: string
  phone?: string
  firstName?: string
  lastName?: string
  country?: string
  userId?: string
}) {
  try {
    // Guardar info para tracking futuro
    setUserTrackingInfo(data.email, data.phone)
    
    // Sincronizar con ManyChat
    const response = await fetch('/api/manychat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync_user',
        ...data,
        referrer: document.referrer || '(direct)',
      }),
    })
    
    return await response.json()
  } catch (error) {
    console.error('Error syncing with ManyChat:', error)
    return null
  }
}

/**
 * Trackea compra en ManyChat
 */
export async function trackPurchaseWithManyChat(data: {
  email: string
  phone?: string
  packName: string
  amount: number
  currency: string
  paymentMethod: 'card' | 'oxxo' | 'spei' | 'paypal'
}) {
  try {
    const response = await fetch('/api/manychat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'track_purchase',
        ...data,
      }),
    })
    
    return await response.json()
  } catch (error) {
    console.error('Error tracking purchase in ManyChat:', error)
    return null
  }
}

// ==========================================
// EVENTOS ESPECÍFICOS CON NOMBRES CONSISTENTES
// Todos estos eventos se guardan en:
// 1. Supabase (user_events)
// 2. ManyChat (si hay email/teléfono)
// 3. Meta Pixel (Facebook)
// ==========================================

export const trackPageView = (pageName: string, email?: string, phone?: string) => {
  // Supabase + ManyChat
  trackEvent({
    eventType: 'page_view',
    eventName: `Visitó ${pageName}`,
    eventData: { page: pageName },
    email,
    phone,
  })
  
  // Facebook Pixel (PageView ya se trackea automáticamente, pero esto es adicional)
  fbTrackPageView()
}

export const trackCTAClick = (ctaText: string, location: string, email?: string, phone?: string) => {
  // Supabase + ManyChat
  trackEvent({
    eventType: 'click_cta',
    eventName: `Click en "${ctaText}"`,
    eventData: { cta: ctaText, location },
    email,
    phone,
  })
  
  // Facebook Pixel - Custom Event
  fbTrackCTAClick(ctaText, location)
}

export const trackViewPack = (packId: string, packName: string, price: number, email?: string, phone?: string) => {
  // Supabase + ManyChat
  trackEvent({
    eventType: 'view_pack',
    eventName: `Vio pack: ${packName}`,
    eventData: { pack_id: packId, pack_name: packName, price },
    email,
    phone,
  })
  
  // Facebook Pixel - ViewContent (muy importante para retargeting)
  fbTrackViewContent({
    content_name: packName,
    content_ids: [packId],
    content_type: 'product',
    value: price,
    currency: 'MXN',
  })
  
  // Facebook Pixel - Custom Event
  fbTrackViewPack(packId, packName, price)
}

export const trackAddToCart = (packId: string, packName: string, price: number, email?: string, phone?: string) => {
  // Supabase + ManyChat
  trackEvent({
    eventType: 'add_to_cart',
    eventName: `Agregó al carrito: ${packName}`,
    eventData: { pack_id: packId, pack_name: packName, price },
    email,
    phone,
  })
  
  // Facebook Pixel - AddToCart (importante para retargeting)
  fbTrackAddToCart({
    content_name: packName,
    content_ids: [packId],
    content_type: 'product',
    value: price,
    currency: 'MXN',
  })
}

export const trackStartCheckout = (packSlug: string, packName?: string, price?: number, email?: string, phone?: string) => {
  // Supabase + ManyChat
  trackEvent({
    eventType: 'start_checkout',
    eventName: 'Inició checkout',
    eventData: { pack: packSlug, pack_name: packName, price },
    email,
    phone,
  })
  
  // Facebook Pixel - InitiateCheckout (muy importante)
  fbTrackInitiateCheckout({
    content_name: packName,
    content_ids: [packSlug],
    content_type: 'product',
    num_items: 1,
    value: price || 350,
    currency: 'MXN',
  })
}

export const trackSelectPaymentMethod = (method: string, email?: string, phone?: string) => {
  // Supabase + ManyChat
  trackEvent({
    eventType: 'select_payment_method',
    eventName: `Seleccionó método: ${method}`,
    eventData: { method },
    email,
    phone,
  })
  
  // Facebook Pixel - Custom Event
  fbTrackSelectPaymentMethod(method)
}

export const trackPaymentIntent = (packSlug: string, amount: number, currency: string, email?: string, phone?: string) => {
  // Supabase + ManyChat
  trackEvent({
    eventType: 'payment_intent',
    eventName: 'Creó intención de pago',
    eventData: { pack: packSlug, amount, currency },
    email,
    phone,
  })
  
  // Facebook Pixel - AddPaymentInfo
  fbTrackAddPaymentInfo({
    content_ids: [packSlug],
    content_type: 'product',
    value: amount,
    currency: currency,
  })
}

export const trackPaymentSuccess = (
  userId: string,
  packId: number,
  amount: number,
  packName?: string,
  currency?: string,
  email?: string,
  phone?: string,
  orderId?: string
) => {
  trackEvent({
    eventType: 'payment_success',
    eventName: 'Pago exitoso',
    eventData: { pack_id: packId, amount, pack_name: packName },
    userId,
    email,
    phone,
  })

  // Facebook Pixel - Purchase con event_id = orderId para deduplicación con CAPI
  fbTrackPurchase(
    {
      content_name: packName,
      content_ids: [String(packId)],
      content_type: 'product',
      num_items: 1,
      value: amount,
      currency: currency || 'MXN',
      order_id: orderId,
      event_id: orderId,
    },
    { email, phone, externalId: userId }
  )
}

export const trackLead = (source: string, email?: string, phone?: string) => {
  // Supabase + ManyChat
  trackEvent({
    eventType: 'lead',
    eventName: `Nuevo lead desde: ${source}`,
    eventData: { source },
    email,
    phone,
  })
  
  // Facebook Pixel - Lead (importante para ads)
  fbTrackLead({
    content_name: source,
  })
}

export const trackRegistration = (userId: string, method: 'email' | 'google', email?: string, phone?: string) => {
  // Supabase + ManyChat
  trackEvent({
    eventType: 'registration',
    eventName: 'Registro completado',
    eventData: { method },
    userId,
    email,
    phone,
  })
  
  // Facebook Pixel - CompleteRegistration (importante)
  fbTrackCompleteRegistration({
    content_name: 'Bear Beat Registration',
    status: 'registered',
  })
}

export const trackLogin = (userId: string, email?: string, phone?: string) => {
  // Supabase + ManyChat
  trackEvent({
    eventType: 'login',
    eventName: 'Inicio de sesión',
    userId,
    email,
    phone,
  })
  
  // Facebook Pixel - Custom Event
  fbLogin('email')
}

// ==========================================
// EVENTOS ADICIONALES PARA TRACKING COMPLETO
// ==========================================

export const trackDownloadStarted = (packName: string, fileType: 'web' | 'ftp', email?: string, phone?: string) => {
  // Supabase + ManyChat
  trackEvent({
    eventType: 'download_started',
    eventName: `Inició descarga (${fileType})`,
    eventData: { pack: packName, type: fileType },
    email,
    phone,
  })
  
  // Facebook Pixel - Custom Event
  fbTrackStartDownload(packName, fileType)
}

export const trackDownloadCompleted = (packName: string, fileType: 'web' | 'ftp', email?: string, phone?: string) => {
  // Supabase + ManyChat
  trackEvent({
    eventType: 'download_completed',
    eventName: `Completó descarga (${fileType})`,
    eventData: { pack: packName, type: fileType },
    email,
    phone,
  })
  
  // Facebook Pixel - Custom Event
  fbTrackCompleteDownload(packName, fileType)
}

export const trackVideoPreview = (videoId: string, videoName: string, email?: string, phone?: string) => {
  // Supabase + ManyChat
  trackEvent({
    eventType: 'video_preview',
    eventName: `Vio preview: ${videoName}`,
    eventData: { video_id: videoId, video_name: videoName },
    email,
    phone,
  })
  
  // Facebook Pixel - ViewContent + Custom Event
  fbTrackViewContent({
    content_name: videoName,
    content_ids: [videoId],
    content_type: 'video',
  })
  fbTrackVideoPreview(videoId, videoName)
}

export const trackFAQClick = (faqQuestion: string, email?: string, phone?: string) => {
  // Supabase + ManyChat
  trackEvent({
    eventType: 'faq_click',
    eventName: `Abrió FAQ: ${faqQuestion.slice(0, 30)}...`,
    eventData: { question: faqQuestion },
    email,
    phone,
  })
  
  // Facebook Pixel - Custom Event
  fbTrackFAQView(faqQuestion)
}

export const trackCartAbandoned = (packSlug: string, stage: string, value?: number, email?: string, phone?: string) => {
  // Supabase + ManyChat
  trackEvent({
    eventType: 'cart_abandoned',
    eventName: `Abandonó carrito en: ${stage}`,
    eventData: { pack: packSlug, stage, value },
    email,
    phone,
  })
  
  // Facebook Pixel - Custom Event (muy importante para retargeting)
  fbTrackCartAbandonment(packSlug, value || 350, stage)
}

export const trackSupportContacted = (method: 'whatsapp' | 'email' | 'chat', email?: string, phone?: string) => {
  // Supabase + ManyChat
  trackEvent({
    eventType: 'support_contacted',
    eventName: `Contactó soporte vía ${method}`,
    eventData: { method },
    email,
    phone,
  })
  
  // Facebook Pixel - Contact
  fbTrackContact()
}

export const trackReferral = (source: string, campaign?: string, email?: string, phone?: string) => {
  // Supabase + ManyChat
  trackEvent({
    eventType: 'referral',
    eventName: `Llegó desde: ${source}`,
    eventData: { source, campaign },
    email,
    phone,
  })
}
