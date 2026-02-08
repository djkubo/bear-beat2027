'use client'

import { useState } from 'react'

type ResultItem = {
  id: string
  status: 'ok' | 'skip' | 'error'
  message: string
}

export function ManualRescueForm() {
  const [ids, setIds] = useState('')
  const [emails, setEmails] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ResultItem[]>([])
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = ids.trim()
    if (!trimmed) {
      setError('Pega al menos un ID (pi_...)')
      return
    }
    setError('')
    setResults([])
    setLoading(true)
    try {
      const res = await fetch('/api/admin/manual-rescue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: trimmed,
          emails: emails.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Error en el servidor')
        return
      }
      setResults(data.results || [])
    } catch (err: any) {
      setError(err?.message || 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl p-6 border border-white/5 bg-zinc-900/80 shadow-xl">
      <h2 className="text-xl font-black text-white mb-1 tracking-tight">
        🚑 Rescate manual de pagos (Payment Intents)
      </h2>
      <p className="text-sm text-zinc-500 mb-6">
        Pega una lista de <code className="bg-white/10 px-1 rounded">pi_...</code> que cobraron en Stripe pero no activaron. Se activará la compra y se enviará el email de rescate por Brevo.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" method="post">
        <div>
          <label className="block text-sm font-bold text-zinc-400 mb-2">
            IDs de Stripe (pi_...), uno por línea o separados por coma
          </label>
          <textarea
            value={ids}
            onChange={(e) => setIds(e.target.value)}
            placeholder={'pi_3ABC123...\npi_3DEF456...\npi_3GHI789...'}
            className="w-full min-h-[140px] px-4 py-3 rounded-xl bg-zinc-800 border border-white/10 text-white placeholder-zinc-500 font-mono text-sm focus:border-bear-blue focus:ring-1 focus:ring-bear-blue"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-400 mb-2">
            Opcional: correos por PI (si Stripe no tiene email). Formato: <code className="bg-white/10 px-1 rounded">pi_xxx,email@ejemplo.com</code> por línea
          </label>
          <textarea
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder={'pi_3ABC123...,hector@mail.com\npi_3DEF456...,jose@mail.com'}
            className="w-full min-h-[80px] px-4 py-3 rounded-xl bg-zinc-800 border border-white/10 text-white placeholder-zinc-500 font-mono text-sm focus:border-bear-blue focus:ring-1 focus:ring-bear-blue"
            disabled={loading}
          />
        </div>
        {error && (
          <div className="rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-2 text-sm">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-bear-blue text-black font-black uppercase text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Procesando…' : 'Rescatar y enviar correos'}
        </button>
      </form>

      {results.length > 0 && (
        <div className="mt-6 pt-6 border-t border-white/10">
          <h3 className="text-sm font-bold text-zinc-400 mb-2">Resultado</h3>
          <ul className="space-y-1.5 font-mono text-sm">
            {results.map((r, i) => (
              <li
                key={`${r.id}-${i}`}
                className={
                  r.status === 'ok'
                    ? 'text-emerald-400'
                    : r.status === 'skip'
                      ? 'text-amber-400'
                      : 'text-red-400'
                }
              >
                <span className="text-zinc-500">{r.id}</span>
                {' — '}
                {r.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
