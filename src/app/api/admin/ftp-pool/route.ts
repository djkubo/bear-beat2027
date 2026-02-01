import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return { user, supabase }
}

/**
 * GET: listar cuentas del pool (sin contraseña). Solo admin.
 */
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  try {
    const adminClient = createServiceRoleClient()
    const { data, error } = await adminClient
      .from('ftp_pool')
      .select('id, username, in_use, assigned_at, purchase_id, created_at')
      .order('id', { ascending: true })
    if (error) {
      console.error('ftp-pool GET', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ list: data ?? [] })
  } catch (e: any) {
    console.error('ftp-pool GET', e)
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 })
  }
}

/**
 * POST: añadir una cuenta al pool. Solo admin.
 * Body: { username: string, password: string }
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const username = typeof body.username === 'string' ? body.username.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!username || !password) {
      return NextResponse.json(
        { error: 'username y password son obligatorios' },
        { status: 400 }
      )
    }
    const adminClient = createServiceRoleClient()
    const { data, error } = await adminClient
      .from('ftp_pool')
      .insert({ username, password })
      .select('id, username, in_use')
      .single()
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Ese usuario FTP ya existe en el pool' },
          { status: 409 }
        )
      }
      console.error('ftp-pool POST', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, row: data })
  } catch (e: any) {
    console.error('ftp-pool POST', e)
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 })
  }
}
