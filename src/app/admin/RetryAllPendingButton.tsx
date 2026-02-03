'use client'

import { useState } from 'react'

type Props = {
  pendingCount: number
}

/**
 * Botón para reintentar activar todos los pendientes (awaiting_completion).
 * Llama a /api/admin/retry-pending-activations.
 */
export function RetryAllPendingButton({ pendingCount }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ activated: number; failed: number; message: string; errors?: string[] } | null>(null)

  const handleRetry = async () => {
    if (pendingCount === 0) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/retry-pending-activations', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setResult({
          activated: data.activated ?? 0,
          failed: data.failed ?? 0,
          message: data.message ?? '',
          errors: data.errors,
        })
        setTimeout(() => window.location.reload(), 2000)
      } else {
        setResult({ activated: 0, failed: pendingCount, message: data?.error || 'Error' })
      }
    } catch (e: unknown) {
      setResult({ activated: 0, failed: pendingCount, message: e instanceof Error ? e.message : 'Error de red' })
    } finally {
      setLoading(false)
    }
  }

  if (pendingCount === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleRetry}
        disabled={loading}
        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg disabled:opacity-50"
      >
        {loading ? 'Reintentando…' : `Reintentar todos (${pendingCount})`}
      </button>
      {result && (
        <span className="text-sm text-zinc-300">
          {result.message}
          {result.errors?.length ? (
            <span className="block text-amber-400 text-xs mt-1">
              {result.errors.slice(0, 3).join('; ')}
            </span>
          ) : null}
        </span>
      )}
    </div>
  )
}
