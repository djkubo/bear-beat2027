import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { formatDate, formatPrice } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminPurchasesPage() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  // Obtener todas las compras
  const { data: purchases, count } = await supabase
    .from('purchases')
    .select(`
      *,
      user:users(email, name, phone),
      pack:packs(name, slug)
    `, { count: 'exact' })
    .order('purchased_at', { ascending: false })

  // Calcular ingresos totales
  const totalRevenue = purchases?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0

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
              <h1 className="text-3xl font-extrabold">💳 Compras</h1>
              <p className="text-muted-foreground">
                Total: {count || 0} compras • Ingresos: {formatPrice(totalRevenue, 'MXN')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-card rounded-2xl p-6 border-2 border-bear-blue/30 shadow-xl">
          {!purchases || purchases.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-2xl font-bold text-muted-foreground">
                Aún no hay compras
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-bear-blue/20">
                    <th className="text-left py-4 px-4 font-extrabold">ID</th>
                    <th className="text-left py-4 px-4 font-extrabold">Fecha</th>
                    <th className="text-left py-4 px-4 font-extrabold">Usuario</th>
                    <th className="text-left py-4 px-4 font-extrabold">Pack</th>
                    <th className="text-left py-4 px-4 font-extrabold">Monto</th>
                    <th className="text-left py-4 px-4 font-extrabold">Método</th>
                    <th className="text-left py-4 px-4 font-extrabold">FTP</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase: any) => (
                    <tr key={purchase.id} className="border-b hover:bg-bear-blue/5">
                      <td className="py-4 px-4 font-mono text-sm">
                        #{purchase.id}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium">
                          {formatDate(purchase.purchased_at)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(purchase.purchased_at).toLocaleTimeString('es-MX')}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold">{purchase.user?.name || 'Sin nombre'}</div>
                        <div className="text-sm text-muted-foreground">{purchase.user?.email}</div>
                        {purchase.user?.phone && (
                          <div className="text-xs text-muted-foreground">📱 {purchase.user.phone}</div>
                        )}
                      </td>
                      <td className="py-4 px-4 font-bold">
                        {purchase.pack?.name}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-green-600">
                          {formatPrice(purchase.amount_paid, purchase.currency as any)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {purchase.currency}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 bg-bear-blue/20 text-bear-blue rounded-full text-xs font-bold">
                          {purchase.payment_provider || 'stripe'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {purchase.ftp_username ? (
                          <div className="text-xs">
                            <div className="font-bold">👤 {purchase.ftp_username}</div>
                            <div className="text-muted-foreground">🔑 {purchase.ftp_password?.slice(0, 8)}...</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Sin FTP</span>
                        )}
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
