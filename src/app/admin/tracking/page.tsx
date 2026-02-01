import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminTrackingPage() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  // Obtener últimos 100 eventos
  const { data: events } = await supabase
    .from('user_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  
  // Obtener estadísticas del funnel
  const { data: funnelStats } = await supabase.rpc('get_funnel_stats')

  return (
    <div className="min-h-screen bg-gradient-to-br from-bear-blue/5 via-background to-bear-black/5">
      {/* Header */}
      <div className="bg-card border-b-2 border-bear-blue/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/admin" className="text-sm text-bear-blue hover:underline mb-2 block">
            ← Volver al Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold">📊 Tracking de Usuarios</h1>
          <p className="text-muted-foreground">
            Todos los eventos y acciones de usuarios
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Funnel de Conversión */}
        <div className="bg-card rounded-2xl p-6 border-2 border-bear-blue/30 shadow-xl">
          <h2 className="text-2xl font-extrabold mb-6">🎯 Funnel de Conversión</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-40 font-bold">Visitantes:</div>
              <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                  {funnelStats?.page_views || 0}
                </div>
              </div>
              <div className="w-20 text-right font-bold">100%</div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-40 font-bold">Click CTA:</div>
              <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold"
                  style={{ width: `${((funnelStats?.clicked_cta || 0) / (funnelStats?.page_views || 1)) * 100}%` }}
                >
                  {funnelStats?.clicked_cta || 0}
                </div>
              </div>
              <div className="w-20 text-right font-bold">
                {Math.round(((funnelStats?.clicked_cta || 0) / (funnelStats?.page_views || 1)) * 100)}%
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-40 font-bold">Checkout:</div>
              <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold"
                  style={{ width: `${((funnelStats?.started_checkout || 0) / (funnelStats?.page_views || 1)) * 100}%` }}
                >
                  {funnelStats?.started_checkout || 0}
                </div>
              </div>
              <div className="w-20 text-right font-bold">
                {Math.round(((funnelStats?.started_checkout || 0) / (funnelStats?.page_views || 1)) * 100)}%
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-40 font-bold">Pagaron:</div>
              <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white font-bold"
                  style={{ width: `${((funnelStats?.payment_success || 0) / (funnelStats?.page_views || 1)) * 100}%` }}
                >
                  {funnelStats?.payment_success || 0}
                </div>
              </div>
              <div className="w-20 text-right font-bold">
                {Math.round(((funnelStats?.payment_success || 0) / (funnelStats?.page_views || 1)) * 100)}%
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-3xl font-extrabold text-green-600">
              {funnelStats?.conversion_rate || 0}%
            </p>
            <p className="text-sm text-muted-foreground">Tasa de conversión total</p>
          </div>
        </div>

        {/* ManyChat Integration Info */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 shadow-xl text-white">
          <h2 className="text-2xl font-extrabold mb-4">🤖 Integración ManyChat</h2>
          <p className="mb-4">
            Todos los eventos con email/teléfono se sincronizan automáticamente con ManyChat.
          </p>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/20 rounded-xl p-4">
              <h3 className="font-bold mb-2">🏷️ Tags Activos</h3>
              <ul className="text-sm space-y-1">
                <li>• bb_visitor - Visitante</li>
                <li>• bb_lead - Lead captado</li>
                <li>• bb_customer - Cliente</li>
                <li>• bb_payment_success - Pagó</li>
              </ul>
            </div>
            
            <div className="bg-white/20 rounded-xl p-4">
              <h3 className="font-bold mb-2">📊 Custom Fields</h3>
              <ul className="text-sm space-y-1">
                <li>• bb_last_page - Última página</li>
                <li>• bb_total_spent - Total gastado</li>
                <li>• bb_last_pack - Último pack</li>
                <li>• bb_country - País</li>
              </ul>
            </div>
            
            <div className="bg-white/20 rounded-xl p-4">
              <h3 className="font-bold mb-2">🔄 Sincronización</h3>
              <ul className="text-sm space-y-1">
                <li>✅ Registro de usuarios</li>
                <li>✅ Compras exitosas</li>
                <li>✅ Eventos de navegación</li>
                <li>✅ Clicks en CTAs</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 text-sm opacity-80">
            💡 Los flujos automáticos en ManyChat se activan con los tags. Configura tus automations en el dashboard de ManyChat.
          </div>
        </div>

        {/* Timeline de Eventos */}
        <div className="bg-card rounded-2xl p-6 border-2 border-bear-blue/30 shadow-xl">
          <h2 className="text-2xl font-extrabold mb-6">⏱️ Timeline de Eventos (Últimos 100)</h2>
          
          {!events || events.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">
              Aún no hay eventos registrados
            </p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {events.map((event: any) => (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg border-l-4 ${getEventColor(event.event_type)}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getEventIcon(event.event_type)}</span>
                      <div>
                        <div className="font-bold">{event.event_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {event.event_type}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      <div>{formatDate(event.created_at)}</div>
                      <div>{new Date(event.created_at).toLocaleTimeString('es-MX')}</div>
                    </div>
                  </div>
                  
                  <div className="ml-11 mt-2 text-sm space-y-1">
                    {event.session_id && (
                      <div className="text-xs text-muted-foreground">
                        Session: {event.session_id.slice(0, 20)}...
                      </div>
                    )}
                    {event.user_id && (
                      <div className="text-xs text-muted-foreground">
                        Usuario: {event.user_id.slice(0, 8)}...
                      </div>
                    )}
                    {event.ip_address && event.ip_address !== 'unknown' && (
                      <div className="text-xs text-muted-foreground">
                        IP: {event.ip_address}
                      </div>
                    )}
                    {event.event_data && Object.keys(event.event_data).length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-bear-blue hover:underline">
                          Ver datos del evento
                        </summary>
                        <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(event.event_data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getEventIcon(eventType: string): string {
  const icons: Record<string, string> = {
    'page_view': '👁️',
    'click_cta': '👆',
    'start_checkout': '🛒',
    'payment_intent': '💳',
    'payment_success': '✅',
    'registration': '📝',
    'login': '🔐',
    'purchase_completed': '🎉',
  }
  return icons[eventType] || '📌'
}

function getEventColor(eventType: string): string {
  const colors: Record<string, string> = {
    'page_view': 'border-blue-500 bg-blue-50',
    'click_cta': 'border-purple-500 bg-purple-50',
    'start_checkout': 'border-orange-500 bg-orange-50',
    'payment_intent': 'border-yellow-500 bg-yellow-50',
    'payment_success': 'border-green-500 bg-green-50',
    'registration': 'border-pink-500 bg-pink-50',
    'login': 'border-indigo-500 bg-indigo-50',
    'purchase_completed': 'border-green-600 bg-green-100',
  }
  return colors[eventType] || 'border-gray-500 bg-gray-50'
}
