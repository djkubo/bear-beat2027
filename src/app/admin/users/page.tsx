import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

type SearchParams = { search?: string }

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createServerClient()
  const params = await searchParams
  const searchTerm = params?.search?.trim().toLowerCase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: users, count } = await supabase
    .from('users')
    .select('*, purchases(count)', { count: 'exact' })
    .order('created_at', { ascending: false })

  const filteredUsers = searchTerm
    ? (users || []).filter(
        (u: any) =>
          u.name?.toLowerCase().includes(searchTerm) ||
          u.email?.toLowerCase().includes(searchTerm) ||
          u.id?.toLowerCase().includes(searchTerm)
      )
    : users || []

  const isEmpty = filteredUsers.length === 0
  const cardContent = isEmpty ? (
    <div className="text-center py-12">
      <p className="text-xl font-bold text-zinc-500">
        {searchTerm
          ? `No hay resultados para "${params?.search}"`
          : 'Aún no hay usuarios registrados'}
      </p>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left py-4 px-4 font-bold text-zinc-400">Usuario</th>
            <th className="text-left py-4 px-4 font-bold text-zinc-400">Email</th>
            <th className="text-left py-4 px-4 font-bold text-zinc-400">Teléfono</th>
            <th className="text-left py-4 px-4 font-bold text-zinc-400">País</th>
            <th className="text-left py-4 px-4 font-bold text-zinc-400">Packs</th>
            <th className="text-left py-4 px-4 font-bold text-zinc-400">Registro</th>
            <th className="text-left py-4 px-4 font-bold text-zinc-400">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user: any) => (
            <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
              <td className="py-4 px-4">
                <div className="font-bold text-white">{user.name || 'Sin nombre'}</div>
                <div className="text-xs text-zinc-500">
                  ID: {user.id.slice(0, 8)}...
                </div>
              </td>
              <td className="py-4 px-4 font-medium text-zinc-300">{user.email}</td>
              <td className="py-4 px-4 text-zinc-400">{user.phone || '-'}</td>
              <td className="py-4 px-4 text-zinc-400">{user.country_code || 'MX'}</td>
              <td className="py-4 px-4">
                <span className="px-3 py-1 bg-bear-blue/20 text-bear-blue rounded-full text-sm font-bold">
                  {user.purchases?.[0]?.count || 0} packs
                </span>
              </td>
              <td className="py-4 px-4 text-sm text-zinc-500">{formatDate(user.created_at)}</td>
              <td className="py-4 px-4">
                <a
                  href={`/admin/users/${user.id}`}
                  className="text-bear-blue font-bold hover:underline transition"
                >
                  Ver detalles →
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <a href="/admin" className="text-sm text-bear-blue hover:underline mb-4 inline-block font-medium">
        ← Volver al Panel
      </a>
      <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-1">👥 Usuarios</h1>
      <p className="text-zinc-500 text-sm mb-6">
        {searchTerm
          ? `${filteredUsers.length} resultado(s) para "${params?.search}"`
          : `Total: ${count || 0} usuarios`}
      </p>
      <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80 shadow-xl">
        {cardContent}
      </div>
    </div>
  )
}
