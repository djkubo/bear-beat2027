/**
 * GET /api/admin/brevo-emails
 * Lista de emails transaccionales enviados por Brevo (solo Admin).
 * Query: ?days=30 (default) o ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'
import {
  getBrevoEmailEvents,
  getBrevoConfigDiagnostic,
  type BrevoEmailEvent,
  PROJECT_EMAIL_TAGS,
  TEMPLATE_LABEL_BY_TAG,
  TEMPLATE_TO_TAGS,
} from '@/lib/brevo-email'

async function isAdmin(req: NextRequest): Promise<boolean> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  if (isAdminEmailWhitelist(user.email ?? undefined)) return true
  const { data: profile } = await (supabase.from('users') as any).select('role').eq('id', user.id).maybeSingle()
  return (profile as { role?: string } | null)?.role === 'admin'
}

export async function GET(req: NextRequest) {
  const ok = await isAdmin(req)
  if (!ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const days = searchParams.get('days') ? parseInt(searchParams.get('days')!, 10) : 90
  const startDate = searchParams.get('startDate') || undefined
  const endDate = searchParams.get('endDate') || undefined
  const full = searchParams.get('full') === '1' || searchParams.get('full') === 'true'
  const eventFilter = searchParams.get('event') || undefined
  const templateFilter = searchParams.get('template') || undefined

  const senderEmail = (process.env.BREVO_SENDER_EMAIL || '').trim().toLowerCase()
  const normalizeFrom = (from: string | undefined): string => {
    if (!from) return ''
    const match = from.match(/<([^>]+)>/)
    return (match ? match[1] : from).trim().toLowerCase()
  }
  const ourTagsSet = new Set(PROJECT_EMAIL_TAGS)
  const isOurEvent = (ev: BrevoEmailEvent) =>
    (ev.tag && ourTagsSet.has(ev.tag as any)) || (senderEmail && senderEmail.includes('@') && normalizeFrom(ev.from) === senderEmail)

  // 1) Intentar primero con filtro de tags (solo eventos de nuestras plantillas)
  const tagsToRequest = [...PROJECT_EMAIL_TAGS]
  let result = await getBrevoEmailEvents({
    days: startDate && endDate ? undefined : (Number.isFinite(days) ? days : 90),
    startDate,
    endDate,
    limit: 5000,
    tags: tagsToRequest,
  })

  let events = result.events
  let usedTagFilter = true

  // 2) Si no hay eventos (o error), pedir SIN tags y filtrar aquí por remitente + tags
  if (result.error || events.length === 0) {
    const fallback = await getBrevoEmailEvents({
      days: startDate && endDate ? undefined : (Number.isFinite(days) ? days : 90),
      startDate,
      endDate,
      limit: 5000,
    })
    if (!fallback.error) {
      events = fallback.events.filter(isOurEvent)
      usedTagFilter = false
    } else if (result.error) {
      return NextResponse.json({ error: result.error, summary: null, emails: [] }, { status: 200 })
    }
  }

  // Filtro por plantilla: si template=bienvenida|recuperacion|transaccional, solo eventos con esos tags
  const templateTags = templateFilter && TEMPLATE_TO_TAGS[templateFilter.toLowerCase()]
    ? TEMPLATE_TO_TAGS[templateFilter.toLowerCase()]
    : null
  const byTemplate =
    templateTags?.length
      ? events.filter((ev) => ev.tag && templateTags.includes(ev.tag))
      : events

  const projectEvents = byTemplate

  // Conteo por tipo de evento para el resumen (solo de este proyecto)
  const eventTypeCounts: Record<string, number> = {}
  for (const ev of projectEvents) {
    const t = ev.event || 'unknown'
    eventTypeCounts[t] = (eventTypeCounts[t] ?? 0) + 1
  }

  let list: BrevoEmailEvent[]
  if (full) {
    list = [...projectEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    if (eventFilter) {
      list = list.filter((e) => (e.event || '').toLowerCase() === eventFilter.toLowerCase())
    }
  } else {
    const byKey = new Map<string, BrevoEmailEvent>()
    for (const ev of projectEvents) {
      const key = ev.messageId || `${ev.date}|${ev.email}|${ev.tag || ''}`
      const existing = byKey.get(key)
      if (!existing || new Date(ev.date) > new Date(existing.date)) {
        byKey.set(key, ev)
      }
    }
    list = Array.from(byKey.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }

  // Resumen por plantilla: eventos, destinatarios únicos, desglose por tipo de evento
  const byTemplateStats: Record<string, { total_events: number; unique_recipients: string[]; event_breakdown: Record<string, number> }> = {}
  for (const [tplId, tplTags] of Object.entries(TEMPLATE_TO_TAGS)) {
    const tplEvents = projectEvents.filter((e) => e.tag && tplTags.includes(e.tag))
    const uniqueRecipients = [...new Set(tplEvents.map((e) => e.email).filter(Boolean))]
    const breakdown: Record<string, number> = {}
    for (const ev of tplEvents) {
      const t = ev.event || 'unknown'
      breakdown[t] = (breakdown[t] ?? 0) + 1
    }
    byTemplateStats[tplId] = {
      total_events: tplEvents.length,
      unique_recipients: uniqueRecipients,
      event_breakdown: breakdown,
    }
  }

  const brevoDiagnostic = getBrevoConfigDiagnostic()

  const summary = {
    total_events: projectEvents.length,
    total_events_before_filter: events.length,
    unique_emails_shown: list.length,
    tags: [...new Set(projectEvents.map((e) => e.tag).filter(Boolean))] as string[],
    event_type_counts: eventTypeCounts,
    filtered_by_sender: Boolean(senderEmail && senderEmail.includes('@')),
    sender_email: senderEmail || null,
    filtered_by_template: Boolean(templateFilter),
    template_filter: templateFilter || null,
    used_tag_filter: usedTagFilter,
    raw_events_from_api: events.length,
    by_template: byTemplateStats,
    brevo_configured: brevoDiagnostic.ok,
    brevo_diagnostic: { BREVO_API_KEY: brevoDiagnostic.apiKey, BREVO_SENDER_EMAIL: brevoDiagnostic.senderEmail },
    project_templates: [
      { id: 'bienvenida', label: 'Bienvenida', tags: TEMPLATE_TO_TAGS.bienvenida },
      { id: 'bienvenida_registro', label: 'Bienvenida registro', tags: TEMPLATE_TO_TAGS.bienvenida_registro },
      { id: 'confirmacion_pago', label: 'Confirmación pago', tags: TEMPLATE_TO_TAGS.confirmacion_pago },
      { id: 'recuperacion', label: 'Recuperación pago', tags: TEMPLATE_TO_TAGS.recuperacion },
      { id: 'transaccional', label: 'Transaccional', tags: TEMPLATE_TO_TAGS.transaccional },
    ],
  }

  return NextResponse.json({
    summary,
    emails: list.map((e) => ({
      date: e.date,
      to: e.email,
      event: e.event,
      tag: e.tag || null,
      templateLabel: (e.tag && TEMPLATE_LABEL_BY_TAG[e.tag]) || null,
      from: e.from || null,
    })),
  })
}
