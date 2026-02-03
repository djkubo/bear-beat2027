/**
 * GET /api/admin/packs/[id] – Obtener un pack por ID (solo admin, cualquier estado).
 * PATCH /api/admin/packs/[id] – Actualizar pack (solo admin).
 * Body: name?, slug?, description?, price_mxn?, price_usd?, release_month?, release_date?, total_videos?, total_size_gb?, status?, featured?
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const { id } = await params
    const packId = parseInt(id, 10)
    if (Number.isNaN(packId) || packId < 1) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }
    const admin = createAdminClient()
    const { data, error } = await (admin.from('packs') as any).select('*').eq('id', packId).single()
    if (error || !data) {
      return NextResponse.json({ error: 'Pack no encontrado' }, { status: 404 })
    }
    return NextResponse.json({ pack: data })
  } catch (e) {
    console.error('Admin packs GET:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const packId = parseInt(id, 10)
    if (Number.isNaN(packId) || packId < 1) {
      return NextResponse.json({ error: 'ID de pack inválido' }, { status: 400 })
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
    } = body as Record<string, unknown>

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = String(name).trim()
    if (slug !== undefined) {
      const slugNormalized = String(slug).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      if (slugNormalized) updates.slug = slugNormalized
    }
    if (description !== undefined) updates.description = description == null ? null : String(description).trim()
    if (typeof price_mxn === 'number') updates.price_mxn = price_mxn
    if (typeof price_usd === 'number') updates.price_usd = price_usd
    if (release_month !== undefined) updates.release_month = String(release_month).trim()
    if (release_date !== undefined) updates.release_date = release_date || null
    if (typeof total_videos === 'number') updates.total_videos = total_videos
    if (typeof total_size_gb === 'number') updates.total_size_gb = total_size_gb
    if (status === 'available' || status === 'upcoming' || status === 'draft' || status === 'archived') {
      updates.status = status
    }
    if (typeof featured === 'boolean') updates.featured = featured

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await (admin.from('packs') as any)
      .update(updates)
      .eq('id', packId)
      .select('id, slug, name, status')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe un pack con ese slug' }, { status: 409 })
      }
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Pack no encontrado' }, { status: 404 })
      }
      console.error('Admin packs PATCH:', error)
      return NextResponse.json({ error: error.message || 'Error al actualizar pack' }, { status: 500 })
    }

    return NextResponse.json({ success: true, pack: data })
  } catch (e) {
    console.error('Admin packs PATCH:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
