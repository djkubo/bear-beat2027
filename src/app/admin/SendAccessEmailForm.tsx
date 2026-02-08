'use client'

import { useState } from 'react'

export function SendAccessEmailForm() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) {
      setMessage({ type: 'error', text: 'Indica un email válido' })
      return
    }
    setMessage(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/send-access-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, name: name.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessage({ type: 'ok', text: data.message || `Email enviado a ${trimmed}` })
        setEmail('')
        setName('')
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al enviar' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error de red' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl p-6 border border-white/5 bg-zinc-900/80 shadow-xl">
      <h2 className="text-lg font-black text-white mb-1 tracking-tight">
        📧 Enviar email &quot;Acceso Liberado&quot; a un correo
      </h2>
      <p className="text-sm text-zinc-500 mb-4">
        Para reenviar el correo (Panel Web + Google Drive) a quien ya pagó y no lo recibió. No activa compras.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3" method="post">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-zinc-400 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@ejemplo.com"
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-white placeholder-zinc-500 text-sm focus:border-bear-blue"
            disabled={loading}
          />
        </div>
        <div className="w-40">
          <label className="block text-xs font-bold text-zinc-400 mb-1">Nombre (opcional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="DJ"
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-white placeholder-zinc-500 text-sm focus:border-bear-blue"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-bear-blue text-black font-bold text-sm hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Enviando…' : 'Enviar email'}
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
