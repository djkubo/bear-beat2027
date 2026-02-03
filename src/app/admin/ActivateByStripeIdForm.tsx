'use client'

import { useState } from 'react'

/**
 * Formulario para activar una compra pegando el Session ID (cs_xxx) o Payment Intent (pi_xxx) de Stripe.
 * Útil cuando el webhook no creó la fila en pending_purchases (pago correcto en Stripe pero sin acceso).
 */
export function ActivateByStripeIdForm() {
  const [stripeId, setStripeId] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = stripeId.trim()
    if (!id || (!id.startsWith('cs_') && !id.startsWith('pi_'))) {
      setMessage({ type: 'error', text: 'Pega un Session ID (cs_...) o Payment Intent (pi_...) de Stripe.' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/activate-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ type: 'error', text: data?.error || 'Error al activar' })
        return
      }
      setMessage({ type: 'ok', text: data?.message || 'Compra activada. El usuario ya tiene acceso.' })
      setStripeId('')
      setTimeout(() => window.location.reload(), 1500)
    } catch (e: unknown) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Error de red' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl p-6 border border-bear-blue/30 bg-bear-blue/5 shadow-xl mb-8">
      <h2 className="text-lg font-bold text-white mb-2">🔧 Activar por ID de Stripe</h2>
      <p className="text-sm text-zinc-400 mb-4">
        Si el cliente pagó en Stripe pero no tiene acceso (el webhook no creó el registro), pega aquí el <strong>Session ID</strong> (cs_...) o el <strong>Payment Intent</strong> (pi_...). Lo encuentras en Stripe → Pago → Eventos o en &quot;Se completó una sesión de Checkout&quot;.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[200px]">
          <span className="sr-only">Session ID o Payment Intent</span>
          <input
            type="text"
            value={stripeId}
            onChange={(e) => setStripeId(e.target.value)}
            placeholder="cs_... o pi_..."
            className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-white/10 text-white placeholder-zinc-500 font-mono text-sm"
            disabled={loading}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-bear-blue hover:bg-bear-blue/80 text-white font-bold rounded-lg disabled:opacity-50"
        >
          {loading ? 'Activando…' : 'Activar compra'}
        </button>
      </form>
      {message && (
        <p className={`mt-3 text-sm ${message.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
