import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_EMAIL = 'test@bearbeat.com'

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full text-center">
        {children}
      </div>
    </div>
  )
}

/**
 * /fix-admin: asigna admin a test@bearbeat.com
 *
 * 1) Con token: /fix-admin?token=XXX (FIX_ADMIN_SECRET en Render). No requiere sesión.
 * 2) Sin token: requiere estar logueado como test@bearbeat.com.
 */
export default async function FixAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const token = params?.token
  const secret = process.env.FIX_ADMIN_SECRET

  // Si pasaron token pero no hay secret o no coincide: avisar que configure Render
  if (token && (!secret || token !== secret)) {
    return (
      <Box>
        <h1 className="text-xl font-semibold mb-2">Token no válido</h1>
        <p className="text-muted-foreground text-sm mb-4">
          En <strong>Render</strong> → tu servicio → <strong>Environment</strong> añade la
          variable <code className="bg-muted px-1 rounded">FIX_ADMIN_SECRET</code> con valor{' '}
          <code className="bg-muted px-1 rounded">bearbeat-admin-2027-secreto</code>. Guarda, espera
          el deploy y vuelve a: /fix-admin?token=bearbeat-admin-2027-secreto
        </p>
        <Link href="/login" className="text-bear-blue hover:underline">
          Ir a login
        </Link>
      </Box>
    )
  }

  // Flujo con token: asignar admin sin sesión (para cuando las cookies fallan en producción)
  if (secret && token === secret) {
    try {
      const admin = createAdminClient()
      const { data: listData, error: listError } = await (admin as any).auth.admin.listUsers({
        perPage: 1000,
      })
      if (listError) {
        return (
          <Box>
            <h1 className="text-xl font-semibold mb-2">Error</h1>
            <p className="text-red-500 text-sm mb-4">{listError.message}</p>
          </Box>
        )
      }
      const u = listData?.users?.find(
        (x: { email?: string }) => x.email?.toLowerCase() === ALLOWED_EMAIL.toLowerCase()
      )
      if (!u) {
        return (
          <Box>
            <h1 className="text-xl font-semibold mb-2">Usuario no encontrado</h1>
            <p className="text-muted-foreground text-sm mb-4">
              {ALLOWED_EMAIL} no existe en Supabase Auth. Créalo en Authentication → Users → Add
              user.
            </p>
            <Link href="/login" className="text-bear-blue hover:underline">
              Ir a login
            </Link>
          </Box>
        )
      }
      const name =
        (u.user_metadata?.full_name as string) ||
        (u.user_metadata?.name as string) ||
        (u.email ? u.email.split('@')[0] : 'User')
      const { error } = await (admin as any)
        .from('users')
        .upsert(
          { id: u.id, email: u.email, name, role: 'admin' },
          { onConflict: 'id' }
        )
      if (error) {
        return (
          <Box>
            <h1 className="text-xl font-semibold mb-2">Error</h1>
            <p className="text-red-500 text-sm mb-4">{error.message}</p>
            <Link href="/admin" className="text-bear-blue hover:underline">
              Intentar /admin
            </Link>
          </Box>
        )
      }
      return (
        <Box>
          <h1 className="text-xl font-semibold mb-2">Listo</h1>
          <p className="text-green-600 text-sm mb-4">
            Admin asignado a {ALLOWED_EMAIL}. Inicia sesión y entra a /admin.
          </p>
          <Link
            href="/login?redirect=/admin"
            className="inline-block px-4 py-2 bg-bear-blue text-white rounded-lg font-medium"
          >
            Ir a iniciar sesión →
          </Link>
        </Box>
      )
    } catch (e) {
      return (
        <Box>
          <h1 className="text-xl font-semibold mb-2">Error</h1>
          <p className="text-red-500 text-sm mb-4">{String(e)}</p>
          <Link href="/login" className="text-bear-blue hover:underline">
            Ir a login
          </Link>
        </Box>
      )
    }
  }

  // Flujo con sesión
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <Box>
        <h1 className="text-xl font-semibold mb-2">Asignar admin</h1>
        <p className="text-muted-foreground text-sm mb-4">
          Opción A: Inicia sesión con {ALLOWED_EMAIL} y vuelve aquí.
          <br />
          Opción B: En Render añade FIX_ADMIN_SECRET y visita /fix-admin?token=tu_secreto
        </p>
        <Link
          href="/login?redirect=/fix-admin"
          className="inline-block px-4 py-2 bg-bear-blue text-white rounded-lg font-medium"
        >
          Ir a iniciar sesión
        </Link>
      </Box>
    )
  }

  if (user.email?.toLowerCase() !== ALLOWED_EMAIL) {
    return (
      <Box>
        <h1 className="text-xl font-semibold mb-2">Solo para {ALLOWED_EMAIL}</h1>
        <p className="text-muted-foreground text-sm">
          Has entrado con <strong>{user.email}</strong>.
        </p>
      </Box>
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
      <Box>
        <h1 className="text-xl font-semibold mb-2">Error</h1>
        <p className="text-red-500 text-sm mb-4">{error.message}</p>
        <Link href="/admin" className="text-bear-blue hover:underline">
          Intentar entrar a /admin
        </Link>
      </Box>
    )
  }

  return (
    <Box>
      <h1 className="text-xl font-semibold mb-2">Listo</h1>
      <p className="text-green-600 text-sm mb-4">Rol admin asignado. Ya puedes entrar al panel.</p>
      <Link
        href="/admin"
        className="inline-block px-4 py-2 bg-bear-blue text-white rounded-lg font-medium"
      >
        Ir al panel admin →
      </Link>
    </Box>
  )
}
