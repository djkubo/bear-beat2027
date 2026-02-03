import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminTrackingPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: events } = await supabase
    .from('user_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: funnelStats } = await supabase.rpc('get_funnel_stats')
  const views = funnelStats?.page_views || 1

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="border-b border-white/5 bg-zinc-950/80">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/admin" className="text-sm text-bear-blue hover:underline mb-2 block font-medium">
            ← Volver al Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-black text-white">📊 Tracking de Usuarios</h1>
          <p className="text-gray-400 text-sm mt-1">Eventos y acciones de usuarios</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/60">
          <h2 className="text-xl font-bold text-white mb-6">🎯 Funnel de Conversión</h2>
          <div className="space-y-4">
            {[
              { label: 'Visitantes', value: funnelStats?.page_views || 0, pct: 100, color: 'bg-bear-blue' },
              { label: 'Click CTA', value: funnelStats?.clicked_cta || 0, pct: (views ? ((funnelStats?.clicked_cta || 0) / views) * 100 : 0), color: 'bg-purple-500' },
              { label: 'Checkout', value: funnelStats?.started_checkout || 0, pct: (views ? ((funnelStats?.started_checkout || 0) / views) * 100 : 0), color: 'bg-amber-500' },
              { label: 'Pagaron', value: funnelStats?.payment_success || 0, pct: (views ? ((funnelStats?.payment_success || 0) / views) * 100 : 0), color: 'bg-emerald-500' },
            ].map(({ label, value, pct, color }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="w-36 font-bold text-gray-300">{label}:</div>
                <div className="flex-1 rounded-full h-8 bg-zinc-800 overflow-hidden relative">
                  <div
                    className={`absolute inset-y-0 left-0 ${color} flex items-center justify-center text-white font-bold text-sm min-w-[2rem]`}
                    style={{ width: `${Math.max(pct, 0)}%` }}
                  >
                    {value > 0 ? value : ''}
                  </div>
                </div>
                <div className="w-16 text-right font-bold text-bear-blue">{pct.toFixed(0)}%</div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <p className="text-3xl font-black text-bear-blue">{funnelStats?.conversion_rate || 0}%</p>
            <p className="text-sm text-gray-500">Tasa de conversión total</p>
          </div>
        </div>

        <div className="rounded-xl p-6 border border-bear-blue/30 bg-gradient-to-br from-bear-blue/10 to-transparent">
          <h2 className="text-xl font-bold text-white mb-4">🤖 Integración ManyChat</h2>
          <p className="text-gray-400 text-sm mb-4">
            Los eventos con email/teléfono se sincronizan con ManyChat.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-xl p-4 border border-white/5 bg-black/20">
              <h3 className="font-bold text-white mb-2">🏷️ Tags</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• bb_visitor</li>
                <li>• bb_lead</li>
                <li>• bb_customer</li>
                <li>• bb_payment_success</li>
              </ul>
            </div>
            <div className="rounded-xl p-4 border border-white/5 bg-black/20">
              <h3 className="font-bold text-white mb-2">📊 Custom Fields</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• bb_last_page</li>
                <li>• bb_total_spent</li>
                <li>• bb_last_pack</li>
              </ul>
            </div>
            <div className="rounded-xl p-4 border border-white/5 bg-black/20">
              <h3 className="font-bold text-white mb-2">🔄 Sincronización</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>✅ Registro</li>
                <li>✅ Compras</li>
                <li>✅ Navegación</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/60">
          <h2 className="text-xl font-bold text-white mb-6">⏱️ Timeline (Últimos 100)</h2>
          {!events || events.length === 0 ? (
            <p className="text-center py-12 text-gray-500">Aún no hay eventos</p>
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
                        <div className="font-bold text-white">{event.event_name}</div>
                        <div className="text-xs text-gray-500">{event.event_type}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      {formatDate(event.created_at)} · {new Date(event.created_at).toLocaleTimeString('es-MX')}
                    </div>
                  </div>
                  <div className="ml-11 mt-2 text-sm space-y-1">
                    {event.session_id && (
                      <div className="text-xs text-gray-500">Session: {event.session_id.slice(0, 20)}...</div>
                    )}
                    {event.user_id && (
                      <div className="text-xs text-gray-500">Usuario: {event.user_id.slice(0, 8)}...</div>
                    )}
                    {event.event_data && Object.keys(event.event_data).length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-bear-blue hover:underline">Ver datos</summary>
                        <pre className="mt-2 bg-zinc-900 p-2 rounded text-gray-400 overflow-x-auto">
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
    'client_error': '❌',
    'client_promise_rejection': '⚠️',
    'react_error': '🔴',
  }
  return icons[eventType] || '📌'
}

function getEventColor(eventType: string): string {
  const colors: Record<string, string> = {
    'page_view': 'border-bear-blue/60 bg-bear-blue/5',
    'click_cta': 'border-purple-500/60 bg-purple-500/5',
    'start_checkout': 'border-amber-500/60 bg-amber-500/5',
    'payment_intent': 'border-amber-400/60 bg-amber-400/5',
    'payment_success': 'border-emerald-500/60 bg-emerald-500/5',
    'registration': 'border-pink-500/60 bg-pink-500/5',
    'login': 'border-indigo-500/60 bg-indigo-500/5',
    'purchase_completed': 'border-emerald-400/60 bg-emerald-400/5',
    'client_error': 'border-red-500/60 bg-red-500/10',
    'client_promise_rejection': 'border-amber-500/60 bg-amber-500/10',
    'react_error': 'border-red-600/60 bg-red-600/10',
  }
  return colors[eventType] || 'border-white/10 bg-zinc-800/30'
}
