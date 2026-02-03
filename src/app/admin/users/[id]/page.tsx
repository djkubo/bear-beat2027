import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { formatDate, formatPrice } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-xl text-gray-500">Usuario no encontrado</p>
        <Link href="/admin/users" className="text-bear-blue hover:underline mt-4 inline-block">← Volver a Usuarios</Link>
      </div>
    )
  }

  const { data: purchases } = await supabase
    .from('purchases')
    .select('*, pack:packs(*)')
    .eq('user_id', id)
    .order('purchased_at', { ascending: false })

  const totalSpent = purchases?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="border-b border-white/5 bg-zinc-950/80">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/admin/users" className="text-sm text-bear-blue hover:underline mb-2 block font-medium">
            ← Volver a Usuarios
          </Link>
          <h1 className="text-2xl md:text-3xl font-black text-white">👤 {user.name || 'Usuario'}</h1>
          <p className="text-gray-400">{user.email}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80">
              <h2 className="text-xl font-bold text-white mb-4">📋 Información</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Nombre</div>
                  <div className="font-bold text-white">{user.name || 'Sin nombre'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Email</div>
                  <div className="font-bold text-white">{user.email}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Teléfono</div>
                  <div className="font-bold text-white">{user.phone || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">País</div>
                  <div className="font-bold text-white">{user.country_code || 'MX'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Registro</div>
                  <div className="font-bold text-white">{formatDate(user.created_at)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">ID</div>
                  <div className="font-mono text-xs text-gray-400 break-all">{user.id}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80">
              <h2 className="text-xl font-bold text-white mb-4">📊 Estadísticas</h2>
              <div className="space-y-3">
                <div className="rounded-lg p-4 border border-emerald-500/30 bg-emerald-500/10">
                  <div className="text-3xl font-black text-emerald-400">{purchases?.length || 0}</div>
                  <div className="text-sm text-gray-400">Packs Comprados</div>
                </div>
                <div className="rounded-lg p-4 border border-bear-blue/30 bg-bear-blue/10">
                  <div className="text-3xl font-black text-bear-blue">{formatPrice(totalSpent, 'MXN')}</div>
                  <div className="text-sm text-gray-400">Total Gastado</div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80">
              <h2 className="text-xl font-bold text-white mb-6">
                🎁 Packs Comprados ({purchases?.length || 0})
              </h2>
              {!purchases || purchases.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Este usuario aún no ha comprado ningún pack
                </div>
              ) : (
                <div className="space-y-4">
                  {purchases.map((purchase: any) => (
                    <div
                      key={purchase.id}
                      className="rounded-xl p-6 border border-white/5 bg-zinc-800/50 hover:border-bear-blue/20 transition"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-white">{purchase.pack?.name}</h3>
                          <p className="text-sm text-gray-500">Comprado: {formatDate(purchase.purchased_at)}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-bear-blue">
                            {formatPrice(purchase.amount_paid, purchase.currency)}
                          </div>
                          <div className="text-xs text-gray-500">vía {purchase.payment_provider}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="rounded-lg p-3 border border-white/5 bg-zinc-900/50">
                          <div className="text-xs text-gray-500">Videos</div>
                          <div className="font-bold text-white">{purchase.pack?.total_videos?.toLocaleString()}</div>
                        </div>
                        <div className="rounded-lg p-3 border border-white/5 bg-zinc-900/50">
                          <div className="text-xs text-gray-500">Tamaño</div>
                          <div className="font-bold text-white">{purchase.pack?.total_size_gb} GB</div>
                        </div>
                      </div>
                      {purchase.ftp_username && (
                        <div className="rounded-lg p-4 border border-bear-blue/30 bg-bear-blue/10">
                          <div className="text-sm font-bold text-bear-blue mb-2">🔑 Credenciales FTP</div>
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div>
                              <span className="text-gray-500">Usuario:</span>
                              <div className="font-bold text-white">{purchase.ftp_username}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Contraseña:</span>
                              <div className="font-bold text-white">{purchase.ftp_password}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
