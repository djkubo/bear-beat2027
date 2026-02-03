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
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <Link href="/admin" className="text-sm text-bear-blue hover:text-cyan-400 mb-4 inline-block">
        ← Volver al Panel
      </Link>
      <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-1">💳 Compras</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Total: {count || 0} compras • Ingresos: {formatPrice(totalRevenue, 'MXN')}
      </p>

      <div className="rounded-2xl p-6 border border-white/10 bg-zinc-900/50 shadow-xl">
        {!purchases || purchases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl font-bold text-zinc-500">Aún no hay compras</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 font-bold text-zinc-400">ID</th>
                  <th className="text-left py-4 px-4 font-bold text-zinc-400">Fecha</th>
                  <th className="text-left py-4 px-4 font-bold text-zinc-400">Usuario</th>
                  <th className="text-left py-4 px-4 font-bold text-zinc-400">Pack</th>
                  <th className="text-left py-4 px-4 font-bold text-zinc-400">Monto</th>
                  <th className="text-left py-4 px-4 font-bold text-zinc-400">Método</th>
                  <th className="text-left py-4 px-4 font-bold text-zinc-400">FTP</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase: any) => (
                  <tr key={purchase.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-4 px-4 font-mono text-sm text-zinc-400">
                      #{purchase.id}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-white">{formatDate(purchase.purchased_at)}</div>
                      <div className="text-xs text-zinc-500">
                        {new Date(purchase.purchased_at).toLocaleTimeString('es-MX')}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-white">{purchase.user?.name || 'Sin nombre'}</div>
                      <div className="text-sm text-zinc-500">{purchase.user?.email}</div>
                      {purchase.user?.phone && (
                        <div className="text-xs text-zinc-500">📱 {purchase.user.phone}</div>
                      )}
                    </td>
                    <td className="py-4 px-4 font-bold text-white">
                      {purchase.pack?.name}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-bear-blue">
                        {formatPrice(purchase.amount_paid, purchase.currency as any)}
                      </div>
                      <div className="text-xs text-zinc-500">{purchase.currency}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-3 py-1 bg-bear-blue/20 text-bear-blue rounded-full text-xs font-bold">
                        {purchase.payment_provider || 'stripe'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm">
                      {purchase.ftp_username ? (
                        <div className="text-xs">
                          <div className="font-bold text-white">👤 {purchase.ftp_username}</div>
                          <div className="text-zinc-500">🔑 {purchase.ftp_password?.slice(0, 8)}...</div>
                        </div>
                      ) : (
                        <span className="text-zinc-500 text-xs">Sin FTP</span>
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
  )
}
