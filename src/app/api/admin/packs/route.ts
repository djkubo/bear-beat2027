/**
 * POST /api/admin/packs – Crear pack (solo admin).
 * Body: name, slug, description?, price_mxn, price_usd, release_month, release_date?, total_videos?, total_size_gb?, status?, featured?
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'

async function isAdmin(req: NextRequest): Promise<boolean> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  if (isAdminEmailWhitelist(user.email ?? undefined)) return true
  const { data: profile } = await (supabase.from('users') as any).select('role').eq('id', user.id).maybeSingle()
  const row = profile as { role?: string } | null
  return row?.role === 'admin'
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const {
      name,
      slug,
      description,
      price_mxn,
      price_usd,
      release_month,
      release_date,
      total_videos,
      total_size_gb,
      status,
      featured,
    } = body as {
      name?: string
      slug?: string
      description?: string
      price_mxn?: number
      price_usd?: number
      release_month?: string
      release_date?: string
      total_videos?: number
      total_size_gb?: number
      status?: string
      featured?: boolean
    }

    if (!name || !slug || !release_month) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: name, slug, release_month' },
        { status: 400 }
      )
    }

    const slugNormalized = String(slug).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (!slugNormalized) {
      return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
    }

    const admin = createAdminClient()
    const insert: Record<string, unknown> = {
      name: String(name).trim(),
      slug: slugNormalized,
      release_month: String(release_month).trim(),
      description: description != null ? String(description).trim() : null,
      price_mxn: typeof price_mxn === 'number' ? price_mxn : 350,
      price_usd: typeof price_usd === 'number' ? price_usd : 19,
      release_date: release_date || null,
      total_videos: typeof total_videos === 'number' ? total_videos : 0,
      total_size_gb: typeof total_size_gb === 'number' ? total_size_gb : 0,
      status: status === 'available' || status === 'upcoming' || status === 'archived' ? status : 'draft',
      featured: Boolean(featured),
    }

    const { data, error } = await (admin.from('packs') as any).insert(insert).select('id, slug, name').single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe un pack con ese slug' }, { status: 409 })
      }
      console.error('Admin packs create:', error)
      return NextResponse.json({ error: error.message || 'Error al crear pack' }, { status: 500 })
    }

    return NextResponse.json({ success: true, pack: data })
  } catch (e) {
    console.error('Admin packs POST:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
