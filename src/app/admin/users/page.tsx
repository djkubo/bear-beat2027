import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminUsersPage() {
  const supabase = createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  // Obtener todos los usuarios
  const { data: users, count } = await supabase
    .from('users')
    .select('*, purchases(count)', { count: 'exact' })
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-bear-blue/5 via-background to-bear-black/5">
      {/* Header */}
      <div className="bg-card border-b-2 border-bear-blue/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/admin" className="text-sm text-bear-blue hover:underline mb-2 block">
                ← Volver al Dashboard
              </Link>
              <h1 className="text-3xl font-extrabold">👥 Usuarios</h1>
              <p className="text-muted-foreground">Total: {count || 0} usuarios</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-card rounded-2xl p-6 border-2 border-bear-blue/30 shadow-xl">
          {!users || users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-2xl font-bold text-muted-foreground">
                Aún no hay usuarios registrados
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-bear-blue/20">
                    <th className="text-left py-4 px-4 font-extrabold">Usuario</th>
                    <th className="text-left py-4 px-4 font-extrabold">Email</th>
                    <th className="text-left py-4 px-4 font-extrabold">Teléfono</th>
                    <th className="text-left py-4 px-4 font-extrabold">País</th>
                    <th className="text-left py-4 px-4 font-extrabold">Packs</th>
                    <th className="text-left py-4 px-4 font-extrabold">Registro</th>
                    <th className="text-left py-4 px-4 font-extrabold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: any) => (
                    <tr key={user.id} className="border-b hover:bg-bear-blue/5">
                      <td className="py-4 px-4">
                        <div className="font-bold">{user.name || 'Sin nombre'}</div>
                        <div className="text-xs text-muted-foreground">
                          ID: {user.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="py-4 px-4 font-medium">
                        {user.email}
                      </td>
                      <td className="py-4 px-4">
                        {user.phone || '-'}
                      </td>
                      <td className="py-4 px-4">
                        {user.country_code || 'MX'}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                          {user.purchases?.[0]?.count || 0} packs
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="py-4 px-4">
                        <a 
                          href={`/admin/users/${user.id}`}
                          className="text-bear-blue font-bold hover:underline"
                        >
                          Ver detalles →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
