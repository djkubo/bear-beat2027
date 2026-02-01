import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'

// Iconos para fuentes
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
  
  // Obtener estadísticas por fuente (últimos 30 días)
  const { data: trafficStats } = await supabase.rpc('get_traffic_stats', { days_ago: 30 })
  
  // Obtener top campañas
  const { data: topCampaigns } = await supabase.rpc('get_top_campaigns', { days_ago: 30, limit_rows: 10 })
  
  // Obtener últimos eventos con atribución
  const { data: recentEvents } = await supabase
    .from('user_events')
    .select('*')
    .not('utm_source', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  // Calcular totales
  const totals = trafficStats?.reduce((acc: any, stat: any) => ({
    visits: acc.visits + Number(stat.visits || 0),
    conversions: acc.conversions + Number(stat.conversions || 0),
    revenue: acc.revenue + Number(stat.revenue || 0),
  }), { visits: 0, conversions: 0, revenue: 0 }) || { visits: 0, conversions: 0, revenue: 0 }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bear-blue/5 via-background to-bear-black/5">
      {/* Header */}
      <div className="bg-card border-b-2 border-bear-blue/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/admin" className="text-sm text-bear-blue hover:underline mb-2 block">
            ← Volver al Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold">📊 Atribución de Tráfico</h1>
          <p className="text-muted-foreground">
            De dónde vienen tus usuarios y qué fuentes convierten mejor
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Resumen General */}
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="text-4xl font-extrabold">{totals.visits.toLocaleString()}</div>
            <div className="text-sm opacity-90">Visitas Totales (30d)</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="text-4xl font-extrabold">{trafficStats?.length || 0}</div>
            <div className="text-sm opacity-90">Fuentes de Tráfico</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="text-4xl font-extrabold">{totals.conversions}</div>
            <div className="text-sm opacity-90">Conversiones</div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="text-4xl font-extrabold">${totals.revenue.toLocaleString()}</div>
            <div className="text-sm opacity-90">Ingresos</div>
          </div>
        </div>

        {/* Estadísticas por Fuente */}
        <div className="bg-card rounded-2xl p-6 border-2 border-bear-blue/30 shadow-xl">
          <h2 className="text-2xl font-extrabold mb-6">🎯 Rendimiento por Fuente</h2>
          
          {!trafficStats || trafficStats.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-4xl mb-4">📊</p>
              <p>Aún no hay datos de atribución.</p>
              <p className="text-sm mt-2">Los datos aparecerán cuando los usuarios lleguen con UTMs o desde redes sociales.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-bear-blue/20">
                    <th className="text-left py-3 px-4 font-bold">Fuente</th>
                    <th className="text-left py-3 px-4 font-bold">Medio</th>
                    <th className="text-right py-3 px-4 font-bold">Visitas</th>
                    <th className="text-right py-3 px-4 font-bold">Sesiones</th>
                    <th className="text-right py-3 px-4 font-bold">Conversiones</th>
                    <th className="text-right py-3 px-4 font-bold">Ingresos</th>
                    <th className="text-right py-3 px-4 font-bold">% Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {trafficStats.map((stat: any, index: number) => (
                    <tr key={index} className="border-b hover:bg-bear-blue/5">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{SOURCE_ICONS[stat.source] || '🌐'}</span>
                          <span className="font-medium capitalize">{stat.source}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          stat.medium === 'cpc' ? 'bg-red-100 text-red-700' :
                          stat.medium === 'social' ? 'bg-blue-100 text-blue-700' :
                          stat.medium === 'organic' ? 'bg-green-100 text-green-700' :
                          stat.medium === 'email' ? 'bg-purple-100 text-purple-700' :
                          stat.medium === 'messaging' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {stat.medium}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">{Number(stat.visits).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono">{Number(stat.unique_sessions).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold ${Number(stat.conversions) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {stat.conversions}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-green-600">
                        ${Number(stat.revenue).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold ${
                          Number(stat.conversion_rate) >= 5 ? 'text-green-600' :
                          Number(stat.conversion_rate) >= 2 ? 'text-yellow-600' :
                          'text-gray-400'
                        }`}>
                          {stat.conversion_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Campañas */}
        <div className="bg-card rounded-2xl p-6 border-2 border-purple-500/30 shadow-xl">
          <h2 className="text-2xl font-extrabold mb-6">🏆 Top Campañas</h2>
          
          {!topCampaigns || topCampaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay campañas con UTM registradas aún.</p>
              <p className="text-sm mt-2">Usa <code className="bg-gray-100 px-1 rounded">?utm_campaign=nombre</code> en tus URLs</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topCampaigns.map((campaign: any, index: number) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-500 w-8">#{index + 1}</div>
                  <div className="flex-1">
                    <div className="font-bold">{campaign.campaign}</div>
                    <div className="text-sm text-muted-foreground">
                      {SOURCE_ICONS[campaign.source] || '🌐'} {campaign.source} / {campaign.medium}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">{campaign.conversions} conv.</div>
                    <div className="text-sm text-muted-foreground">{campaign.visits} visitas</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">${Number(campaign.revenue).toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">{campaign.conversion_rate}% conv.</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimos Eventos con Atribución */}
        <div className="bg-card rounded-2xl p-6 border-2 border-bear-blue/30 shadow-xl">
          <h2 className="text-2xl font-extrabold mb-6">⏱️ Últimas Visitas con Atribución</h2>
          
          {!recentEvents || recentEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay eventos con atribución aún.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {recentEvents.map((event: any) => (
                <div key={event.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <div className="text-2xl">{SOURCE_ICONS[event.utm_source] || '🌐'}</div>
                  <div className="flex-1">
                    <div className="font-medium">{event.event_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {event.utm_source} / {event.utm_medium}
                      {event.utm_campaign && ` / ${event.utm_campaign}`}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleString('es-MX')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Guía de UTMs */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-6 text-white">
          <h2 className="text-2xl font-extrabold mb-4">📚 Guía de UTM Parameters</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold mb-2">Parámetros disponibles:</h3>
              <ul className="text-sm space-y-1">
                <li><code className="bg-white/20 px-1 rounded">utm_source</code> - Fuente (facebook, google, tiktok)</li>
                <li><code className="bg-white/20 px-1 rounded">utm_medium</code> - Medio (cpc, social, email)</li>
                <li><code className="bg-white/20 px-1 rounded">utm_campaign</code> - Nombre de campaña</li>
                <li><code className="bg-white/20 px-1 rounded">utm_content</code> - Variación del anuncio</li>
                <li><code className="bg-white/20 px-1 rounded">utm_term</code> - Keywords (para Google)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-2">Ejemplo de URL:</h3>
              <code className="text-xs bg-white/20 p-2 rounded block break-all">
                bearbeat.com?utm_source=facebook&utm_medium=cpc&utm_campaign=enero2026
              </code>
              <p className="text-sm mt-4 opacity-90">
                💡 También detectamos automáticamente tráfico de Facebook, Instagram, TikTok, WhatsApp, etc. sin UTMs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
