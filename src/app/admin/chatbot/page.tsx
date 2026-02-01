import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'

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
  const supabase = createServerClient()
  
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
    <div className="min-h-screen bg-gradient-to-br from-bear-blue/5 via-background to-bear-black/5">
      {/* Header */}
      <div className="bg-card border-b-2 border-bear-blue/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/admin" className="text-sm text-bear-blue hover:underline mb-2 block">
            ← Volver al Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold">🤖 Centro de Chatbot</h1>
          <p className="text-muted-foreground">
            Analytics, conversaciones y mejora del bot
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* KPIs */}
        <div className="grid md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="text-3xl font-extrabold">{statData.total_conversations || 0}</div>
            <div className="text-sm opacity-90">Conversaciones (30d)</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="text-3xl font-extrabold">{statData.resolved_conversations || 0}</div>
            <div className="text-sm opacity-90">Resueltas</div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="text-3xl font-extrabold">{pendingHuman?.length || 0}</div>
            <div className="text-sm opacity-90">Esperando Humano</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="text-3xl font-extrabold">{statData.total_messages || 0}</div>
            <div className="text-sm opacity-90">Mensajes Totales</div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="text-3xl font-extrabold">{statData.resolution_rate || 0}%</div>
            <div className="text-sm opacity-90">Tasa Resolución</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Conversaciones que necesitan humano */}
          <div className="bg-card rounded-2xl p-6 border-2 border-yellow-500/50 shadow-xl">
            <h2 className="text-2xl font-extrabold mb-6 flex items-center gap-2">
              <span>👤</span> Esperando Atención Humana
              {pendingHuman && pendingHuman.length > 0 && (
                <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-sm">
                  {pendingHuman.length}
                </span>
              )}
            </h2>
            
            {!pendingHuman || pendingHuman.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-4xl mb-2">✅</p>
                <p>No hay conversaciones pendientes</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {pendingHuman.map((conv: any) => (
                  <div key={conv.id} className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold">{conv.name || conv.phone || 'Sin nombre'}</div>
                        <div className="text-sm text-muted-foreground">
                          {conv.email || conv.phone}
                        </div>
                        {conv.current_intent && (
                          <div className="mt-1 text-sm">
                            <span className="mr-1">{INTENT_ICONS[conv.current_intent] || '❓'}</span>
                            <span>{INTENT_NAMES[conv.current_intent] || conv.current_intent}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          {conv.last_message_at && new Date(conv.last_message_at).toLocaleString('es-MX')}
                        </div>
                        <div className="text-sm font-bold">
                          {conv.total_messages} msgs
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className="px-3 py-1 bg-green-500 text-white rounded text-sm font-bold hover:bg-green-600">
                        Atender
                      </button>
                      <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300">
                        Ver Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Intenciones */}
          <div className="bg-card rounded-2xl p-6 border-2 border-bear-blue/30 shadow-xl">
            <h2 className="text-2xl font-extrabold mb-6">🎯 Top Intenciones (30d)</h2>
            
            {sortedIntents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay datos de intenciones aún</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedIntents.map(([intent, count], index) => (
                  <div key={intent} className="flex items-center gap-4">
                    <div className="text-2xl w-10 text-center">
                      {INTENT_ICONS[intent] || '❓'}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">{INTENT_NAMES[intent] || intent}</span>
                        <span className="font-bold">{count}</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-bear-blue h-full rounded-full"
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

        {/* Mensajes sin respuesta (para mejorar el bot) */}
        <div className="bg-card rounded-2xl p-6 border-2 border-red-500/30 shadow-xl">
          <h2 className="text-2xl font-extrabold mb-6">🤔 Mensajes Sin Intención Detectada</h2>
          <p className="text-muted-foreground mb-4">
            Estos mensajes no fueron entendidos por el bot. Úsalos para agregar nuevas keywords.
          </p>
          
          {!unansweredMessages || unansweredMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-4xl mb-2">🎉</p>
              <p>¡El bot está entendiendo todo!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
              {unansweredMessages.map((msg: any, index: number) => (
                <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(msg.created_at).toLocaleString('es-MX')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversaciones Recientes */}
        <div className="bg-card rounded-2xl p-6 border-2 border-bear-blue/30 shadow-xl">
          <h2 className="text-2xl font-extrabold mb-6">💬 Conversaciones Recientes</h2>
          
          {!recentConversations || recentConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay conversaciones aún</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-bear-blue/20">
                    <th className="text-left py-3 px-4 font-bold">Usuario</th>
                    <th className="text-left py-3 px-4 font-bold">Última Intención</th>
                    <th className="text-center py-3 px-4 font-bold">Mensajes</th>
                    <th className="text-center py-3 px-4 font-bold">Estado</th>
                    <th className="text-left py-3 px-4 font-bold">Último Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {recentConversations.slice(0, 20).map((conv: any) => (
                    <tr key={conv.id} className="border-b hover:bg-bear-blue/5">
                      <td className="py-3 px-4">
                        <div className="font-medium">{conv.name || 'Sin nombre'}</div>
                        <div className="text-xs text-muted-foreground">
                          {conv.phone || conv.email}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {conv.current_intent ? (
                          <span className="flex items-center gap-1">
                            <span>{INTENT_ICONS[conv.current_intent] || '❓'}</span>
                            <span className="text-sm">{INTENT_NAMES[conv.current_intent] || conv.current_intent}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {conv.total_messages}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          conv.status === 'resolved' ? 'bg-green-100 text-green-700' :
                          conv.needs_human ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {conv.status === 'resolved' ? '✓ Resuelto' :
                           conv.needs_human ? '👤 Pendiente' :
                           '🤖 Activo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {conv.last_message_at && new Date(conv.last_message_at).toLocaleString('es-MX')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Configuración del Webhook */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
          <h2 className="text-2xl font-extrabold mb-4">⚙️ Configuración del Webhook</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold mb-2">URL del Webhook:</h3>
              <code className="bg-white/20 px-3 py-2 rounded block text-sm">
                https://tudominio.com/api/manychat/webhook
              </code>
              <p className="text-sm mt-2 opacity-90">
                Configura esta URL en ManyChat → Settings → API → Webhooks
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Intenciones Disponibles:</h3>
              <div className="text-sm space-y-1 max-h-[150px] overflow-y-auto">
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
