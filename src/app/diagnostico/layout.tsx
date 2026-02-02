import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

/**
 * En producción /diagnostico solo es accesible por usuarios con rol admin.
 * Evita exponer datos internos (role, compras, etc.) a usuarios normales.
 */
export default async function DiagnosticoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (process.env.NODE_ENV !== 'production') {
    return <>{children}</>
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?redirect=/diagnostico')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  return <>{children}</>
}
