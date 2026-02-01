'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  initAttribution, 
  getTrafficSource,
  getAttributionForAPI,
  type AttributionData 
} from '@/lib/attribution'

/**
 * Componente que captura la atribución al cargar la página
 * Incluir en el layout principal
 */
export function AttributionTracker() {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Capturar atribución al cargar
    const attribution = initAttribution()
    const trafficSource = getTrafficSource(attribution)
    
    console.log('📊 Attribution captured:', {
      source: trafficSource.displayName,
      isAd: trafficSource.isAd,
      campaign: trafficSource.campaign,
      device: attribution.device_type,
    })
    
    // Enviar a nuestro tracking si es primera visita o viene de anuncio
    if (attribution.fbclid || attribution.gclid || attribution.ttclid || attribution.utm_campaign) {
      sendAttributionToServer(attribution)
    }
  }, [searchParams]) // Re-ejecutar si cambian los parámetros
  
  return null // No renderiza nada
}

/**
 * Envía la atribución al servidor para guardar en Supabase
 */
async function sendAttributionToServer(attribution: AttributionData) {
  try {
    await fetch('/api/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'attribution',
        eventName: 'Attribution Captured',
        eventData: {
          ...attribution,
          traffic_source: getTrafficSource(attribution),
        },
      }),
    })
  } catch (error) {
    console.error('Error sending attribution:', error)
  }
}

/**
 * Hook para obtener la atribución actual
 */
export function useAttribution() {
  const attribution = typeof window !== 'undefined' 
    ? initAttribution() 
    : null
    
  return {
    attribution,
    trafficSource: attribution ? getTrafficSource(attribution) : null,
    forAPI: attribution ? getAttributionForAPI() : {},
  }
}

export default AttributionTracker
