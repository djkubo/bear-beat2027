'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type AnalyzeResult = {
  tendencia_principal: string
  puntos_dolor: string
  oportunidades_venta: string
  recomendacion: string
}

const SECTIONS = [
  { key: 'tendencia_principal' as const, icon: '🔥', label: 'Tendencia Principal' },
  { key: 'puntos_dolor' as const, icon: '⚠️', label: 'Puntos de Dolor' },
  { key: 'oportunidades_venta' as const, icon: '💰', label: 'Oportunidades de Venta' },
  { key: 'recomendacion' as const, icon: '💡', label: 'Recomendación' },
] as const

export function AnalyzeChatButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = async () => {
    setOpen(true)
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/analyze-chat', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Error al analizar')
        return
      }
      setResult(data as AnalyzeResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const goToPendingChats = () => {
    setOpen(false)
    const el = document.getElementById('esperando-atencion-humana')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const hasOpportunities = result?.oportunidades_venta && 
    result.oportunidades_venta !== 'N/A' && 
    result.oportunidades_venta.toLowerCase() !== 'datos insuficientes' &&
    result.oportunidades_venta.trim().length > 2

  return (
    <>
      <button
        type="button"
        onClick={runAnalysis}
        className="px-6 py-3 rounded-xl font-bold text-bear-black bg-bear-blue hover:bg-bear-blue/90 shadow-[0_0_20px_rgba(8,225,247,0.25)] transition-all"
      >
        🧠 Generar Reporte AI
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-zinc-900 border border-bear-blue/30 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Reporte AI</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {loading && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <div className="w-12 h-12 border-2 border-bear-blue/30 border-t-bear-blue rounded-full animate-spin mb-4" />
                    <p>Analizando conversaciones...</p>
                  </div>
                )}

                {error && (
                  <div className="py-6 text-center">
                    <p className="text-red-400 font-medium">{error}</p>
                  </div>
                )}

                {!loading && result && (
                  <div className="space-y-4">
                    {SECTIONS.map(({ key, icon, label }) => (
                      <div
                        key={key}
                        className="bg-white/5 border border-white/10 rounded-xl p-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{icon}</span>
                          <span className="font-bold text-white">{label}</span>
                        </div>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">
                          {result[key] || '—'}
                        </p>
                        {key === 'oportunidades_venta' && hasOpportunities && (
                          <button
                            type="button"
                            onClick={goToPendingChats}
                            className="mt-3 px-4 py-2 bg-bear-blue/20 text-bear-blue rounded-lg text-sm font-bold hover:bg-bear-blue/30 border border-bear-blue/30"
                          >
                            Ir a esos chats →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
