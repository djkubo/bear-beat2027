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
    <div className="rounded-xl p-4 border border-white/5 bg-zinc-900/80 shadow-lg">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="font-bold text-sm text-white">📂 Sincronizar catálogo desde FTP</div>
          <div className="text-xs text-zinc-500 mt-0.5">
            Llena la tabla <code className="text-zinc-400">videos</code> desde el Storage Box. Requiere FTP_* en Render.
          </div>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="px-4 py-2 bg-bear-blue text-black rounded-lg font-bold hover:bg-bear-blue/90 disabled:opacity-50 shadow-[0_0_15px_rgba(8,225,247,0.2)]"
        >
          {loading ? 'Sincronizando…' : 'Ejecutar sync'}
        </button>
      </div>
      {result && (
        <div className={`mt-3 text-sm p-3 rounded-lg ${result.ok ? 'bg-bear-blue/10 border border-bear-blue/30 text-bear-blue' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
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
