/**
 * POST: Reclamar cuenta (establecer contraseña y confirmar email).
 * Para usuarios creados por webhook sin contraseña o con email no confirmado.
 * Body: { email: string, password: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body as { email?: string; password?: string }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Email válido requerido' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data } = await (admin.from('users') as any).select('id').eq('email', email.trim()).maybeSingle()
    const userRow = data as { id: string } | null
    if (!userRow?.id) {
      return NextResponse.json({ error: 'No encontramos una cuenta con ese email' }, { status: 404 })
    }

    const { error } = await (admin.auth as any).admin.updateUserById(userRow.id, {
      password,
      email_confirm: true,
    })

    if (error) {
      console.error('claim-account updateUserById error:', error)
      return NextResponse.json({ error: error.message || 'Error al establecer contraseña' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: 'Contraseña establecida. Ya puedes iniciar sesión.' })
  } catch (e: any) {
    console.error('claim-account error:', e)
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 })
  }
}
