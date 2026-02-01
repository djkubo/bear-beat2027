import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { formatPrice, formatDate } from '@/lib/utils'
import { Users, DollarSign, Package, TrendingUp } from 'lucide-react'

export default async function AdminDashboardPage() {
  const supabase = await createServerClient()
  
  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  // Verificar que sea admin
  const { data: userData } = await supabase
    .from('users')
    .select('email, role')
    .eq('id', user.id)
    .single()
  
  // Verificar role de admin
  if (!userData || userData.role !== 'admin') {
    redirect('/')
  }
  
  // Obtener estadísticas
  const { data: stats } = await supabase.rpc('get_admin_stats')
  
  // Obtener últimas compras
  const { data: recentPurchases } = await supabase
    .from('purchases')
    .select(`
      *,
      user:users(email, name),
      pack:packs(name)
    `)
    .order('purchased_at', { ascending: false })
    .limit(10)

  return (
    <div className="min-h-screen bg-gradient-to-br from-bear-blue/5 via-background to-bear-black/5">
      {/* Header */}
      <div className="bg-card border-b-2 border-bear-blue/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img 
                src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png" 
                alt="Bear Beat" 
                className="h-12 w-auto"
              />
              <div>
                <h1 className="text-3xl font-extrabold">Panel de Admin</h1>
                <p className="text-sm text-muted-foreground">Bear Beat</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">👤 {userData?.email}</span>
              <a href="/dashboard">
                <button className="px-4 py-2 bg-bear-blue text-bear-black rounded-lg font-bold hover:bg-bear-blue/90">
                  Ver como Cliente
                </button>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* KPIs */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <Users className="h-8 w-8" />
              <span className="text-sm font-bold bg-white/20 px-2 py-1 rounded">
                +{stats?.users_today || 0} hoy
              </span>
            </div>
            <div className="text-4xl font-extrabold mb-1">
              {stats?.total_users || 0}
            </div>
            <div className="text-sm font-medium opacity-90">
              Usuarios Totales
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <DollarSign className="h-8 w-8" />
              <span className="text-sm font-bold bg-white/20 px-2 py-1 rounded">
                MXN
              </span>
            </div>
            <div className="text-4xl font-extrabold mb-1">
              ${stats?.total_revenue?.toLocaleString() || '0'}
            </div>
            <div className="text-sm font-medium opacity-90">
              Ingresos Totales
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <Package className="h-8 w-8" />
              <span className="text-sm font-bold bg-white/20 px-2 py-1 rounded">
                +{stats?.purchases_today || 0} hoy
              </span>
            </div>
            <div className="text-4xl font-extrabold mb-1">
              {stats?.total_purchases || 0}
            </div>
            <div className="text-sm font-medium opacity-90">
              Packs Vendidos
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <TrendingUp className="h-8 w-8" />
              <span className="text-sm font-bold bg-white/20 px-2 py-1 rounded">
                %
              </span>
            </div>
            <div className="text-4xl font-extrabold mb-1">
              {stats?.conversion_rate || '0'}%
            </div>
            <div className="text-sm font-medium opacity-90">
              Tasa de Conversión
            </div>
          </div>
        </div>

        {/* Menú de navegación - 9 secciones */}
        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-9 gap-3 mb-8">
          <a href="/admin/users" className="bg-card rounded-xl p-4 border-2 border-bear-blue/30 hover:border-bear-blue shadow-lg hover:shadow-xl transition-all text-center">
            <div className="text-3xl mb-1">👥</div>
            <div className="font-bold text-sm">Usuarios</div>
          </a>

          <a href="/admin/purchases" className="bg-card rounded-xl p-4 border-2 border-bear-blue/30 hover:border-bear-blue shadow-lg hover:shadow-xl transition-all text-center">
            <div className="text-3xl mb-1">💳</div>
            <div className="font-bold text-sm">Compras</div>
          </a>

          <a href="/admin/packs" className="bg-card rounded-xl p-4 border-2 border-bear-blue/30 hover:border-bear-blue shadow-lg hover:shadow-xl transition-all text-center">
            <div className="text-3xl mb-1">📦</div>
            <div className="font-bold text-sm">Packs</div>
          </a>

          <a href="/admin/tracking" className="bg-card rounded-xl p-4 border-2 border-bear-blue/30 hover:border-bear-blue shadow-lg hover:shadow-xl transition-all text-center">
            <div className="text-3xl mb-1">📊</div>
            <div className="font-bold text-sm">Tracking</div>
          </a>

          <a href="/admin/attribution" className="bg-card rounded-xl p-4 border-2 border-green-500 hover:border-green-600 shadow-lg hover:shadow-xl transition-all text-center">
            <div className="text-3xl mb-1">🎯</div>
            <div className="font-bold text-sm">Atribución</div>
          </a>

          <a href="/admin/chatbot" className="bg-card rounded-xl p-4 border-2 border-pink-500 hover:border-pink-600 shadow-lg hover:shadow-xl transition-all text-center">
            <div className="text-3xl mb-1">💬</div>
            <div className="font-bold text-sm">Chatbot</div>
          </a>

          <a href="/admin/manychat" className="bg-card rounded-xl p-4 border-2 border-purple-500 hover:border-purple-600 shadow-lg hover:shadow-xl transition-all text-center">
            <div className="text-3xl mb-1">🤖</div>
            <div className="font-bold text-sm">ManyChat</div>
          </a>

          <a href="/admin/pending" className="bg-card rounded-xl p-4 border-2 border-yellow-500 hover:border-yellow-600 shadow-lg hover:shadow-xl transition-all text-center">
            <div className="text-3xl mb-1">⏳</div>
            <div className="font-bold text-sm">Pendientes</div>
          </a>

          <a href="/admin/settings" className="bg-card rounded-xl p-4 border-2 border-bear-blue/30 hover:border-bear-blue shadow-lg hover:shadow-xl transition-all text-center">
            <div className="text-3xl mb-1">⚙️</div>
            <div className="font-bold text-sm">Config</div>
          </a>
        </div>

        {/* Últimas Compras */}
        <div className="bg-card rounded-2xl p-6 border-2 border-bear-blue/30 shadow-xl">
          <h2 className="text-2xl font-extrabold mb-6">
            💳 Últimas Compras (10)
          </h2>
          
          {!recentPurchases || recentPurchases.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">
              Aún no hay compras
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-bear-blue/20">
                    <th className="text-left py-3 px-4 font-bold">Fecha</th>
                    <th className="text-left py-3 px-4 font-bold">Usuario</th>
                    <th className="text-left py-3 px-4 font-bold">Pack</th>
                    <th className="text-left py-3 px-4 font-bold">Monto</th>
                    <th className="text-left py-3 px-4 font-bold">Método</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPurchases.map((purchase: any) => (
                    <tr key={purchase.id} className="border-b hover:bg-bear-blue/5">
                      <td className="py-3 px-4">
                        {formatDate(purchase.purchased_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{purchase.user?.name || 'Sin nombre'}</div>
                        <div className="text-sm text-muted-foreground">{purchase.user?.email}</div>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {purchase.pack?.name}
                      </td>
                      <td className="py-3 px-4 font-bold text-green-600">
                        {formatPrice(purchase.amount_paid, purchase.currency as any)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-bear-blue/10 rounded text-xs font-bold">
                          {purchase.payment_provider}
                        </span>
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
