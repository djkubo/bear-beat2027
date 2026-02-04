'use client'

import { useState, useEffect, useCallback } from 'react'

interface EmailRow {
  date: string
  to: string
  event: string
  tag: string | null
  templateLabel: string | null
  from: string | null
}

interface TemplateStats {
  total_events: number
  unique_recipients: string[]
  event_breakdown: Record<string, number>
}

interface Summary {
  total_events: number
  total_events_before_filter?: number
  unique_emails_shown: number
  tags: string[]
  event_type_counts?: Record<string, number>
  filtered_by_sender?: boolean
  sender_email?: string | null
  filtered_by_template?: boolean
  template_filter?: string | null
  used_tag_filter?: boolean
  raw_events_from_api?: number
  by_template?: Record<string, TemplateStats>
  project_templates?: { id: string; label: string; tags: string[] }[]
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

const TEMPLATES_UI = [
  { id: 'bienvenida', label: 'Bienvenida' },
  { id: 'recuperacion', label: 'Recuperación pago' },
  { id: 'transaccional', label: 'Transaccional' },
] as const

export function BrevoEmailsClient() {
  const [days, setDays] = useState(30)
  const [eventFilter, setEventFilter] = useState<string>('')
  const [templateFilter, setTemplateFilter] = useState<string>('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [emails, setEmails] = useState<EmailRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  // Envío de email de prueba por plantilla
  const [testEmail, setTestEmail] = useState({ bienvenida: '', recuperacion: '', transaccional: '' })
  const [sendingTest, setSendingTest] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [showRecipients, setShowRecipients] = useState<Record<string, boolean>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('days', String(days))
      params.set('full', '1')
      if (eventFilter) params.set('event', eventFilter)
      if (templateFilter) params.set('template', templateFilter)
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
  }, [days, eventFilter, templateFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const sendTestEmail = useCallback(async (templateId: string, to: string) => {
    if (!to || !to.includes('@')) {
      setTestResult({ type: 'err', text: 'Escribe un email válido' })
      return
    }
    setSendingTest(templateId)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/brevo-emails/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: templateId, to }),
      })
      const data = await res.json()
      if (data.success) {
        setTestResult({ type: 'ok', text: data.message || 'Enviado' })
        setTestEmail((prev) => ({ ...prev, [templateId]: '' }))
        fetchData()
      } else {
        setTestResult({ type: 'err', text: data.error || 'Error al enviar' })
      }
    } catch (e) {
      setTestResult({ type: 'err', text: e instanceof Error ? e.message : 'Error de red' })
    } finally {
      setSendingTest(null)
    }
  }, [fetchData])

  const eventTypes = summary?.event_type_counts
    ? Object.entries(summary.event_type_counts).sort((a, b) => b[1] - a[1])
    : []
  const paginated = emails.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(emails.length / PAGE_SIZE)

  return (
    <div className="space-y-8">
      {/* Plantillas de este proyecto, modo de obtención y filtros activos */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 space-y-2">
        <p className="text-sm text-zinc-400">
          <strong className="text-white">Solo correos de este proyecto:</strong> se pide a Brevo eventos con los tags que usamos (bienvenida, recuperación, transaccional). Si no devuelve ninguno, se pide todo y se filtra aquí por remitente/tags.
        </p>
        {summary && (
          <p className="text-sm text-zinc-300">
            <strong>Origen de los datos:</strong>{' '}
            {summary.used_tag_filter
              ? 'Filtro por tags en Brevo (solo eventos con nuestros tags).'
              : 'Listado completo de Brevo, filtrado aquí por remitente y tags (el filtro por tags no devolvió resultados).'}
            {typeof summary.raw_events_from_api === 'number' && (
              <span className="text-zinc-500"> · Eventos crudos de la API: {summary.raw_events_from_api.toLocaleString()}</span>
            )}
          </p>
        )}
        {summary?.project_templates && summary.project_templates.length > 0 && (
          <p className="text-sm text-zinc-500">
            Plantillas: {summary.project_templates.map((t) => t.label).join(' · ')}
          </p>
        )}
        {summary?.filtered_by_sender && summary?.sender_email && (
          <p className="text-sm text-zinc-300">
            Remitente: <span className="font-mono text-white">{summary.sender_email}</span>
            {typeof summary?.total_events_before_filter === 'number' && summary.total_events_before_filter !== summary.total_events && (
              <span className="text-zinc-500"> · {summary.total_events_before_filter.toLocaleString()} → {summary.total_events.toLocaleString()} tras filtro</span>
            )}
          </p>
        )}
      </div>

      {/* Plantillas: envío de prueba, analíticas y edición */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-black text-white tracking-tight">Plantillas</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Envía un email de prueba, revisa a cuántos usuarios se ha enviado cada plantilla y a quién. Puedes modificar el contenido en el código.
          </p>
        </div>
        <div className="p-6 grid gap-6 md:grid-cols-3">
          {TEMPLATES_UI.map((t) => {
            const stats = summary?.by_template?.[t.id]
            const recipients = stats?.unique_recipients ?? []
            const expanded = showRecipients[t.id]
            return (
              <div
                key={t.id}
                className="rounded-xl border border-white/10 bg-zinc-800/50 p-5 space-y-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-white">{t.label}</h3>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Enviar email de prueba</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="tu@email.com"
                      value={testEmail[t.id as keyof typeof testEmail] ?? ''}
                      onChange={(e) => setTestEmail((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      className="flex-1 min-w-0 rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-bear-blue focus:outline-none focus:ring-1 focus:ring-bear-blue/30"
                    />
                    <button
                      type="button"
                      disabled={sendingTest !== null}
                      onClick={() => sendTestEmail(t.id, (testEmail[t.id as keyof typeof testEmail] ?? '').trim())}
                      className="shrink-0 rounded-lg border border-bear-blue/50 bg-bear-blue/20 px-4 py-2 text-sm font-bold text-bear-blue hover:bg-bear-blue/30 disabled:opacity-50"
                    >
                      {sendingTest === t.id ? 'Enviando…' : 'Enviar'}
                    </button>
                  </div>
                </div>
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Analíticas (período actual)</p>
                  {stats ? (
                    <>
                      <p className="text-sm text-zinc-300">
                        <strong className="text-white">{stats.total_events}</strong> eventos · <strong className="text-bear-blue">{recipients.length}</strong> destinatarios
                      </p>
                      {recipients.length > 0 && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setShowRecipients((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}
                            className="text-xs text-bear-blue hover:underline"
                          >
                            {expanded ? 'Ocultar lista' : 'Ver a quién se envió'}
                          </button>
                          {expanded && (
                            <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-zinc-400 space-y-0.5 font-mono">
                              {recipients.map((email) => (
                                <li key={email} className="truncate">{email}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(stats.event_breakdown).map(([ev, count]) => (
                          <span
                            key={ev}
                            className={`rounded px-2 py-0.5 text-xs font-bold ${eventBadgeClass(ev)}`}
                            title={ev}
                          >
                            {eventLabel(ev)}: {count}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-500">Sin envíos en este período</p>
                  )}
                </div>
                <p className="text-xs text-zinc-500 pt-1">
                  Editar plantilla: <code className="bg-zinc-700/50 px-1 rounded">src/lib/brevo-email.ts</code>
                </p>
              </div>
            )
          })}
        </div>
        {testResult && (
          <div
            className={`mx-6 mb-6 rounded-lg border px-4 py-3 text-sm ${
              testResult.type === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
            }`}
          >
            {testResult.text}
          </div>
        )}
      </div>

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
            <span className="text-zinc-500">Plantilla:</span>
            <select
              value={templateFilter}
              onChange={(e) => setTemplateFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-white focus:border-bear-blue focus:outline-none focus:ring-1 focus:ring-bear-blue/30"
            >
              <option value="">Todas</option>
              {summary?.project_templates?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
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
                    <th className="text-left py-3 px-4 font-bold text-zinc-400">Plantilla</th>
                    <th className="text-left py-3 px-4 font-bold text-zinc-400">Evento</th>
                    <th className="text-left py-3 px-4 font-bold text-zinc-400">Remitente</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-500 font-medium">
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
                        <td className="py-3 px-4 text-zinc-400 text-sm">
                          {row.templateLabel || (row.tag ? row.tag : '—')}
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
                    {row.templateLabel && (
                      <span className="rounded bg-bear-blue/20 px-2 py-0.5 text-xs text-bear-blue font-bold">
                        {row.templateLabel}
                      </span>
                    )}
                    <p className="font-medium text-white text-sm break-all mt-1">{row.to}</p>
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
