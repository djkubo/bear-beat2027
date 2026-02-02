import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { verifyBypassCookie, COOKIE_NAME } from '@/lib/admin-bypass'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const bypassCookie = cookieStore.get(COOKIE_NAME)?.value
  if (bypassCookie && verifyBypassCookie(bypassCookie)) {
    return <>{children}</>
  }

  const supabase = await createServerClient()
  const { data: { user: userFromGetUser } } = await supabase.auth.getUser()
  let user = userFromGetUser
  if (!user) {
    const { data: { session } } = await supabase.auth.getSession()
    user = session?.user ?? null
  }

  if (!user) {
    redirect('/login?redirect=/admin')
  }

  // Permitir: role admin en public.users O email en lista blanca
  if (isAdminEmailWhitelist(user.email ?? undefined)) {
    return <>{children}</>
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') {
    redirect('/dashboard')
  }

  return <>{children}</>
}
