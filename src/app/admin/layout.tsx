import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  // getUser() es la fuente fiable (valida JWT). getSession() como fallback por si hay diferencia de contexto.
  const { data: { user: userFromGetUser } } = await supabase.auth.getUser()
  let user = userFromGetUser
  if (!user) {
    const { data: { session } } = await supabase.auth.getSession()
    user = session?.user ?? null
  }

  if (!user) {
    redirect('/login?redirect=/admin')
  }
  
  // Verificar que sea admin
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  
  // Si no es admin, redirigir al dashboard de cliente
  if (userData?.role !== 'admin') {
    redirect('/dashboard')
  }
  
  return <>{children}</>
}
