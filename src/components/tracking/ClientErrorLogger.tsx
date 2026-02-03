'use client'

import { useEffect } from 'react'

/**
 * Registra errores de JavaScript y promesas rechazadas no capturadas
 * y los envía a /api/track-event → user_events para verlos en Admin → Tracking.
 * Así puedes correlacionar bugs reportados por usuarios con el mismo error.
 */
export function ClientErrorLogger() {
  useEffect(() => {
    const send = (eventType: string, eventName: string, eventData: Record<string, unknown>) => {
      fetch('/api/track-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          eventName: eventName.slice(0, 250),
          eventData: {
            ...eventData,
            pageUrl: typeof window !== 'undefined' ? window.location.href : '',
          },
        }),
        keepalive: true,
      }).catch(() => {})
    }

    const onError = (event: ErrorEvent) => {
      send('client_error', event.message || 'Unknown error', {
        message: (event.message || '').slice(0, 500),
        filename: event.filename || '',
        lineno: event.lineno,
        colno: event.colno,
        stack: (event.error?.stack || '').slice(0, 1500),
      })
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      const msg =
        event.reason?.message || String(event.reason || 'Unhandled rejection').slice(0, 500)
      send('client_promise_rejection', msg, {
        message: msg,
        stack: event.reason?.stack?.slice(0, 1500) || '',
      })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
