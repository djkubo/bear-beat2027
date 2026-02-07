import { createServerClient } from '@/lib/supabase/server'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'

type AdminStatus = {
  user: { id: string; email?: string | null } | null
  isAdmin: boolean
}

/**
 * Admin = role === 'admin' en public.users, o email en whitelist.
 * Nota: usa Supabase SSR client (cookies) para leer sesión.
 */
export async function getAdminStatus(): Promise<AdminStatus> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, isAdmin: false }

  if (isAdminEmailWhitelist(user.email ?? undefined)) {
    return { user: { id: user.id, email: user.email }, isAdmin: true }
  }

  try {
    const { data: profile } = await (supabase.from('users') as any)
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = (profile as { role?: string } | null)?.role
    return { user: { id: user.id, email: user.email }, isAdmin: role === 'admin' }
  } catch {
    return { user: { id: user.id, email: user.email }, isAdmin: false }
  }
}

