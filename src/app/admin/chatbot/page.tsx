import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { AnalyzeChatButton } from './AnalyzeChatButton'

// Iconos para intenciones
const INTENT_ICONS: Record<string, string> = {
  password_reset: '🔑',
  payment_no_access: '💳',
  download_issue: '📥',
  price_question: '💰',
  payment_methods: '🏦',
  content_question: '📦',
  how_it_works: '❓',
  invoice_request: '🧾',
  complaint: '😤',
  greeting: '👋',
  goodbye: '👋',
  human_request: '👤',
}

const INTENT_NAMES: Record<string, string> = {
  password_reset: 'Olvidé contraseña',
  payment_no_access: 'Pagué sin acceso',
  download_issue: 'Problema descarga',
  price_question: 'Pregunta de precio',
  payment_methods: 'Métodos de pago',
  content_question: 'Pregunta contenido',
  how_it_works: 'Cómo funciona',
  invoice_request: 'Solicitud factura',
  complaint: 'Queja',
  greeting: 'Saludo',
  goodbye: 'Despedida',
  human_request: 'Pide agente',
}

export default async function AdminChatbotPage() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  // Obtener estadísticas del chatbot
  const { data: stats } = await supabase.rpc('get_chatbot_stats', { days_ago: 30 })
  
  // Obtener conversaciones que necesitan atención humana
  const { data: pendingHuman } = await supabase
    .from('conversations')
    .select('*')
    .eq('needs_human', true)
    .order('last_message_at', { ascending: false })
    .limit(20)
  
  // Obtener conversaciones recientes
  const { data: recentConversations } = await supabase
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(50)
  
  // Obtener intenciones más comunes
  const { data: intentCounts } = await supabase
    .from('messages')
    .select('detected_intent')
    .not('detected_intent', 'is', null)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  
  // Contar intenciones
  const intentStats: Record<string, number> = {}
  intentCounts?.forEach(msg => {
    if (msg.detected_intent) {
      intentStats[msg.detected_intent] = (intentStats[msg.detected_intent] || 0) + 1
    }
  })
  
  const sortedIntents = Object.entries(intentStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  
  // Obtener mensajes sin intención detectada (para mejorar el bot)
  const { data: unansweredMessages } = await supabase
    .from('messages')
    .select('content, created_at')
    .eq('direction', 'inbound')
    .is('detected_intent', null)
    .order('created_at', { ascending: false })
    .limit(20)

  const statData = stats?.[0] || {}

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header de sección – alineado con marca */}
      <div className="border-b border-white/5 bg-zinc-950/80">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <a href="/admin" className="text-sm text-bear-blue hover:underline mb-2 block font-medium">
              ← Volver al Panel
            </a>
            <h1 className="text-2xl md:text-3xl font-black text-white">🤖 Centro de Chatbot</h1>
            <p className="text-gray-400 text-sm mt-1">
              Analytics, conversaciones y mejora del bot
            </p>
          </div>
          <AnalyzeChatButton />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* KPIs – Bear Blue + acentos sutiles en dark */}
        <div className="grid md:grid-cols-5 gap-4">
          <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80 bg-gradient-to-br from-bear-blue/15 to-transparent">
            <div className="text-3xl font-black text-bear-blue">{statData.total_conversations || 0}</div>
            <div className="text-sm text-gray-400 mt-1">Conversaciones (30d)</div>
          </div>
          <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80 bg-gradient-to-br from-emerald-500/15 to-transparent">
            <div className="text-3xl font-black text-emerald-400">{statData.resolved_conversations || 0}</div>
            <div className="text-sm text-gray-400 mt-1">Resueltas</div>
          </div>
          <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80 bg-gradient-to-br from-amber-500/15 to-transparent">
            <div className="text-3xl font-black text-amber-400">{pendingHuman?.length || 0}</div>
            <div className="text-sm text-gray-400 mt-1">Esperando Humano</div>
          </div>
          <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80">
            <div className="text-3xl font-black text-white">{statData.total_messages || 0}</div>
            <div className="text-sm text-gray-400 mt-1">Mensajes Totales</div>
          </div>
          <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80">
            <div className="text-3xl font-black text-bear-blue">{statData.resolution_rate || 0}%</div>
            <div className="text-sm text-gray-400 mt-1">Tasa Resolución</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Esperando atención humana */}
          <div id="esperando-atencion-humana" className="rounded-xl p-6 border border-white/5 bg-zinc-900/60 border-l-4 border-l-amber-500/60">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span>👤</span> Esperando Atención Humana
              {pendingHuman && pendingHuman.length > 0 && (
                <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full text-sm font-bold border border-amber-500/30">
                  {pendingHuman.length}
                </span>
              )}
            </h2>
            {!pendingHuman || pendingHuman.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-2">✅</p>
                <p>No hay conversaciones pendientes</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {pendingHuman.map((conv: any) => (
                  <div key={conv.id} className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white">{conv.name || conv.phone || 'Sin nombre'}</div>
                        <div className="text-sm text-gray-400">{conv.email || conv.phone}</div>
                        {conv.current_intent && (
                          <div className="mt-1 text-sm text-amber-300/90">
                            <span className="mr-1">{INTENT_ICONS[conv.current_intent] || '❓'}</span>
                            <span>{INTENT_NAMES[conv.current_intent] || conv.current_intent}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-400">
                        {conv.last_message_at && new Date(conv.last_message_at).toLocaleString('es-MX')}
                        <div className="font-bold text-white">{conv.total_messages} msgs</div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className="px-3 py-1.5 rounded-lg bg-bear-blue text-bear-black text-sm font-bold hover:bg-bear-blue/90 transition">
                        Atender
                      </button>
                      <button className="px-3 py-1.5 rounded-lg border border-white/20 text-gray-300 text-sm hover:bg-white/5 transition">
                        Ver Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Intenciones */}
          <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/60">
            <h2 className="text-xl font-bold text-white mb-6">🎯 Top Intenciones (30d)</h2>
            {sortedIntents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No hay datos de intenciones aún</div>
            ) : (
              <div className="space-y-3">
                {sortedIntents.map(([intent, count]) => (
                  <div key={intent} className="flex items-center gap-4">
                    <div className="text-2xl w-10 text-center">{INTENT_ICONS[intent] || '❓'}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-white">{INTENT_NAMES[intent] || intent}</span>
                        <span className="font-bold text-bear-blue">{count}</span>
                      </div>
                      <div className="rounded-full h-2 bg-zinc-800 overflow-hidden">
                        <div
                          className="bg-bear-blue h-full rounded-full transition-all"
                          style={{ width: `${(count / sortedIntents[0][1]) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mensajes sin intención */}
        <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/60 border-l-4 border-l-red-500/50">
          <h2 className="text-xl font-bold text-white mb-2">🤔 Mensajes Sin Intención Detectada</h2>
          <p className="text-gray-400 text-sm mb-4">
            Úsalos para agregar nuevas keywords al bot.
          </p>
          {!unansweredMessages || unansweredMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-4xl mb-2">🎉</p>
              <p>¡El bot está entendiendo todo!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
              {unansweredMessages.map((msg: any, index: number) => (
                <div key={index} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                  <p className="text-sm text-white">{msg.content}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(msg.created_at).toLocaleString('es-MX')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversaciones Recientes */}
        <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/60 overflow-hidden">
          <h2 className="text-xl font-bold text-white mb-6">💬 Conversaciones Recientes</h2>
          {!recentConversations || recentConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No hay conversaciones aún</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-3 px-4 font-bold text-gray-300">Usuario</th>
                    <th className="text-left py-3 px-4 font-bold text-gray-300">Última Intención</th>
                    <th className="text-center py-3 px-4 font-bold text-gray-300">Mensajes</th>
                    <th className="text-center py-3 px-4 font-bold text-gray-300">Estado</th>
                    <th className="text-left py-3 px-4 font-bold text-gray-300">Último Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {recentConversations.slice(0, 20).map((conv: any) => (
                    <tr key={conv.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{conv.name || 'Sin nombre'}</div>
                        <div className="text-xs text-gray-500">{conv.phone || conv.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        {conv.current_intent ? (
                          <span className="flex items-center gap-1 text-sm text-gray-300">
                            <span>{INTENT_ICONS[conv.current_intent] || '❓'}</span>
                            <span>{INTENT_NAMES[conv.current_intent] || conv.current_intent}</span>
                          </span>
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-bear-blue">{conv.total_messages}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          conv.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          conv.needs_human ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-bear-blue/20 text-bear-blue border border-bear-blue/30'
                        }`}>
                          {conv.status === 'resolved' ? '✓ Resuelto' : conv.needs_human ? '👤 Pendiente' : '🤖 Activo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {conv.last_message_at && new Date(conv.last_message_at).toLocaleString('es-MX')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Configuración Webhook – marca Bear Beat */}
        <div className="rounded-xl p-6 border border-bear-blue/30 bg-gradient-to-br from-bear-blue/10 to-transparent">
          <h2 className="text-xl font-bold text-white mb-4">⚙️ Configuración del Webhook</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-gray-300 mb-2">URL del Webhook:</h3>
              <code className="bg-black/40 border border-bear-blue/30 text-bear-blue px-3 py-2 rounded-lg block text-sm font-mono">
                https://bear-beat2027.onrender.com/api/manychat/webhook
              </code>
              <p className="text-sm text-gray-400 mt-2">
                ManyChat → Settings → API → Webhooks
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-300 mb-2">Intenciones Disponibles:</h3>
              <div className="text-sm space-y-1 max-h-[150px] overflow-y-auto text-gray-300">
                {Object.entries(INTENT_NAMES).map(([key, name]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span>{INTENT_ICONS[key]}</span>
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
