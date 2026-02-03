import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { formatPrice, formatDate } from '@/lib/utils'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'
import { Users, DollarSign, Package, TrendingUp } from 'lucide-react'
import { SyncVideosFtpButton } from './SyncVideosFtpButton'
import { AdminDashboardToolbar } from './AdminDashboardToolbar'

const USD_TO_MXN_RATE = Number(process.env.CURRENCY_USD_TO_MXN_RATE) || 17

function sourceDisplay(source: string): { label: string; icon: string } {
  const s = (source || 'direct').toLowerCase()
  const map: Record<string, { label: string; icon: string }> = {
    facebook: { label: 'Facebook Ads', icon: '📘' },
    instagram: { label: 'Instagram Orgánico', icon: '📸' },
    google: { label: 'Google', icon: '🔍' },
    direct: { label: 'Directo/Desconocido', icon: '⚫' },
    whatsapp: { label: 'WhatsApp', icon: '💚' },
    tiktok: { label: 'TikTok', icon: '🎵' },
    email: { label: 'Email', icon: '📧' },
    referral: { label: 'Referido', icon: '🔗' },
  }
  return map[s] || { label: s, icon: '🌐' }
}

export default async function AdminDashboardPage() {
  const supabase = await createServerClient()
  let { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) session = { user } as typeof session
  }
  const user = session?.user
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('email, role')
    .eq('id', user.id)
    .single()

  const isAdmin = userData?.role === 'admin' || isAdminEmailWhitelist(user.email ?? undefined)
  if (!isAdmin) {
    redirect('/dashboard')
  }

  // KPIs: RPC get_admin_stats (real). Fallback con queries directas si RPC no existe o falla.
  let stats: {
    total_users?: number
    total_purchases?: number
    total_revenue?: number
    users_today?: number
    purchases_today?: number
    conversion_rate?: number
  } | null = null
  const { data: rpcStats } = await supabase.rpc('get_admin_stats')
  if (rpcStats && typeof rpcStats === 'object') {
    stats = rpcStats as typeof stats
  }

  if (!stats) {
    const todayStart = new Date().toISOString().slice(0, 10)
    const todayEnd = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const [{ count: totalUsers }, { count: totalPurchases }, { data: purchasesForRevenue }, { count: usersToday }, { count: purchasesToday }] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('purchases').select('*', { count: 'exact', head: true }),
      supabase.from('purchases').select('amount_paid, currency'),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayStart).lt('created_at', todayEnd),
      supabase.from('purchases').select('*', { count: 'exact', head: true }).gte('purchased_at', todayStart).lt('purchased_at', todayEnd),
    ])
    const revenueMxn = (purchasesForRevenue || [])
      .filter((p: { currency?: string }) => (p.currency || '').toUpperCase() === 'MXN')
      .reduce((s: number, p: { amount_paid?: number }) => s + (p.amount_paid || 0), 0)
    const revenueUsdConverted = (purchasesForRevenue || [])
      .filter((p: { currency?: string }) => (p.currency || '').toUpperCase() === 'USD')
      .reduce((s: number, p: { amount_paid?: number }) => s + (p.amount_paid || 0) * USD_TO_MXN_RATE, 0)
    stats = {
      total_users: totalUsers ?? 0,
      total_purchases: totalPurchases ?? 0,
      total_revenue: Math.round(revenueMxn + revenueUsdConverted),
      users_today: usersToday ?? 0,
      purchases_today: purchasesToday ?? 0,
      conversion_rate: (totalUsers ?? 0) > 0
        ? Math.round(((totalPurchases ?? 0) / (totalUsers ?? 1)) * 10000) / 100
        : 0,
    }
  }

  // Ingresos totales: MXN + USD convertido a MXN (query real; RPC solo devuelve MXN)
  const { data: purchasesForRevenue } = await supabase.from('purchases').select('amount_paid, currency')
  const revenueMxn = (purchasesForRevenue || [])
    .filter((p: { currency?: string }) => (p.currency || '').toUpperCase() === 'MXN')
    .reduce((s: number, p: { amount_paid?: number }) => s + (p.amount_paid || 0), 0)
  const revenueUsdConverted = (purchasesForRevenue || [])
    .filter((p: { currency?: string }) => (p.currency || '').toUpperCase() === 'USD')
    .reduce((s: number, p: { amount_paid?: number }) => s + (p.amount_paid || 0) * USD_TO_MXN_RATE, 0)
  const totalRevenueMxn = Math.round(revenueMxn + revenueUsdConverted)

  // Fuentes de tráfico: agrupar ventas por utm_source (First-Touch). Requiere migración add_purchases_attribution.
  let sourceRows: { source: string; count: number; revenueMxn: number }[] = []
  const { data: purchasesForAttribution, error: _attrError } = await supabase
    .from('purchases')
    .select('utm_source, traffic_source, amount_paid, currency')
  if (!_attrError && purchasesForAttribution?.length !== undefined) {
    const bySource = purchasesForAttribution.reduce(
      (acc: Record<string, { count: number; revenueMxn: number }>, p: { utm_source?: string | null; traffic_source?: string | null; amount_paid?: number; currency?: string }) => {
        const source = (p.utm_source || p.traffic_source || 'direct').toLowerCase()
        if (!acc[source]) acc[source] = { count: 0, revenueMxn: 0 }
        acc[source].count += 1
        const amount = Number(p.amount_paid) || 0
        acc[source].revenueMxn += (p.currency || '').toUpperCase() === 'USD' ? amount * USD_TO_MXN_RATE : amount
        return acc
      },
      {}
    )
    sourceRows = Object.entries(bySource)
      .map(([source, { count, revenueMxn }]) => ({ source, count, revenueMxn: Math.round(revenueMxn) }))
      .sort((a, b) => b.revenueMxn - a.revenueMxn)
  }

  // Últimas compras: SELECT real a purchases con join a users (email, name) y packs (name)
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
    <>
      <AdminDashboardToolbar />

      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <h1 className="text-2xl md:text-3xl font-black text-white mb-6 tracking-tight">
          Panel de Admin
        </h1>

        {/* KPIs - cards oscuras marca Bear Beat */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl p-6 border border-white/10 bg-zinc-900/80 shadow-xl">
            <div className="flex justify-between items-start mb-3">
              <Users className="h-7 w-7 text-bear-blue" />
              <span className="text-xs font-bold text-zinc-500 bg-white/5 px-2 py-1 rounded">
                +{stats?.users_today || 0} hoy
              </span>
            </div>
            <div className="text-3xl font-black text-white mb-0.5">
              {stats?.total_users || 0}
            </div>
            <div className="text-sm text-zinc-400">
              Usuarios Totales
            </div>
          </div>

          <div className="rounded-2xl p-6 border border-white/10 bg-zinc-900/80 shadow-xl">
            <div className="flex justify-between items-start mb-3">
              <DollarSign className="h-7 w-7 text-bear-blue" />
              <span className="text-xs font-bold text-zinc-500 bg-white/5 px-2 py-1 rounded">
                MXN
              </span>
            </div>
            <div className="text-3xl font-black text-white mb-0.5">
              ${totalRevenueMxn.toLocaleString()}
            </div>
            <div className="text-sm text-zinc-400">
              Ingresos Totales
            </div>
          </div>

          <div className="rounded-2xl p-6 border border-white/10 bg-zinc-900/80 shadow-xl">
            <div className="flex justify-between items-start mb-3">
              <Package className="h-7 w-7 text-bear-blue" />
              <span className="text-xs font-bold text-zinc-500 bg-white/5 px-2 py-1 rounded">
                +{stats?.purchases_today || 0} hoy
              </span>
            </div>
            <div className="text-3xl font-black text-white mb-0.5">
              {stats?.total_purchases || 0}
            </div>
            <div className="text-sm text-zinc-400">
              Packs Vendidos
            </div>
          </div>

          <div className="rounded-2xl p-6 border border-white/10 bg-zinc-900/80 shadow-xl">
            <div className="flex justify-between items-start mb-3">
              <TrendingUp className="h-7 w-7 text-bear-blue" />
              <span className="text-xs font-bold text-zinc-500 bg-white/5 px-2 py-1 rounded">
                %
              </span>
            </div>
            <div className="text-3xl font-black text-white mb-0.5">
              {stats?.conversion_rate || '0'}%
            </div>
            <div className="text-sm text-zinc-400">
              Tasa de Conversión
            </div>
          </div>
        </div>

        {/* Fuentes de Tráfico */}
        <div className="mb-8">
          <div className="rounded-2xl p-6 border border-white/10 bg-zinc-900/50 shadow-xl">
            <h2 className="text-xl font-black text-white mb-4 tracking-tight">📊 Fuentes de Tráfico</h2>
            {sourceRows.length === 0 ? (
              <p className="text-zinc-500 text-sm">Aún no hay compras con atribución.</p>
            ) : (
              <ul className="space-y-2">
                {sourceRows.map(({ source, count, revenueMxn }) => {
                  const { label, icon } = sourceDisplay(source)
                  return (
                    <li key={source} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <span className="font-medium text-white">{icon} {label}</span>
                      <span className="text-zinc-400 text-sm">
                        {count} ventas · ${revenueMxn.toLocaleString()} MXN
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Menú de navegación - estilo marca (cards oscuras, borde bear-blue al hover) */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
          {[
            { href: '/admin/users', icon: '👥', label: 'Usuarios' },
            { href: '/admin/purchases', icon: '💳', label: 'Compras' },
            { href: '/admin/packs', icon: '📦', label: 'Packs' },
            { href: '/admin/tracking', icon: '📊', label: 'Tracking' },
            { href: '/admin/attribution', icon: '🎯', label: 'Atribución' },
            { href: '/admin/chatbot', icon: '💬', label: 'Chatbot' },
            { href: '/admin/manychat', icon: '🤖', label: 'ManyChat' },
            { href: '/admin/pending', icon: '⏳', label: 'Pendientes' },
            { href: '/admin/mensajes', icon: '✉️', label: 'Mensajes' },
            { href: '/admin/push', icon: '📱', label: 'Push' },
            { href: '/admin/settings', icon: '⚙️', label: 'Config' },
          ].map(({ href, icon, label }) => (
            <a
              key={href}
              href={href}
              className="rounded-xl p-4 border border-white/10 bg-zinc-900/50 hover:border-bear-blue/50 hover:bg-zinc-800/50 shadow-lg transition-all text-center min-h-[80px] flex flex-col items-center justify-center"
            >
              <div className="text-3xl mb-1">{icon}</div>
              <div className="font-bold text-sm text-white whitespace-nowrap">{label}</div>
            </a>
          ))}
        </div>

        {/* Sync catálogo FTP (usa env del servidor) */}
        <div className="mb-8">
          <SyncVideosFtpButton />
        </div>

        {/* Últimas Compras */}
        <div className="rounded-2xl p-6 border border-white/10 bg-zinc-900/50 shadow-xl">
          <h2 className="text-xl font-black text-white mb-6 tracking-tight">
            💳 Últimas Compras (10)
          </h2>

          {!recentPurchases || recentPurchases.length === 0 ? (
            <p className="text-center py-12 text-zinc-500">
              Aún no hay compras
            </p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 font-bold text-zinc-400 w-10" title="Fuente">Fuente</th>
                      <th className="text-left py-3 px-4 font-bold text-zinc-400">Fecha</th>
                      <th className="text-left py-3 px-4 font-bold text-zinc-400">Usuario</th>
                      <th className="text-left py-3 px-4 font-bold text-zinc-400">Pack</th>
                      <th className="text-left py-3 px-4 font-bold text-zinc-400">Monto</th>
                      <th className="text-left py-3 px-4 font-bold text-zinc-400">Método</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPurchases.map((purchase: any) => {
                      const { icon } = sourceDisplay(purchase.utm_source || purchase.traffic_source || 'direct')
                      return (
                        <tr key={purchase.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-4 text-xl" title={purchase.utm_source || 'direct'}>
                            {icon}
                          </td>
                          <td className="py-3 px-4 text-zinc-300">{formatDate(purchase.purchased_at)}</td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-white">{purchase.user?.name || 'Sin nombre'}</div>
                            <div className="text-sm text-zinc-500">{purchase.user?.email}</div>
                          </td>
                          <td className="py-3 px-4 font-medium text-white">{purchase.pack?.name}</td>
                          <td className="py-3 px-4 font-bold text-bear-blue">
                            {formatPrice(purchase.amount_paid, purchase.currency as any)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-bear-blue/20 text-bear-blue rounded text-xs font-bold">
                              {purchase.payment_provider}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="block md:hidden space-y-4">
                {recentPurchases.map((purchase: any) => {
                  const { icon } = sourceDisplay(purchase.utm_source || purchase.traffic_source || 'direct')
                  return (
                    <div
                      key={purchase.id}
                      className="flex gap-4 p-4 rounded-xl border border-white/10 bg-zinc-800/50"
                    >
                      <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-bear-blue/10 border border-bear-blue/30 flex items-center justify-center text-3xl">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white truncate">
                          {purchase.user?.name || 'Sin nombre'} · {purchase.pack?.name || '—'}
                        </div>
                        <div className="text-lg font-bold text-bear-blue mt-0.5">
                          {formatPrice(purchase.amount_paid, purchase.currency as any)}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">{formatDate(purchase.purchased_at)}</div>
                        <span className="inline-block mt-2 px-2 py-1 bg-bear-blue/20 text-bear-blue rounded text-xs font-bold">
                          {purchase.payment_provider}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
