'use client'

import { useState } from 'react'

type Props = {
  pendingId: number
  sessionId?: string | null
  email?: string
}

export function ActivatePendingButton({ pendingId, sessionId, email }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleActivate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/activate-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionId ? { sessionId } : { pendingId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Error al activar')
        return
      }
      setDone(true)
      window.location.reload()
    } catch (e: any) {
      setError(e?.message || 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  if (done) return <span className="text-emerald-400 text-xs">Activando…</span>
  if (error) {
    return (
      <span className="text-red-400 text-xs" title={error}>
        Error
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={handleActivate}
      disabled={loading}
      className="mt-1 px-2 py-1 bg-bear-blue hover:bg-bear-blue/80 text-white text-xs font-bold rounded disabled:opacity-50"
    >
      {loading ? 'Activando…' : 'Activar'}
    </button>
  )
}
