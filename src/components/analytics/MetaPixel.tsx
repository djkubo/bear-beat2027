'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

// En producción no cargar el pixel por defecto (evita "unavailable" en consola). Para activar: NEXT_PUBLIC_META_PIXEL_ENABLED=true
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1325763147585869'
const META_PIXEL_DISABLED = process.env.NEXT_PUBLIC_META_PIXEL_DISABLED === 'true'
const META_PIXEL_ENABLED_IN_PROD = process.env.NEXT_PUBLIC_META_PIXEL_ENABLED === 'true'
const IS_PROD = process.env.NODE_ENV === 'production'
const DONT_LOAD_PIXEL = META_PIXEL_DISABLED || !META_PIXEL_ID || (IS_PROD && !META_PIXEL_ENABLED_IN_PROD)

// Declaración de tipos para fbq
declare global {
  interface Window {
    fbq: any
    _fbq: any
  }
}

/**
 * Genera un event_id único para deduplicación entre Pixel y CAPI
 * CRÍTICO: Este mismo ID debe usarse en el Pixel (eventID) y en CAPI (event_id)
 */
export function generateEventId(): string {
  return `bb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Obtiene las cookies _fbp y _fbc para enviar a CAPI
 */
function getFbCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === 'undefined') return {}
  
  const cookies: Record<string, string> = {}
  document.cookie.split(';').forEach(cookie => {
    const [key, value] = cookie.split('=').map(s => s.trim())
    if (key && value) cookies[key] = value
  })
  
  return {
    fbp: cookies._fbp,
    fbc: cookies._fbc,
  }
}

/**
 * Envía evento a Facebook CAPI (server-side)
 * Se usa junto con el Pixel para tracking redundante
 */
async function sendToCAPI(data: {
  eventName: string
  eventId: string
  userData?: {
    email?: string
    phone?: string
    firstName?: string
    lastName?: string
    country?: string
    externalId?: string
  }
  customData?: Record<string, any>
}) {
  try {
    const fbCookies = getFbCookies()
    
    await fetch('/api/facebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: data.eventName,
        eventId: data.eventId,
        eventSourceUrl: window.location.href,
        userData: {
          ...data.userData,
          fbp: fbCookies.fbp,
          fbc: fbCookies.fbc,
        },
        customData: data.customData,
      }),
    })
  } catch (error) {
    console.error('Error sending to CAPI:', error)
  }
}

/**
 * Meta Pixel Component
 * Instala el pixel de Facebook/Meta y trackea PageView automáticamente
 */
export function MetaPixel() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Trackear cambios de página (SPA navigation) con deduplicación
  useEffect(() => {
    if (typeof window === 'undefined' || !window.fbq || META_PIXEL_DISABLED) return
    try {
      const eventId = generateEventId()
      window.fbq('track', 'PageView', {}, { eventID: eventId })
      sendToCAPI({ eventName: 'PageView', eventId })
    } catch (_) {
      // Pixel puede estar "unavailable" por permisos de tráfico en Meta; no romper la app
    }
  }, [pathname, searchParams])

  // No cargar pixel si está deshabilitado, no hay ID, o en producción sin ENABLED (evita "unavailable" en consola)
  if (DONT_LOAD_PIXEL) return null

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            try {
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${META_PIXEL_ID}');
              var initialEventId = 'bb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
              fbq('track', 'PageView', {}, { eventID: initialEventId });
              fetch('/api/facebook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  eventName: 'PageView',
                  eventId: initialEventId,
                  eventSourceUrl: window.location.href
                })
              }).catch(function() {});
            } catch (e) {}
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  )
}

// ==========================================
// FUNCIONES DE TRACKING PARA META PIXEL + CAPI
// Todas las funciones envían al Pixel (cliente) Y a CAPI (servidor)
// con el mismo event_id para deduplicación perfecta
// ==========================================

/**
 * Verifica si fbq está disponible
 */
function isFbqAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.fbq === 'function'
}

/**
 * Trackea evento en Pixel + CAPI con deduplicación (genera event_id)
 */
function trackWithDedup(
  eventName: string,
  pixelData: Record<string, any> = {},
  userData?: {
    email?: string
    phone?: string
    firstName?: string
    lastName?: string
    country?: string
    externalId?: string
  }
) {
  const eventId = generateEventId()
  return trackWithEventId(eventName, pixelData, eventId, userData)
}

/**
 * Trackea evento con event_id dado (para Purchase: mismo ID que CAPI en webhook)
 */
function trackWithEventId(
  eventName: string,
  pixelData: Record<string, any>,
  eventId: string,
  userData?: {
    email?: string
    phone?: string
    firstName?: string
    lastName?: string
    country?: string
    externalId?: string
  }
) {
  if (isFbqAvailable()) {
    window.fbq('track', eventName, pixelData, { eventID: eventId })
  }
  sendToCAPI({
    eventName,
    eventId,
    userData,
    customData: pixelData,
  })
  return eventId
}

/**
 * Trackea evento custom en Pixel + CAPI con deduplicación
 */
function trackCustomWithDedup(
  eventName: string,
  pixelData: Record<string, any> = {},
  userData?: {
    email?: string
    phone?: string
    firstName?: string
    lastName?: string
    country?: string
    externalId?: string
  }
) {
  const eventId = generateEventId()
  
  // 1. Enviar al Pixel (cliente) con eventID
  if (isFbqAvailable()) {
    window.fbq('trackCustom', eventName, pixelData, { eventID: eventId })
  }
  
  // 2. Enviar a CAPI (servidor) con el mismo event_id
  sendToCAPI({
    eventName,
    eventId,
    userData,
    customData: pixelData,
  })
  
  return eventId
}

/**
 * PageView - Ya se trackea automáticamente, pero puedes llamarlo manualmente
 */
export function fbTrackPageView(userData?: { email?: string; phone?: string }) {
  return trackWithDedup('PageView', {}, userData)
}

/**
 * ViewContent - Cuando el usuario ve un producto/contenido
 */
export function fbTrackViewContent(data: {
  content_name: string
  content_category?: string
  content_ids?: string[]
  content_type?: string
  value?: number
  currency?: string
}, userData?: { email?: string; phone?: string; externalId?: string }) {
  return trackWithDedup('ViewContent', {
    content_name: data.content_name,
    content_category: data.content_category,
    content_ids: data.content_ids,
    content_type: data.content_type || 'product',
    value: data.value,
    currency: data.currency || 'MXN',
  }, userData)
}

/**
 * AddToCart - Cuando el usuario agrega algo al carrito
 */
export function fbTrackAddToCart(data: {
  content_name: string
  content_ids?: string[]
  content_type?: string
  value: number
  currency?: string
}, userData?: { email?: string; phone?: string; externalId?: string }) {
  return trackWithDedup('AddToCart', {
    content_name: data.content_name,
    content_ids: data.content_ids,
    content_type: data.content_type || 'product',
    value: data.value,
    currency: data.currency || 'MXN',
  }, userData)
}

/**
 * InitiateCheckout - Cuando el usuario inicia el checkout
 */
export function fbTrackInitiateCheckout(data: {
  content_name?: string
  content_ids?: string[]
  content_type?: string
  num_items?: number
  value: number
  currency?: string
}, userData?: { email?: string; phone?: string; externalId?: string }) {
  return trackWithDedup('InitiateCheckout', {
    content_name: data.content_name,
    content_ids: data.content_ids,
    content_type: data.content_type || 'product',
    num_items: data.num_items || 1,
    value: data.value,
    currency: data.currency || 'MXN',
  }, userData)
}

/**
 * AddPaymentInfo - Cuando el usuario agrega info de pago
 */
export function fbTrackAddPaymentInfo(data: {
  content_ids?: string[]
  content_type?: string
  value?: number
  currency?: string
}, userData?: { email?: string; phone?: string; externalId?: string }) {
  return trackWithDedup('AddPaymentInfo', {
    content_ids: data.content_ids,
    content_type: data.content_type || 'product',
    value: data.value,
    currency: data.currency || 'MXN',
  }, userData)
}

/**
 * Purchase - Cuando el usuario completa una compra (EL MÁS IMPORTANTE)
 * Envía siempre value y currency reales para que Meta identifique clientes High Ticket (ballena).
 * Si se pasa event_id (p. ej. session.id o payment_intent.id), se usa para deduplicación con CAPI.
 */
export function fbTrackPurchase(data: {
  content_name?: string
  content_ids?: string[]
  content_type?: string
  num_items?: number
  value: number
  currency?: string
  order_id?: string
  event_id?: string
}, userData?: { email?: string; phone?: string; firstName?: string; lastName?: string; externalId?: string }) {
  const pixelData = {
    content_name: data.content_name,
    content_ids: data.content_ids,
    content_type: data.content_type || 'product',
    num_items: data.num_items || 1,
    value: data.value,
    currency: (data.currency || 'MXN').toUpperCase(),
    order_id: data.order_id,
  }
  if (data.event_id) {
    return trackWithEventId('Purchase', pixelData, data.event_id, userData)
  }
  return trackWithDedup('Purchase', pixelData, userData)
}

/**
 * Lead - Cuando el usuario se convierte en lead (da email/teléfono)
 */
export function fbTrackLead(data?: {
  content_name?: string
  content_category?: string
  value?: number
  currency?: string
}, userData?: { email?: string; phone?: string }) {
  return trackWithDedup('Lead', {
    content_name: data?.content_name,
    content_category: data?.content_category,
    value: data?.value,
    currency: data?.currency || 'MXN',
  }, userData)
}

/**
 * CompleteRegistration - Cuando el usuario completa el registro
 */
export function fbTrackCompleteRegistration(data?: {
  content_name?: string
  status?: string
  value?: number
  currency?: string
}, userData?: { email?: string; phone?: string; firstName?: string; lastName?: string; externalId?: string }) {
  return trackWithDedup('CompleteRegistration', {
    content_name: data?.content_name,
    status: data?.status || 'registered',
    value: data?.value,
    currency: data?.currency || 'MXN',
  }, userData)
}

/**
 * Search - Cuando el usuario busca algo
 */
export function fbTrackSearch(data: {
  search_string: string
  content_category?: string
  content_ids?: string[]
}, userData?: { email?: string; phone?: string }) {
  return trackWithDedup('Search', {
    search_string: data.search_string,
    content_category: data.content_category,
    content_ids: data.content_ids,
  }, userData)
}

/**
 * Contact - Cuando el usuario intenta contactar
 */
export function fbTrackContact(userData?: { email?: string; phone?: string }) {
  return trackWithDedup('Contact', {}, userData)
}

/**
 * StartTrial - Cuando el usuario inicia una prueba
 */
export function fbTrackStartTrial(data?: {
  value?: number
  currency?: string
  predicted_ltv?: number
}, userData?: { email?: string; phone?: string }) {
  return trackWithDedup('StartTrial', {
    value: data?.value,
    currency: data?.currency || 'MXN',
    predicted_ltv: data?.predicted_ltv,
  }, userData)
}

/**
 * Subscribe - Cuando el usuario se suscribe
 */
export function fbTrackSubscribe(data?: {
  value?: number
  currency?: string
  predicted_ltv?: number
}, userData?: { email?: string; phone?: string }) {
  return trackWithDedup('Subscribe', {
    value: data?.value,
    currency: data?.currency || 'MXN',
    predicted_ltv: data?.predicted_ltv,
  }, userData)
}

// ==========================================
// EVENTOS PERSONALIZADOS PARA BEAR BEAT
// Todos con deduplicación Pixel + CAPI
// ==========================================

/**
 * Evento personalizado - Click en CTA
 */
export function fbTrackCTAClick(ctaName: string, location: string, userData?: { email?: string; phone?: string }) {
  return trackCustomWithDedup('CTAClick', {
    cta_name: ctaName,
    location: location,
  }, userData)
}

/**
 * Evento personalizado - Ver preview de video
 */
export function fbTrackVideoPreview(videoId: string, videoName: string, userData?: { email?: string; phone?: string }) {
  return trackCustomWithDedup('VideoPreview', {
    video_id: videoId,
    video_name: videoName,
  }, userData)
}

/**
 * Evento personalizado - Seleccionar método de pago
 */
export function fbTrackSelectPaymentMethod(method: string, userData?: { email?: string; phone?: string }) {
  return trackCustomWithDedup('SelectPaymentMethod', {
    payment_method: method,
  }, userData)
}

/**
 * Evento personalizado - Iniciar descarga
 */
export function fbTrackStartDownload(packName: string, downloadType: 'web' | 'ftp', userData?: { email?: string; phone?: string }) {
  return trackCustomWithDedup('StartDownload', {
    pack_name: packName,
    download_type: downloadType,
  }, userData)
}

/**
 * Evento personalizado - Completar descarga
 */
export function fbTrackCompleteDownload(packName: string, downloadType: 'web' | 'ftp', userData?: { email?: string; phone?: string }) {
  return trackCustomWithDedup('CompleteDownload', {
    pack_name: packName,
    download_type: downloadType,
  }, userData)
}

/**
 * Evento personalizado - Ver FAQ
 */
export function fbTrackFAQView(question: string, userData?: { email?: string; phone?: string }) {
  return trackCustomWithDedup('FAQView', {
    question: question,
  }, userData)
}

/**
 * Evento personalizado - Scroll hasta sección
 */
export function fbTrackScrollToSection(sectionName: string, userData?: { email?: string; phone?: string }) {
  return trackCustomWithDedup('ScrollToSection', {
    section: sectionName,
  }, userData)
}

/**
 * Evento personalizado - Tiempo en página
 */
export function fbTrackTimeOnPage(seconds: number, pageName: string, userData?: { email?: string; phone?: string }) {
  return trackCustomWithDedup('TimeOnPage', {
    seconds: seconds,
    page: pageName,
  }, userData)
}

/**
 * Evento personalizado - Abandono de carrito
 */
export function fbTrackCartAbandonment(packName: string, value: number, stage: string, userData?: { email?: string; phone?: string }) {
  return trackCustomWithDedup('CartAbandonment', {
    pack_name: packName,
    value: value,
    stage: stage,
    currency: 'MXN',
  }, userData)
}

/**
 * Evento personalizado - Login exitoso
 */
export function fbTrackLogin(method: string, userData?: { email?: string; phone?: string; externalId?: string }) {
  return trackCustomWithDedup('Login', {
    method: method,
  }, userData)
}

/**
 * Evento personalizado - Ver pack específico
 */
export function fbTrackViewPack(packId: string, packName: string, price: number, userData?: { email?: string; phone?: string }) {
  return trackCustomWithDedup('ViewPack', {
    pack_id: packId,
    pack_name: packName,
    price: price,
    currency: 'MXN',
  }, userData)
}

/**
 * Evento personalizado - Compartir en redes
 */
export function fbTrackShare(platform: string, contentType: string, userData?: { email?: string; phone?: string }) {
  return trackCustomWithDedup('Share', {
    platform: platform,
    content_type: contentType,
  }, userData)
}

export default MetaPixel
