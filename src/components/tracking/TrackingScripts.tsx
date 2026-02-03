'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || ''
const MANYCHAT_ID = process.env.NEXT_PUBLIC_MANYCHAT_ID || process.env.NEXT_PUBLIC_MANYCHAT_PAGE_ID || ''
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || ''
const DISABLED = process.env.NEXT_PUBLIC_META_PIXEL_DISABLED === 'true'

declare global {
  interface Window {
    fbq: any
    _fbq: any
  }
}

/**
 * Scripts de tracking: Facebook Pixel + ManyChat.
 * PageView se dispara en cada cambio de ruta (App Router).
 * Estrategia afterInteractive para no bloquear la carga.
 */
export function TrackingScripts() {
  const pathname = usePathname()

  useEffect(() => {
    if (DISABLED || !PIXEL_ID || typeof window === 'undefined' || !window.fbq) return
    try {
      const eventId = `bb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      window.fbq('track', 'PageView', {}, { eventID: eventId })
    } catch (_) {
      // Pixel puede estar unavailable por permisos en Meta
    }
  }, [pathname])

  return (
    <>
      {/* Facebook Pixel */}
      {PIXEL_ID && !DISABLED && (
        <Script
          id="fb-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s){
                if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
                t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)
              }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init','${PIXEL_ID}');
              fbq('track','PageView',{},{eventID:'bb_'+Date.now()+'_'+Math.random().toString(36).slice(2,9)});
            `,
          }}
        />
      )}

      {/* ManyChat Widget */}
      {MANYCHAT_ID && (
        <Script
          id="manychat-widget"
          src={`https://widget.manychat.com/${MANYCHAT_ID}.js`}
          strategy="afterInteractive"
        />
      )}

      {/* Microsoft Clarity: mapas de calor + grabación de sesiones (gratis) */}
      {CLARITY_ID && (
        <Script id="clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_ID}");
          `}
        </Script>
      )}
    </>
  )
}
