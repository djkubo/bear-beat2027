import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { formatDate, formatPrice } from '@/lib/utils'
import { ActivatePendingButton } from '../ActivatePendingButton'
import { ActivateByStripeIdForm } from '../ActivateByStripeIdForm'

export default async function AdminPendingPurchasesPage() {
  const supabase = await createServerClient()
  
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

  // Eventos recientes (user_events)
  const { data: events } = await supabase
    .from('user_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-8">
      <a href="/admin" className="text-sm text-bear-blue hover:underline mb-4 inline-block font-medium">
        ← Volver al Panel
      </a>
      <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-1">⏳ Compras Pendientes</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Pagos exitosos que aún no completan datos
      </p>

      <ActivateByStripeIdForm />

      <div className="rounded-xl p-6 border border-white/5 border-l-4 border-l-amber-500/60 bg-zinc-900/80 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-white">
            ⚠️ Pendientes de Completar ({pendingPurchases?.length || 0})
          </h2>
          {pendingPurchases && pendingPurchases.length > 0 && (
            <div className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-4 py-2 rounded-full font-bold">
              ¡Acción requerida!
            </div>
          )}
        </div>

        {!pendingPurchases || pendingPurchases.length === 0 ? (
          <div className="text-center py-8 rounded-xl border border-bear-blue/30 bg-bear-blue/5">
            <p className="text-lg font-bold text-bear-blue">
              ✅ No hay compras pendientes
            </p>
            <p className="text-sm text-zinc-400">
              Todos los pagos están completados
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingPurchases.map((purchase: any) => (
              <div
                key={purchase.id}
                className="border border-amber-500/30 bg-zinc-800/50 rounded-xl p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{purchase.pack?.name}</h3>
                    <p className="text-sm text-zinc-500">
                      Pagado: {formatDate(purchase.created_at)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Session ID: {purchase.stripe_session_id}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-bear-blue">
                      {formatPrice(purchase.amount_paid, purchase.currency as any)}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {purchase.payment_provider}
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/80 rounded-lg p-4 mb-4 border border-white/5">
                  <div className="text-sm font-bold mb-2 text-white">📋 Datos proporcionados:</div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-zinc-500">Email:</span>
                        <div className="font-bold text-white">{purchase.customer_email || '❌ No proporcionado'}</div>
                      </div>
                      <div>
                        <span className="text-zinc-500">Nombre:</span>
                        <div className="font-bold text-white">{purchase.customer_name || '❌ No proporcionado'}</div>
                      </div>
                      <div>
                        <span className="text-zinc-500">Teléfono:</span>
                        <div className="font-bold text-white">{purchase.customer_phone || '❌ No proporcionado'}</div>
                      </div>
                      <div>
                        <span className="text-zinc-500">Expira:</span>
                        <div className="font-bold text-red-400">
                          {formatDate(purchase.expires_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    <div className="bg-bear-blue/10 rounded-lg p-4 border border-bear-blue/30 flex-1 min-w-0">
                      <p className="text-sm font-bold text-bear-blue">
                        ⏰ Usuario puede completar: /complete-purchase?session_id=...
                      </p>
                    </div>
                    <ActivatePendingButton
                      pendingId={purchase.id}
                      sessionId={purchase.stripe_session_id}
                      email={purchase.customer_email}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80 shadow-xl">
        <h2 className="text-xl font-black text-white mb-6">
          ✅ Completadas Recientemente (20)
        </h2>
        {!completedPurchases || completedPurchases.length === 0 ? (
          <p className="text-center py-8 text-zinc-500">Aún no hay compras completadas</p>
        ) : (
          <div className="space-y-3">
            {completedPurchases.map((purchase: any) => (
              <div
                key={purchase.id}
                className="border border-bear-blue/20 bg-bear-blue/5 rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <div className="font-bold text-white">{purchase.user?.name}</div>
                  <div className="text-sm text-zinc-500">{purchase.user?.email}</div>
                  <div className="text-xs text-zinc-500">Compró: {purchase.pack?.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-bear-blue">
                    {formatPrice(purchase.amount_paid, purchase.currency as any)}
                  </div>
                  <div className="text-xs text-zinc-500">Completado: {formatDate(purchase.completed_at)}</div>
                  <a href={`/admin/users/${purchase.user_id}`} className="text-xs text-bear-blue hover:underline">
                    Ver usuario →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80 shadow-xl">
        <h2 className="text-xl font-black text-white mb-6">📝 Eventos Recientes</h2>
        {!events || events.length === 0 ? (
          <p className="text-center py-8 text-zinc-500">Aún no hay eventos</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 px-2 font-bold text-zinc-400">Fecha</th>
                  <th className="text-left py-2 px-2 font-bold text-zinc-400">Evento</th>
                  <th className="text-left py-2 px-2 font-bold text-zinc-400">Session</th>
                  <th className="text-left py-2 px-2 font-bold text-zinc-400">Usuario</th>
                  <th className="text-left py-2 px-2 font-bold text-zinc-400">IP</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event: any) => (
                  <tr key={event.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 px-2 text-xs text-zinc-400">
                      {new Date(event.created_at).toLocaleString('es-MX')}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <span>{getEventIcon(event.event_type)}</span>
                        <span className="font-medium text-white">{event.event_name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 font-mono text-xs text-zinc-400">{event.session_id?.slice(0, 12)}...</td>
                    <td className="py-2 px-2">
                      {event.user_id ? (
                        <a href={`/admin/users/${event.user_id}`} className="text-bear-blue hover:underline text-xs">
                          {event.user_id.slice(0, 8)}...
                        </a>
                      ) : (
                        <span className="text-zinc-500 text-xs">Anónimo</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-xs text-zinc-500">{event.ip_address || '-'}</td>
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
