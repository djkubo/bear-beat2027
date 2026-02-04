'use client'

import { useState, useEffect, useCallback } from 'react'

interface EmailRow {
  date: string
  to: string
  event: string
  tag: string | null
  from: string | null
}

interface Summary {
  total_events: number
  unique_emails_shown: number
  tags: string[]
  event_type_counts?: Record<string, number>
}

const EVENT_LABELS: Record<string, string> = {
  delivered: 'Entregado',
  opened: 'Abierto',
  clicks: 'Clic',
  requests: 'Enviado',
  loadedByProxy: 'Cargado (proxy)',
  softBounces: 'Rebote suave',
  hardBounces: 'Rebote duro',
  blocked: 'Bloqueado',
  unsubscribed: 'Baja',
  invalidEmail: 'Email inválido',
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function eventLabel(event: string): string {
  return EVENT_LABELS[event] || event
}

function eventBadgeClass(event: string): string {
  const e = (event || '').toLowerCase()
  if (['delivered', 'opened', 'clicks', 'requests'].includes(e)) return 'bg-emerald-500/20 text-emerald-400'
  if (['loadedByProxy'].includes(e)) return 'bg-cyan-500/20 text-cyan-400'
  if (['softBounces', 'hardBounces', 'invalidEmail'].includes(e)) return 'bg-amber-500/20 text-amber-400'
  if (['blocked'].includes(e)) return 'bg-red-500/20 text-red-400'
  if (['unsubscribed'].includes(e)) return 'bg-zinc-500/20 text-zinc-400'
  return 'bg-white/10 text-zinc-300'
}

const PAGE_SIZE = 100

export function BrevoEmailsClient() {
  const [days, setDays] = useState(30)
  const [eventFilter, setEventFilter] = useState<string>('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [emails, setEmails] = useState<EmailRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('days', String(days))
      params.set('full', '1')
      if (eventFilter) params.set('event', eventFilter)
      const res = await fetch(`/api/admin/brevo-emails?${params.toString()}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setSummary(null)
        setEmails([])
        return
      }
      setSummary(data.summary)
      setEmails(data.emails || [])
      setPage(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
      setSummary(null)
      setEmails([])
    } finally {
      setLoading(false)
    }
  }, [days, eventFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const eventTypes = summary?.event_type_counts
    ? Object.entries(summary.event_type_counts).sort((a, b) => b[1] - a[1])
    : []
  const paginated = emails.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(emails.length / PAGE_SIZE)

  return (
    <div className="space-y-8">
      {/* Filtros - misma tarjeta que el resto del admin */}
      <div className="rounded-2xl p-6 border border-white/5 bg-zinc-900/80 shadow-xl">
        <h2 className="text-lg font-black text-white mb-4 tracking-tight">Filtros</h2>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="text-zinc-500">Período:</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-white focus:border-bear-blue focus:outline-none focus:ring-1 focus:ring-bear-blue/30"
            >
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="text-zinc-500">Tipo de evento:</span>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-white focus:border-bear-blue focus:outline-none focus:ring-1 focus:ring-bear-blue/30"
            >
              <option value="">Todos</option>
              {eventTypes.map(([ev]) => (
                <option key={ev} value={ev}>
                  {eventLabel(ev)} ({summary?.event_type_counts?.[ev] ?? 0})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => fetchData()}
            disabled={loading}
            className="rounded-xl border border-bear-blue/50 bg-bear-blue/20 px-5 py-2.5 text-sm font-bold text-bear-blue hover:bg-bear-blue/30 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 font-medium">
          {error}
        </div>
      )}

      {summary && !error && (
        <>
          {/* KPIs - mismo estilo que Panel Admin */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl p-6 border border-white/5 bg-zinc-900/80 shadow-xl">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total eventos</p>
              <p className="mt-2 text-3xl font-black text-white">{summary.total_events.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl p-6 border border-white/5 bg-zinc-900/80 shadow-xl">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Registros</p>
              <p className="mt-2 text-3xl font-black text-bear-blue">{emails.length.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl p-6 border border-white/5 bg-zinc-900/80 shadow-xl col-span-2 lg:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Por tipo de evento</p>
              <div className="flex flex-wrap gap-2">
                {eventTypes.slice(0, 8).map(([ev, count]) => (
                  <span
                    key={ev}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${eventBadgeClass(ev)}`}
                    title={ev}
                  >
                    {eventLabel(ev)}: {count.toLocaleString()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Tabla - mismo estilo que Últimos pagos cobrados */}
          <div className="rounded-2xl border border-white/5 bg-zinc-900/80 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <h2 className="text-xl font-black text-white tracking-tight">Actividad de correos</h2>
              <p className="text-sm text-zinc-500 mt-0.5">
                Cada fila es un evento (entrega, apertura, clic, etc.). Paginación de {PAGE_SIZE} en {PAGE_SIZE}.
              </p>
            </div>
            <div className="hidden md:block overflow-x-auto max-h-[55vh] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 border-b border-white/5 bg-zinc-900">
                  <tr>
                    <th className="text-left py-3 px-4 font-bold text-zinc-400">Fecha</th>
                    <th className="text-left py-3 px-4 font-bold text-zinc-400">Para</th>
                    <th className="text-left py-3 px-4 font-bold text-zinc-400">Evento</th>
                    <th className="text-left py-3 px-4 font-bold text-zinc-400">Remitente</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-zinc-500 font-medium">
                        No hay registros con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((row, i) => (
                      <tr
                        key={`${row.date}-${row.to}-${row.event}-${i}`}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 px-4 text-zinc-300 text-sm whitespace-nowrap">
                          {formatDate(row.date)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-white break-all">{row.to}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${eventBadgeClass(row.event)}`}>
                            {eventLabel(row.event)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-500 text-sm truncate max-w-[200px]">
                          {row.from || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Vista móvil: cards */}
            <div className="md:hidden max-h-[55vh] overflow-y-auto space-y-3 p-4">
              {paginated.length === 0 ? (
                <p className="py-8 text-center text-zinc-500 font-medium">No hay registros con los filtros actuales.</p>
              ) : (
                paginated.map((row, i) => (
                  <div
                    key={`${row.date}-${row.to}-${row.event}-${i}`}
                    className="rounded-xl border border-white/5 bg-zinc-800/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-bold shrink-0 ${eventBadgeClass(row.event)}`}>
                        {eventLabel(row.event)}
                      </span>
                      <span className="text-xs text-zinc-500 shrink-0">{formatDate(row.date)}</span>
                    </div>
                    <p className="font-medium text-white text-sm break-all">{row.to}</p>
                    {row.from && (
                      <p className="text-xs text-zinc-500 mt-1 truncate">De: {row.from}</p>
                    )}
                  </div>
                ))
              )}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/5 px-6 py-4 bg-zinc-900/50">
                <span className="text-sm text-zinc-500">
                  Página <strong className="text-white">{page + 1}</strong> de <strong className="text-white">{totalPages}</strong>
                  {' · '}{emails.length.toLocaleString()} registros
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded-xl border border-white/10 bg-zinc-800 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="rounded-xl border border-bear-blue/50 bg-bear-blue/20 px-4 py-2 text-sm font-bold text-bear-blue hover:bg-bear-blue/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
