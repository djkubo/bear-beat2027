/**
 * GET /api/admin/brevo-emails
 * Lista de emails transaccionales enviados por Brevo (solo Admin).
 * Query: ?days=30 (default) o ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'
import { getBrevoEmailEvents, type BrevoEmailEvent } from '@/lib/brevo-email'

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

  const { events, error } = await getBrevoEmailEvents({
    days: startDate && endDate ? undefined : (Number.isFinite(days) ? days : 90),
    startDate,
    endDate,
    limit: 5000,
  })

  if (error) {
    return NextResponse.json({ error, summary: null, emails: [] }, { status: 200 })
  }

  // Conteo por tipo de evento para el resumen
  const eventTypeCounts: Record<string, number> = {}
  for (const ev of events) {
    const t = ev.event || 'unknown'
    eventTypeCounts[t] = (eventTypeCounts[t] ?? 0) + 1
  }

  let list: BrevoEmailEvent[]
  if (full) {
    list = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    if (eventFilter) {
      list = list.filter((e) => (e.event || '').toLowerCase() === eventFilter.toLowerCase())
    }
  } else {
    const byKey = new Map<string, BrevoEmailEvent>()
    for (const ev of events) {
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

  const summary = {
    total_events: events.length,
    unique_emails_shown: full ? list.length : list.length,
    tags: [...new Set(events.map((e) => e.tag).filter(Boolean))] as string[],
    event_type_counts: eventTypeCounts,
  }

  return NextResponse.json({
    summary,
    emails: list.map((e) => ({
      date: e.date,
      to: e.email,
      event: e.event,
      tag: e.tag || null,
      from: e.from || null,
    })),
  })
}
