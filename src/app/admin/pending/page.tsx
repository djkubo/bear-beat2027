import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { formatDate, formatPrice } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminPendingPurchasesPage() {
  const supabase = createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  // Obtener compras pendientes (pagadas pero sin completar datos)
  const { data: pendingPurchases } = await supabase
    .from('pending_purchases')
    .select('*, pack:packs(*)')
    .eq('status', 'awaiting_completion')
    .order('created_at', { ascending: false })
  
  // Obtener compras completadas recientemente
  const { data: completedPurchases } = await supabase
    .from('pending_purchases')
    .select('*, pack:packs(*), user:users(*)')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20)

  // Obtener eventos recientes (user_events)
  const { data: eventsData } = await supabase
    .from('user_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  const events = eventsData ?? []

  return (
    <div className="min-h-screen bg-gradient-to-br from-bear-blue/5 via-background to-bear-black/5">
      {/* Header */}
      <div className="bg-card border-b-2 border-bear-blue/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/admin" className="text-sm text-bear-blue hover:underline mb-2 block">
            ← Volver al Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold">⏳ Compras Pendientes</h1>
          <p className="text-muted-foreground">
            Pagos exitosos que aún no completan datos
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Compras Pendientes (Críticas) */}
        <div className="bg-card rounded-2xl p-6 border-2 border-yellow-500 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-extrabold">
              ⚠️ Pendientes de Completar ({pendingPurchases?.length || 0})
            </h2>
            {pendingPurchases && pendingPurchases.length > 0 && (
              <div className="bg-yellow-500 text-yellow-900 px-4 py-2 rounded-full font-bold">
                ¡Acción requerida!
              </div>
            )}
          </div>
          
          {!pendingPurchases || pendingPurchases.length === 0 ? (
            <div className="text-center py-8 bg-green-50 rounded-xl border-2 border-green-500">
              <p className="text-lg font-bold text-green-700">
                ✅ No hay compras pendientes
              </p>
              <p className="text-sm text-green-600">
                Todos los pagos están completados
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPurchases.map((purchase: any) => (
                <div
                  key={purchase.id}
                  className="bg-yellow-50 border-2 border-yellow-500 rounded-xl p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{purchase.pack?.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Pagado: {formatDate(purchase.created_at)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Session ID: {purchase.stripe_session_id}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-extrabold text-green-600">
                        {formatPrice(purchase.amount_paid, purchase.currency as any)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {purchase.payment_provider}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 mb-4">
                    <div className="text-sm font-bold mb-2">📋 Datos proporcionados:</div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <div className="font-bold">{purchase.customer_email || '❌ No proporcionado'}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Nombre:</span>
                        <div className="font-bold">{purchase.customer_name || '❌ No proporcionado'}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Teléfono:</span>
                        <div className="font-bold">{purchase.customer_phone || '❌ No proporcionado'}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Expira:</span>
                        <div className="font-bold text-red-600">
                          {formatDate(purchase.expires_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-bear-blue/10 rounded-lg p-4 border-2 border-bear-blue/30">
                    <p className="text-sm font-bold text-center">
                      ⏰ Usuario debe completar sus datos en: /complete-purchase?session_id={purchase.stripe_session_id.slice(0, 20)}...
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compras Completadas Recientemente */}
        <div className="bg-card rounded-2xl p-6 border-2 border-bear-blue/30 shadow-xl">
          <h2 className="text-2xl font-extrabold mb-6">
            ✅ Completadas Recientemente (20)
          </h2>
          
          {!completedPurchases || completedPurchases.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Aún no hay compras completadas
            </p>
          ) : (
            <div className="space-y-3">
              {completedPurchases.map((purchase: any) => (
                <div
                  key={purchase.id}
                  className="bg-green-50 border-2 border-green-500 rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold">{purchase.user?.name}</div>
                    <div className="text-sm text-muted-foreground">{purchase.user?.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Compró: {purchase.pack?.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      {formatPrice(purchase.amount_paid, purchase.currency as any)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Completado: {formatDate(purchase.completed_at)}
                    </div>
                    <a 
                      href={`/admin/users/${purchase.user_id}`}
                      className="text-xs text-bear-blue hover:underline"
                    >
                      Ver usuario →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Eventos Recientes */}
        <div className="bg-card rounded-2xl p-6 border-2 border-bear-blue/30 shadow-xl">
          <h2 className="text-2xl font-extrabold mb-6">📝 Eventos Recientes</h2>
          
          {!events || events.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Aún no hay eventos
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-bear-blue/20">
                    <th className="text-left py-2 px-2 font-bold">Fecha</th>
                    <th className="text-left py-2 px-2 font-bold">Evento</th>
                    <th className="text-left py-2 px-2 font-bold">Session</th>
                    <th className="text-left py-2 px-2 font-bold">Usuario</th>
                    <th className="text-left py-2 px-2 font-bold">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event: any) => (
                    <tr key={event.id} className="border-b hover:bg-bear-blue/5">
                      <td className="py-2 px-2 text-xs">
                        {new Date(event.created_at).toLocaleString('es-MX')}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <span>{getEventIcon(event.event_type)}</span>
                          <span className="font-medium">{event.event_name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2 font-mono text-xs">
                        {event.session_id?.slice(0, 12)}...
                      </td>
                      <td className="py-2 px-2">
                        {event.user_id ? (
                          <a 
                            href={`/admin/users/${event.user_id}`}
                            className="text-bear-blue hover:underline text-xs"
                          >
                            {event.user_id.slice(0, 8)}...
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">Anónimo</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">
                        {event.ip_address || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
