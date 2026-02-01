'use client'

import { useState } from 'react'

export function SyncVideosFtpButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; total?: number; message?: string; error?: string } | null>(null)

  const run = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/sync-videos-ftp', { method: 'POST', credentials: 'include' })
      const data = await res.json()
      setResult(data)
      if (data.ok) {
        setTimeout(() => setResult(null), 8000)
      }
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : 'Error de red' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-card rounded-xl p-4 border-2 border-amber-500/50 shadow-lg">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="font-bold text-sm">📂 Sincronizar catálogo desde FTP</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Llena la tabla <code>videos</code> desde el Storage Box (u540473). Requiere FTP_* en Render.
          </div>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="px-4 py-2 bg-amber-500 text-black rounded-lg font-bold hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? 'Sincronizando…' : 'Ejecutar sync'}
        </button>
      </div>
      {result && (
        <div className={`mt-3 text-sm p-2 rounded ${result.ok ? 'bg-green-500/20 text-green-800 dark:text-green-200' : 'bg-red-500/20 text-red-800 dark:text-red-200'}`}>
          {result.ok ? (
            <>
              ✅ {result.message ?? `Listo. Total: ${result.total ?? 0} videos.`}
              <span className="block mt-1 text-xs opacity-90">Refresca la landing (/) o /contenido para ver los números actualizados.</span>
            </>
          ) : (
            <>❌ {result.error ?? 'Error'}</>
          )}
        </div>
      )}
    </div>
  )
}
