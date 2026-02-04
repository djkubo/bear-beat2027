import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { formatPrice, formatDate } from '@/lib/utils'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'
import { Users, DollarSign, Package, TrendingUp } from 'lucide-react'
import { SyncVideosFtpButton } from './SyncVideosFtpButton'
import { AdminDashboardToolbar } from './AdminDashboardToolbar'
import { ActivatePendingButton } from './ActivatePendingButton'

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

  // Ingresos totales: purchases + pending_purchases (pagados pero sin activar) = datos reales cobrados
  const { data: purchasesForRevenue } = await supabase.from('purchases').select('amount_paid, currency')
  const { data: pendingPaid } = await supabase
    .from('pending_purchases')
    .select('amount_paid, currency')
    .eq('payment_status', 'paid')
  const revenueMxn = (purchasesForRevenue || [])
    .filter((p: { currency?: string }) => (p.currency || '').toUpperCase() === 'MXN')
    .reduce((s: number, p: { amount_paid?: number }) => s + (p.amount_paid || 0), 0)
  const revenueUsdConverted = (purchasesForRevenue || [])
    .filter((p: { currency?: string }) => (p.currency || '').toUpperCase() === 'USD')
    .reduce((s: number, p: { amount_paid?: number }) => s + (p.amount_paid || 0) * USD_TO_MXN_RATE, 0)
  const pendingRevenueMxn = (pendingPaid || [])
    .filter((p: { currency?: string }) => (p.currency || '').toUpperCase() === 'MXN')
    .reduce((s: number, p: { amount_paid?: number }) => s + (p.amount_paid || 0), 0)
  const pendingRevenueUsd = (pendingPaid || [])
    .filter((p: { currency?: string }) => (p.currency || '').toUpperCase() === 'USD')
    .reduce((s: number, p: { amount_paid?: number }) => s + (p.amount_paid || 0) * USD_TO_MXN_RATE, 0)
  const totalRevenueMxn = Math.round(revenueMxn + revenueUsdConverted + pendingRevenueMxn + pendingRevenueUsd)
  const pendingCount = pendingPaid?.length ?? 0

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

  // Últimas compras activadas (tabla purchases)
  const { data: recentPurchases } = await supabase
    .from('purchases')
    .select(`
      *,
      user:users(email, name),
      pack:packs(name)
    `)
    .order('purchased_at', { ascending: false })
    .limit(10)

  // Pagos cobrados pendientes de activar (para que la compra aparezca aunque no hayan pasado por /complete-purchase)
  const { data: recentPending } = await supabase
    .from('pending_purchases')
    .select('*, pack:packs(name)')
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })
    .limit(10)

  // Lista unificada: activadas + pendientes, ordenada por fecha (la compra cobrada siempre aparece)
  type PaymentRow = {
    id: string | number
    date: string
    email: string
    name: string
    packName: string
    amount: number
    currency: string
    provider: string
    status: 'activated' | 'pending'
    pendingId?: number
    sessionId?: string | null
  }
  const activatedRows: PaymentRow[] = (recentPurchases || []).map((p: any) => ({
    id: p.id,
    date: p.purchased_at,
    email: p.user?.email || '',
    name: p.user?.name || 'Sin nombre',
    packName: p.pack?.name || '—',
    amount: Number(p.amount_paid) || 0,
    currency: p.currency || 'MXN',
    provider: p.payment_provider || 'stripe',
    status: 'activated',
  }))
  const pendingRows: PaymentRow[] = (recentPending || []).map((p: any) => ({
    id: 'p-' + p.id,
    date: p.created_at,
    email: p.customer_email || '',
    name: p.customer_name || 'Pendiente',
    packName: p.pack?.name || '—',
    amount: Number(p.amount_paid) || 0,
    currency: p.currency || 'MXN',
    provider: p.payment_provider || 'stripe',
    status: 'pending',
    pendingId: p.id,
    sessionId: p.stripe_session_id,
  }))
  const allPayments = [...activatedRows, ...pendingRows]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 12)

  return (
    <>
      <AdminDashboardToolbar />

      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <h1 className="text-2xl md:text-3xl font-black text-white mb-6 tracking-tight">
          Panel de Admin
        </h1>

        {/* KPIs - cards oscuras marca Bear Beat */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl p-6 border border-white/5 bg-zinc-900/80 shadow-xl">
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

          <div className="rounded-2xl p-6 border border-white/5 bg-zinc-900/80 shadow-xl">
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

          <div className="rounded-2xl p-6 border border-white/5 bg-zinc-900/80 shadow-xl">
            <div className="flex justify-between items-start mb-3">
              <Package className="h-7 w-7 text-bear-blue" />
              <span className="text-xs font-bold text-zinc-500 bg-white/5 px-2 py-1 rounded">
                +{stats?.purchases_today || 0} hoy
              </span>
            </div>
            <div className="text-3xl font-black text-white mb-0.5">
              {(stats?.total_purchases ?? 0) + pendingCount}
            </div>
            <div className="text-sm text-zinc-400">
              Packs Vendidos {pendingCount > 0 ? `(${stats?.total_purchases ?? 0} activados)` : ''}
            </div>
          </div>

          <div className="rounded-2xl p-6 border border-white/5 bg-zinc-900/80 shadow-xl">
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

        {pendingCount > 0 && (
          <div className="mb-6 rounded-xl p-4 border border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-4">
            <p className="text-amber-200 text-sm">
              <strong>{pendingCount}</strong> pago(s) cobrado(s) aún sin activar (el cliente no completó /complete-purchase).{' '}
              <a href="/admin/pending" className="text-bear-blue hover:underline font-bold">Ver pendientes →</a>
            </p>
          </div>
        )}

        {/* Tarjeta Emails Brevo - enlace rápido */}
        <div className="mb-4">
          <a
            href="/admin/brevo-emails"
            className="block rounded-2xl p-6 border border-white/5 bg-zinc-900/80 hover:border-bear-blue/50 hover:bg-zinc-800/50 shadow-xl transition-all"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-bear-blue/20 text-3xl">
                  📧
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Emails Brevo</h2>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    Entregas, aperturas, clics y rebotes de correos transaccionales
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-lg bg-bear-blue/20 px-4 py-2 text-sm font-bold text-bear-blue">
                Ver actividad →
              </span>
            </div>
          </a>
        </div>

        {/* Tarjeta SMS y WhatsApp */}
        <div className="mb-8">
          <a
            href="/admin/sms-whatsapp"
            className="block rounded-2xl p-6 border border-white/5 bg-zinc-900/80 hover:border-bear-blue/50 hover:bg-zinc-800/50 shadow-xl transition-all"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-bear-blue/20 text-3xl">
                  📱
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">SMS y WhatsApp</h2>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    SMS por Brevo · WhatsApp por Twilio. Plantillas y envío de prueba
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-lg bg-bear-blue/20 px-4 py-2 text-sm font-bold text-bear-blue">
                Configurar y probar →
              </span>
            </div>
          </a>
        </div>

        {/* Fuentes de Tráfico */}
        <div className="mb-8">
          <div className="rounded-2xl p-6 border border-white/5 bg-zinc-900/80 shadow-xl">
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
            { href: '/admin/brevo-emails', icon: '📧', label: 'Emails Brevo' },
            { href: '/admin/sms-whatsapp', icon: '📱', label: 'SMS y WhatsApp' },
            { href: '/admin/push', icon: '🔔', label: 'Push' },
            { href: '/admin/settings', icon: '⚙️', label: 'Config' },
          ].map(({ href, icon, label }) => (
            <a
              key={href}
              href={href}
              className="rounded-xl p-4 border border-white/5 bg-zinc-900/80 hover:border-bear-blue/50 hover:bg-zinc-800/50 shadow-lg transition-all text-center min-h-[80px] flex flex-col items-center justify-center"
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

        {/* Últimos pagos cobrados (activadas + pendientes de activar: la compra siempre aparece) */}
        <div className="rounded-2xl p-6 border border-white/5 bg-zinc-900/80 shadow-xl">
          <h2 className="text-xl font-black text-white mb-1 tracking-tight">
            💳 Últimos pagos cobrados
          </h2>
          <p className="text-sm text-zinc-500 mb-6">
            Incluye cobros exitosos en Stripe. Los marcados &quot;Pendiente&quot; aún no pasaron por /complete-purchase → <a href="/admin/pending" className="text-bear-blue hover:underline">Pendientes</a>
          </p>

          {allPayments.length === 0 ? (
            <p className="text-center py-12 text-zinc-500">Aún no hay pagos cobrados</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left py-3 px-4 font-bold text-zinc-400">Fecha</th>
                      <th className="text-left py-3 px-4 font-bold text-zinc-400">Cliente</th>
                      <th className="text-left py-3 px-4 font-bold text-zinc-400">Pack</th>
                      <th className="text-left py-3 px-4 font-bold text-zinc-400">Monto</th>
                      <th className="text-left py-3 px-4 font-bold text-zinc-400">Estado</th>
                      <th className="text-left py-3 px-4 font-bold text-zinc-400">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPayments.map((row) => (
                      <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4 text-zinc-300">{formatDate(row.date)}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-white">{row.name}</div>
                          <div className="text-sm text-zinc-500">{row.email}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-white">{row.packName}</td>
                        <td className="py-3 px-4 font-bold text-bear-blue">
                          {formatPrice(row.amount, row.currency as any)}
                        </td>
                        <td className="py-3 px-4">
                          {row.status === 'activated' ? (
                            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold">Activada</span>
                          ) : (
                            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-bold">Pendiente de activar</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {row.status === 'pending' && row.pendingId != null ? (
                            <ActivatePendingButton pendingId={row.pendingId} sessionId={row.sessionId} email={row.email} />
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="block md:hidden space-y-4">
                {allPayments.map((row) => (
                  <div key={row.id} className="flex gap-4 p-4 rounded-xl border border-white/5 bg-zinc-800/50">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white truncate">{row.name} · {row.packName}</div>
                      <div className="text-sm text-zinc-500 truncate">{row.email}</div>
                      <div className="text-lg font-bold text-bear-blue mt-0.5">{formatPrice(row.amount, row.currency as any)}</div>
                      <div className="text-xs text-zinc-500 mt-1">{formatDate(row.date)}</div>
                      {row.status === 'activated' ? (
                        <span className="inline-block mt-2 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold">Activada</span>
                      ) : (
                        <>
                          <span className="inline-block mt-2 px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-bold">Pendiente</span>
                          {row.pendingId != null && (
                            <div className="mt-2">
                              <ActivatePendingButton pendingId={row.pendingId} sessionId={row.sessionId} email={row.email} />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
