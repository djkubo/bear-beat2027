/**
 * POST: Enviar notificaciones push a todos los suscritos (solo Admin).
 * GET: Estadísticas de suscripciones (solo Admin).
 * Usa service role para leer/eliminar suscripciones; en 410 (Gone) elimina la fila.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'
import webpush from 'web-push'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  ? `mailto:${process.env.NEXT_PUBLIC_ADMIN_EMAIL}`
  : process.env.VAPID_EMAIL || 'mailto:soporte@bearbeat.mx'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

async function isAdmin(req: NextRequest): Promise<{ ok: boolean; userId?: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  if (isAdminEmailWhitelist(user.email ?? undefined)) return { ok: true, userId: user.id }
  const { data: profile } = await (supabase.from('users') as any).select('role').eq('id', user.id).maybeSingle()
  const profileRow = profile as { role?: string } | null
  if (profileRow?.role === 'admin') return { ok: true, userId: user.id }
  return { ok: false }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await isAdmin(req)
    if (!adminCheck.ok) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { title, body, url, icon } = (await req.json().catch(() => ({}))) as {
      title?: string
      body?: string
      url?: string
      icon?: string
    }

    const admin = createAdminClient()
    const { data: rows, error } = await (admin.from('push_subscriptions') as any)
      .select('id, endpoint, keys, subscription')
      .eq('active', true)

    if (error || !rows) {
      return NextResponse.json({ error: 'Error obteniendo suscripciones' }, { status: 500 })
    }

    const payload = JSON.stringify({
      title: title || 'Bear Beat',
      body: body || '¡Tienes una nueva notificación!',
      icon: icon || '/favicon.png',
      badge: '/favicon.png',
      data: { url: url || '/' },
      requireInteraction: true,
    })

    let sent = 0
    const toDelete: string[] = []

    for (const sub of rows) {
      const pushSub = sub.subscription
        ? { endpoint: sub.subscription.endpoint, keys: sub.subscription.keys }
        : { endpoint: sub.endpoint, keys: sub.keys }
      try {
        await webpush.sendNotification(pushSub, payload)
        sent++
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode
        if (code === 410 || code === 404) {
          toDelete.push(sub.id)
        }
      }
    }

    if (toDelete.length > 0) {
      await (admin.from('push_subscriptions') as any).delete().in('id', toDelete)
    }

    return NextResponse.json({
      success: true,
      sent,
      failed: rows.length - sent,
      total: rows.length,
      removed: toDelete.length,
    })
  } catch (e: unknown) {
    console.error('send-push error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error enviando notificaciones' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await isAdmin(req)
    if (!adminCheck.ok) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const admin = createAdminClient()
    const { data, error } = await (admin.from('push_subscriptions') as any)
      .select('id, user_id')
      .eq('active', true)

    if (error) throw error

    const total = data?.length ?? 0
    const withUser = data?.filter((r: { user_id: string | null }) => r.user_id).length ?? 0
    const anonymous = total - withUser

    return NextResponse.json({ total, withUser, anonymous })
  } catch (e: unknown) {
    console.error('send-push GET error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error obteniendo estadísticas' },
      { status: 500 }
    )
  }
}
