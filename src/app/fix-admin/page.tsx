import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_EMAIL = 'test@bearbeat.com'

/**
 * Página de un solo uso: al ENTRAR aquí ya logueado con test@bearbeat.com,
 * el servidor lee tu sesión (misma petición GET) y te asigna admin.
 * No hace falta pulsar ningún botón; si hay sesión y eres test@bearbeat.com, se hace al cargar.
 */
export default async function FixAdminPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold mb-2">Asignar admin</h1>
          <p className="text-muted-foreground text-sm mb-4">
            Tienes que iniciar sesión primero. Entra con test@bearbeat.com y vuelve a esta página.
          </p>
          <Link
            href="/login?redirect=/fix-admin"
            className="inline-block px-4 py-2 bg-bear-blue text-white rounded-lg font-medium"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  if (user.email?.toLowerCase() !== ALLOWED_EMAIL) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold mb-2">Solo para test@bearbeat.com</h1>
          <p className="text-muted-foreground text-sm">
            Has entrado con <strong>{user.email}</strong>. Esta página solo asigna admin a {ALLOWED_EMAIL}.
          </p>
        </div>
      </div>
    )
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold mb-2">Error</h1>
          <p className="text-red-500 text-sm mb-4">{error.message}</p>
          <Link href="/admin" className="text-bear-blue hover:underline">Intentar entrar a /admin</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full text-center">
        <h1 className="text-xl font-semibold mb-2">Listo</h1>
        <p className="text-green-600 text-sm mb-4">
          Rol admin asignado. Ya puedes entrar al panel.
        </p>
        <Link
          href="/admin"
          className="inline-block px-4 py-2 bg-bear-blue text-white rounded-lg font-medium"
        >
          Ir al panel admin →
        </Link>
      </div>
    </div>
  )
}
