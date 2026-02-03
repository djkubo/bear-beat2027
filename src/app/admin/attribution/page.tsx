import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'

const SOURCE_ICONS: Record<string, string> = {
  facebook: '📘',
  instagram: '📸',
  whatsapp: '💚',
  messenger: '💬',
  tiktok: '🎵',
  twitter: '🐦',
  telegram: '✈️',
  threads: '🧵',
  youtube: '▶️',
  google: '🔍',
  bing: '🔍',
  linkedin: '💼',
  pinterest: '📌',
  reddit: '🤖',
  snapchat: '👻',
  email: '📧',
  direct: '🔗',
}

export default async function AdminAttributionPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: trafficStats } = await supabase.rpc('get_traffic_stats', { days_ago: 30 })
  const { data: topCampaigns } = await supabase.rpc('get_top_campaigns', { days_ago: 30, limit_rows: 10 })
  const { data: recentEvents } = await supabase
    .from('user_events')
    .select('*')
    .not('utm_source', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  const totals = trafficStats?.reduce((acc: any, stat: any) => ({
    visits: acc.visits + Number(stat.visits || 0),
    conversions: acc.conversions + Number(stat.conversions || 0),
    revenue: acc.revenue + Number(stat.revenue || 0),
  }), { visits: 0, conversions: 0, revenue: 0 }) || { visits: 0, conversions: 0, revenue: 0 }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="border-b border-white/5 bg-zinc-950/80">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/admin" className="text-sm text-bear-blue hover:underline mb-2 block font-medium">
            ← Volver al Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-black text-white">📊 Atribución de Tráfico</h1>
          <p className="text-gray-400 text-sm mt-1">
            De dónde vienen tus usuarios y qué fuentes convierten mejor
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80">
            <div className="text-3xl font-black text-bear-blue">{totals.visits.toLocaleString()}</div>
            <div className="text-sm text-gray-400 mt-1">Visitas (30d)</div>
          </div>
          <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80">
            <div className="text-3xl font-black text-white">{trafficStats?.length || 0}</div>
            <div className="text-sm text-gray-400 mt-1">Fuentes</div>
          </div>
          <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80">
            <div className="text-3xl font-black text-emerald-400">{totals.conversions}</div>
            <div className="text-sm text-gray-400 mt-1">Conversiones</div>
          </div>
          <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80">
            <div className="text-3xl font-black text-bear-blue">${totals.revenue.toLocaleString()}</div>
            <div className="text-sm text-gray-400 mt-1">Ingresos</div>
          </div>
        </div>

        <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/60">
          <h2 className="text-xl font-bold text-white mb-6">🎯 Rendimiento por Fuente</h2>
          {!trafficStats || trafficStats.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-4">📊</p>
              <p>Aún no hay datos de atribución.</p>
              <p className="text-sm mt-2">Los datos aparecerán cuando los usuarios lleguen con UTMs.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-3 px-4 font-bold text-gray-300">Fuente</th>
                    <th className="text-left py-3 px-4 font-bold text-gray-300">Medio</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-300">Visitas</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-300">Sesiones</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-300">Conv.</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-300">Ingresos</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-300">%</th>
                  </tr>
                </thead>
                <tbody>
                  {trafficStats.map((stat: any, index: number) => (
                    <tr key={index} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-white">
                          <span className="text-xl">{SOURCE_ICONS[stat.source] || '🌐'}</span>
                          <span className="font-medium capitalize">{stat.source}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          stat.medium === 'cpc' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          stat.medium === 'social' ? 'bg-bear-blue/20 text-bear-blue border border-bear-blue/30' :
                          stat.medium === 'organic' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          stat.medium === 'email' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          'bg-zinc-700/50 text-gray-300 border border-white/5'
                        }`}>
                          {stat.medium}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-300">{Number(stat.visits).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono text-gray-300">{Number(stat.unique_sessions).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={Number(stat.conversions) > 0 ? 'font-bold text-emerald-400' : 'text-gray-500'}>
                          {stat.conversions}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-bear-blue">
                        ${Number(stat.revenue).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-300">{stat.conversion_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/60">
          <h2 className="text-xl font-bold text-white mb-6">🏆 Top Campañas</h2>
          {!topCampaigns || topCampaigns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay campañas con UTM aún.</p>
              <p className="text-sm mt-2">Usa <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-bear-blue">?utm_campaign=nombre</code> en tus URLs</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topCampaigns.map((campaign: any, index: number) => (
                <div key={index} className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-zinc-800/50 hover:bg-white/5">
                  <div className="text-2xl font-bold text-bear-blue w-8">#{index + 1}</div>
                  <div className="flex-1">
                    <div className="font-bold text-white">{campaign.campaign}</div>
                    <div className="text-sm text-gray-400">
                      {SOURCE_ICONS[campaign.source] || '🌐'} {campaign.source} / {campaign.medium}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-400">{campaign.conversions} conv.</div>
                    <div className="text-sm text-gray-500">{campaign.visits} visitas</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-bear-blue">${Number(campaign.revenue).toLocaleString()}</div>
                    <div className="text-sm text-gray-500">{campaign.conversion_rate}% conv.</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/60">
          <h2 className="text-xl font-bold text-white mb-6">⏱️ Últimas Visitas con Atribución</h2>
          {!recentEvents || recentEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No hay eventos con atribución aún.</div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {recentEvents.map((event: any) => (
                <div key={event.id} className="flex items-center gap-4 p-3 rounded-lg border border-white/5 bg-zinc-800/30 hover:bg-white/5">
                  <div className="text-2xl">{SOURCE_ICONS[event.utm_source] || '🌐'}</div>
                  <div className="flex-1">
                    <div className="font-medium text-white">{event.event_name}</div>
                    <div className="text-xs text-gray-500">
                      {event.utm_source} / {event.utm_medium}
                      {event.utm_campaign && ` / ${event.utm_campaign}`}
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {new Date(event.created_at).toLocaleString('es-MX')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl p-6 border border-bear-blue/30 bg-gradient-to-br from-bear-blue/10 to-transparent">
          <h2 className="text-xl font-bold text-white mb-4">📚 Parámetros UTM</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-300">
            <div>
              <h3 className="font-bold text-white mb-2">Parámetros:</h3>
              <ul className="space-y-1">
                <li><code className="bg-black/40 text-bear-blue px-1.5 py-0.5 rounded">utm_source</code> - Fuente</li>
                <li><code className="bg-black/40 text-bear-blue px-1.5 py-0.5 rounded">utm_medium</code> - Medio</li>
                <li><code className="bg-black/40 text-bear-blue px-1.5 py-0.5 rounded">utm_campaign</code> - Campaña</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white mb-2">Ejemplo:</h3>
              <code className="text-xs bg-black/40 text-gray-300 p-2 rounded block break-all">
                bearbeat.com?utm_source=facebook&utm_medium=cpc&utm_campaign=enero2026
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
