'use client'

import { useState } from 'react'

/**
 * Página de un solo uso: tras iniciar sesión con test@bearbeat.com,
 * entra aquí y pulsa el botón para asignarte rol admin en la BD que usa esta app.
 * Luego ve a /admin.
 */
export default function FixAdminPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleFix() {
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/setup/make-admin', { method: 'POST', credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStatus('ok')
        setMessage(data.message || 'Listo. Ve a /admin')
      } else {
        setStatus('error')
        setMessage(data.error || res.statusText || 'Error')
      }
    } catch (e) {
      setStatus('error')
      setMessage(String(e))
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full text-center">
        <h1 className="text-xl font-semibold mb-2">Asignar admin (test@bearbeat.com)</h1>
        <p className="text-muted-foreground text-sm mb-4">
          Inicia sesión con test@bearbeat.com y pulsa el botón. Luego entra a /admin.
        </p>
        <button
          onClick={handleFix}
          disabled={status === 'loading'}
          className="px-4 py-2 bg-bear-blue text-white rounded-lg font-medium disabled:opacity-50"
        >
          {status === 'loading' ? 'Espera...' : 'Asignarme rol admin'}
        </button>
        {message && (
          <p className={`mt-4 text-sm ${status === 'error' ? 'text-red-500' : 'text-green-600'}`}>
            {message}
          </p>
        )}
        {status === 'ok' && (
          <a href="/admin" className="inline-block mt-4 text-bear-blue hover:underline">
            Ir al panel admin →
          </a>
        )}
      </div>
    </div>
  )
}
