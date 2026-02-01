import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  // getSession() primero; si no hay sesión (ej. cookie no leída en prod), intentar getUser() una vez
  let { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) session = { user } as typeof session
  }
  const user = session?.user

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
