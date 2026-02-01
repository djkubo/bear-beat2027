'use client'

import Script from 'next/script'

const MANYCHAT_PAGE_ID = process.env.NEXT_PUBLIC_MANYCHAT_PAGE_ID || '104901938679498'

/**
 * ManyChat Widget Component
 * Incluye el pixel de ManyChat para tracking y el widget de chat
 */
export function ManyChatWidget() {
  return (
    <Script
      id="manychat-widget"
      src={`//widget.manychat.com/${MANYCHAT_PAGE_ID}.js`}
      strategy="lazyOnload"
    />
  )
}

/**
 * ManyChat Pixel para tracking de eventos
 * Este componente puede usarse para tracking específico
 */
export function ManyChatPixel() {
  return (
    <Script
      id="manychat-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          window.mcAsyncInit = function() {
            MC.init({
              page_id: "${MANYCHAT_PAGE_ID}",
            });
          };
          
          (function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s);
            js.id = id;
            js.src = "//widget.manychat.com/${MANYCHAT_PAGE_ID}.js";
            fjs.parentNode.insertBefore(js, fjs);
          }(document, 'script', 'manychat-jssdk'));
        `,
      }}
    />
  )
}

/**
 * Hook para interactuar con ManyChat desde el cliente
 */
export function useManyChat() {
  const syncUser = async (data: {
    email: string
    phone?: string
    firstName?: string
    lastName?: string
    country?: string
    userId?: string
    referrer?: string
  }) => {
    try {
      const response = await fetch('/api/manychat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_user',
          ...data,
        }),
      })
      return await response.json()
    } catch (error) {
      console.error('ManyChat sync error:', error)
      return null
    }
  }
  
  const trackEvent = async (data: {
    email?: string
    phone?: string
    eventType: string
    eventData?: Record<string, any>
  }) => {
    try {
      const response = await fetch('/api/manychat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'track_event',
          ...data,
        }),
      })
      return await response.json()
    } catch (error) {
      console.error('ManyChat track error:', error)
      return null
    }
  }
  
  const trackPurchase = async (data: {
    email: string
    phone?: string
    packName: string
    amount: number
    currency: string
    paymentMethod: 'card' | 'oxxo' | 'spei' | 'paypal'
  }) => {
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
      console.error('ManyChat purchase track error:', error)
      return null
    }
  }
  
  const addTag = async (subscriberId: string, tagName: string) => {
    try {
      const response = await fetch('/api/manychat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_tag',
          subscriberId,
          tagName,
        }),
      })
      return await response.json()
    } catch (error) {
      console.error('ManyChat addTag error:', error)
      return null
    }
  }
  
  const sendFlow = async (subscriberId: string, flowNamespace: string) => {
    try {
      const response = await fetch('/api/manychat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_flow',
          subscriberId,
          flowNamespace,
        }),
      })
      return await response.json()
    } catch (error) {
      console.error('ManyChat sendFlow error:', error)
      return null
    }
  }
  
  const findSubscriber = async (field: 'email' | 'phone' | 'whatsapp_phone', value: string) => {
    try {
      const response = await fetch('/api/manychat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'find_subscriber',
          field,
          value,
        }),
      })
      return await response.json()
    } catch (error) {
      console.error('ManyChat findSubscriber error:', error)
      return null
    }
  }
  
  return {
    syncUser,
    trackEvent,
    trackPurchase,
    addTag,
    sendFlow,
    findSubscriber,
  }
}

export default ManyChatWidget
