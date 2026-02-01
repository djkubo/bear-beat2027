import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_EMAIL = 'test@bearbeat.com'

/**
 * POST /api/setup/make-admin
 * Solo para test@bearbeat.com: pone role = admin en public.users
 * usando la misma BD que usa esta app (local o producción).
 * Llamar una vez después de iniciar sesión en producción si te redirige a login al entrar a /admin.
 */
export async function POST() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Inicia sesión primero' }, { status: 401 })
    }

    if (user.email?.toLowerCase() !== ALLOWED_EMAIL) {
      return NextResponse.json({ error: 'Solo permitido para ' + ALLOWED_EMAIL }, { status: 403 })
    }

    const admin = createAdminClient()
    const name =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      (user.email ? user.email.split('@')[0] : 'User')

    const { error } = await (admin as any)
      .from('users')
      .upsert(
        { id: user.id, email: user.email, name, role: 'admin' },
        { onConflict: 'id' }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: 'Rol admin asignado. Ya puedes entrar a /admin' })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
