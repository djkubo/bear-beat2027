import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  
  // getSession() lee la cookie sin refrescar; en Server Components getUser() puede fallar al refrescar
  const { data: { session } } = await supabase.auth.getSession()
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
