'use client'

import React from 'react'

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Captura errores de render de React y los envía a user_events
 * para verlos en Admin → Tracking (event_type: react_error).
 * Muestra una pantalla de fallback en lugar de pantalla blanca.
 */
export class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    fetch('/api/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'react_error',
        eventName: error.message?.slice(0, 250) || 'React error',
        eventData: {
          message: error.message?.slice(0, 500),
          stack: error.stack?.slice(0, 1500),
          componentStack: info.componentStack?.slice(0, 1500),
          pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        },
      }),
      keepalive: true,
    }).catch(() => {})
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <p className="text-6xl">🐻</p>
            <h1 className="text-xl font-bold text-white">
              Algo salió mal
            </h1>
            <p className="text-gray-400 text-sm">
              Ya registramos el error para corregirlo. Recarga la página o vuelve al inicio.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-bear-blue text-bear-black font-bold hover:bg-bear-blue/90"
              >
                Recargar
              </button>
              <a
                href="/"
                className="px-4 py-2 rounded-xl border border-white/20 text-white font-bold hover:bg-white/5"
              >
                Ir al inicio
              </a>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="mt-4 p-4 rounded-lg bg-zinc-900 text-xs text-left overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
