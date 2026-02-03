import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { formatDate, formatPrice } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminPurchasesPage() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  // Compras activadas (tabla purchases)
  const { data: purchases, count } = await supabase
    .from('purchases')
    .select(`
      *,
      user:users(email, name, phone),
      pack:packs(name, slug)
    `, { count: 'exact' })
    .order('purchased_at', { ascending: false })

  // Pagos cobrados pero pendientes de activar (la compra exitosa aparece aquí)
  const { data: pendingPaid } = await supabase
    .from('pending_purchases')
    .select('*, pack:packs(name)')
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })

  const totalRevenue = purchases?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0
  const pendingRevenue = pendingPaid?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-8">
      <Link href="/admin" className="text-sm text-bear-blue hover:underline mb-4 inline-block font-medium">
        ← Volver al Panel
      </Link>
      <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-1">💳 Compras</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Activadas: {count || 0} · Ingresos activados: {formatPrice(totalRevenue, 'MXN')}
        {pendingPaid && pendingPaid.length > 0 && (
          <> · <span className="text-amber-400">{pendingPaid.length} cobrados pendientes</span> ({formatPrice(pendingRevenue, 'MXN')})</>
        )}
      </p>

      {pendingPaid && pendingPaid.length > 0 && (
        <div className="rounded-xl p-6 border border-amber-500/30 bg-amber-500/10 shadow-xl">
          <h2 className="text-lg font-black text-amber-200 mb-4">⏳ Pagos cobrados pendientes de activar</h2>
          <p className="text-sm text-zinc-400 mb-4">Cobro exitoso en Stripe; el cliente aún no completó /complete-purchase.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 font-bold text-zinc-400">Fecha</th>
                  <th className="text-left py-2 px-3 font-bold text-zinc-400">Cliente</th>
                  <th className="text-left py-2 px-3 font-bold text-zinc-400">Pack</th>
                  <th className="text-left py-2 px-3 font-bold text-zinc-400">Monto</th>
                </tr>
              </thead>
              <tbody>
                {pendingPaid.map((p: any) => (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="py-2 px-3 text-zinc-300">{formatDate(p.created_at)}</td>
                    <td className="py-2 px-3">
                      <div className="font-medium text-white">{p.customer_name || '—'}</div>
                      <div className="text-zinc-500">{p.customer_email}</div>
                    </td>
                    <td className="py-2 px-3 font-medium text-white">{p.pack?.name || '—'}</td>
                    <td className="py-2 px-3 font-bold text-bear-blue">{formatPrice(p.amount_paid, p.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80 shadow-xl">
        <h2 className="text-lg font-black text-white mb-4">✅ Compras activadas (con acceso)</h2>
        {!purchases || purchases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl font-bold text-zinc-500">Aún no hay compras</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
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
