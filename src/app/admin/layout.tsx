import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  
  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  // Verificar que sea admin
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  
  // Si no es admin, redirigir al dashboard normal
  if (userData?.role !== 'admin') {
    redirect('/dashboard')
  }
  
  return <>{children}</>
}
