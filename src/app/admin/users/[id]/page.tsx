import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { formatDate, formatPrice } from '@/lib/utils'
import Link from 'next/link'

// Next.js 15: params es Promise
export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()
  
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')
  
  // Obtener datos del usuario
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  
  if (!user) {
    return <div>Usuario no encontrado</div>
  }
  
  // Obtener packs comprados
  const { data: purchases } = await supabase
    .from('purchases')
    .select(`
      *,
      pack:packs(*)
    `)
    .eq('user_id', id)
    .order('purchased_at', { ascending: false })
  
  const totalSpent = purchases?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-bear-blue/5 via-background to-bear-black/5">
      {/* Header */}
      <div className="bg-card border-b-2 border-bear-blue/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/admin/users" className="text-sm text-bear-blue hover:underline mb-2 block">
            ← Volver a Usuarios
          </Link>
          <h1 className="text-3xl font-extrabold">👤 {user.name || 'Usuario'}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Info del usuario */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-2xl p-6 border-2 border-bear-blue/30 shadow-xl">
              <h2 className="text-xl font-extrabold mb-4">📋 Información</h2>
              
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Nombre</div>
                  <div className="font-bold">{user.name || 'Sin nombre'}</div>
                </div>
                
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Email</div>
                  <div className="font-bold">{user.email}</div>
                </div>
                
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Teléfono</div>
                  <div className="font-bold">{user.phone || 'No proporcionado'}</div>
                </div>
                
                <div>
                  <div className="text-xs text-muted-foreground mb-1">País</div>
                  <div className="font-bold">{user.country_code || 'MX'}</div>
                </div>
                
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Registro</div>
                  <div className="font-bold">{formatDate(user.created_at)}</div>
                </div>
                
                <div>
                  <div className="text-xs text-muted-foreground mb-1">ID</div>
                  <div className="font-mono text-xs">{user.id}</div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-card rounded-2xl p-6 border-2 border-bear-blue/30 shadow-xl">
              <h2 className="text-xl font-extrabold mb-4">📊 Estadísticas</h2>
              
              <div className="space-y-3">
                <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                  <div className="text-3xl font-extrabold text-green-600">
                    {purchases?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Packs Comprados</div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                  <div className="text-3xl font-extrabold text-blue-600">
                    {formatPrice(totalSpent, 'MXN')}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Gastado</div>
                </div>
              </div>
            </div>
          </div>

          {/* Packs comprados */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-2xl p-6 border-2 border-bear-blue/30 shadow-xl">
              <h2 className="text-2xl font-extrabold mb-6">
                🎁 Packs Comprados ({purchases?.length || 0})
              </h2>
              
              {!purchases || purchases.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-lg text-muted-foreground">
                    Este usuario aún no ha comprado ningún pack
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {purchases.map((purchase: any) => (
                    <div
                      key={purchase.id}
                      className="border-2 border-bear-blue/20 rounded-xl p-6 hover:border-bear-blue/50 transition-all"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold">{purchase.pack?.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Comprado: {formatDate(purchase.purchased_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-extrabold text-green-600">
                            {formatPrice(purchase.amount_paid, purchase.currency as any)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            vía {purchase.payment_provider}
                          </div>
                        </div>
                      </div>

                      {/* Info del pack */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm text-muted-foreground">Videos</div>
                          <div className="font-bold">{purchase.pack?.total_videos?.toLocaleString()}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm text-muted-foreground">Tamaño</div>
                          <div className="font-bold">{purchase.pack?.total_size_gb} GB</div>
                        </div>
                      </div>

                      {/* Credenciales FTP */}
                      {purchase.ftp_username && (
                        <div className="bg-bear-blue/5 rounded-lg p-4 border-2 border-bear-blue/30">
                          <div className="text-sm font-bold mb-2">🔑 Credenciales FTP:</div>
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div>
                              <span className="text-muted-foreground">Usuario:</span>
                              <div className="font-bold">{purchase.ftp_username}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Contraseña:</span>
                              <div className="font-bold">{purchase.ftp_password}</div>
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
