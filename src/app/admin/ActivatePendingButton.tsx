'use client'

import { useState } from 'react'
import { toast } from 'sonner'

type Props = {
  pendingId: number
  sessionId?: string | null
  email?: string
}

export function ActivatePendingButton({ pendingId, sessionId }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleActivate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/activate-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionId ? { sessionId } : { pendingId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || 'Error al activar')
        return
      }
      setDone(true)
      toast.success('Compra activada')
      // Dar feedback visual rápido y luego refrescar la vista (para que desaparezca de "Pendiente").
      window.setTimeout(() => window.location.reload(), 600)
    } catch (e: any) {
      toast.error(e?.message || 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  if (done) return <span className="text-emerald-400 text-xs">Listo</span>
  return (
    <button
      type="button"
      onClick={handleActivate}
      disabled={loading}
      className="mt-1 px-2 py-1 rounded-lg text-xs font-black bg-bear-blue text-bear-black hover:brightness-110 disabled:opacity-60"
    >
      {loading ? 'Activando…' : 'Activar'}
    </button>
  )
}
