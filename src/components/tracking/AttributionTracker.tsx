'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  detectReferrerSource,
  setAttributionCookieClient,
  getAttributionCookieClient,
  isRetargetingCampaign,
  getTrafficSource,
  getAttributionForAPI,
  type AttributionData,
} from '@/lib/attribution'

/**
 * "The Hound" – Tracker de atribución First-Touch.
 * Se monta en layout.tsx. Guarda UTMs/ref en cookie bearbeat_attribution (30 días).
 * Regla de Oro: si ya existe cookie, NO sobrescribir (First Touch),
 * salvo que la visita sea explícitamente de campaña de retargeting.
 */
export function AttributionTracker() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? window.location.search)
    const hasUtm =
      params.get('utm_source') ||
      params.get('utm_medium') ||
      params.get('utm_campaign') ||
      params.get('utm_content') ||
      params.get('utm_term')
    const hasRef = params.get('ref')
    const existing = getAttributionCookieClient()

    // Referrer como fuente si no hay UTMs (dominio: google.com, facebook.com, etc.)
    const referrer = typeof document !== 'undefined' ? document.referrer : ''
    const referrerData = referrer ? detectReferrerSource(referrer) : null
    let referrerDomain: string | null = referrerData?.source ?? null
    if (!referrerDomain && referrer) {
      try {
        referrerDomain = new URL(referrer).hostname.replace('www.', '')
      } catch {
        referrerDomain = null
      }
    }

    const payload: {
      utm_source?: string
      utm_medium?: string
      utm_campaign?: string
      utm_content?: string
      utm_term?: string
      ref?: string
      referrer_domain?: string
    } = {}

    if (hasUtm || hasRef) {
      if (hasUtm) {
        payload.utm_source = params.get('utm_source') ?? undefined
        payload.utm_medium = params.get('utm_medium') ?? undefined
        payload.utm_campaign = params.get('utm_campaign') ?? undefined
        payload.utm_content = params.get('utm_content') ?? undefined
        payload.utm_term = params.get('utm_term') ?? undefined
      }
      if (hasRef) payload.ref = params.get('ref') ?? undefined
      // First-Touch: solo guardar si no hay cookie, o si es retargeting (permitir sobrescribir)
      if (!existing || isRetargetingCampaign(params)) {
        setAttributionCookieClient(payload)
      }
    } else if (referrerDomain && !existing) {
      // Sin UTMs pero hay referrer: guardar dominio como fuente solo si es primera vez
      payload.utm_source = referrerData?.source ?? referrerDomain.split('.')[0] ?? referrerDomain
      payload.referrer_domain = referrerDomain
      if (referrerData) payload.utm_medium = 'referral'
      setAttributionCookieClient(payload)
    }

    // Enviar a tracking interno si hay señal de ads o campaña
    if (hasUtm || hasRef || referrerData) {
      const attribution: AttributionData = {
        utm_source: payload.utm_source ?? existing?.utm_source,
        utm_medium: payload.utm_medium ?? existing?.utm_medium,
        utm_campaign: payload.utm_campaign ?? existing?.utm_campaign,
        referrer_source: referrerData?.source,
      }
      const trafficSource = getTrafficSource(attribution)
      if (trafficSource.source !== 'direct') {
        sendAttributionToServer(attribution)
      }
    }
  }, [searchParams])

  return null
}

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
          traffic_source: getAttributionForAPI(),
        },
      }),
    })
  } catch (_) {
    // no bloquear por fallos de tracking
  }
}

export function useAttribution() {
  const attribution =
    typeof window !== 'undefined' ? getAttributionCookieClient() : null
  return {
    attribution,
    forAPI: attribution
      ? {
          utm_source: attribution.utm_source,
          utm_medium: attribution.utm_medium,
          utm_campaign: attribution.utm_campaign,
        }
      : {},
  }
}

export default AttributionTracker
