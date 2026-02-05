import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { isAdminEmailWhitelist } from '@/lib/admin-auth'
import { ManualRescueForm } from '../ManualRescueForm'
import { SendAccessEmailForm } from '../SendAccessEmailForm'

export default async function AdminRescuePage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = userData?.role === 'admin' || isAdminEmailWhitelist(user.email ?? undefined)
  if (!isAdmin) redirect('/dashboard')

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-8">
      <a href="/admin" className="text-sm text-bear-blue hover:underline mb-4 inline-block font-medium">
        ← Volver al Panel
      </a>
      <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-1">
        🚑 Rescate manual de pagos
      </h1>
      <p className="text-zinc-500 text-sm mb-6">
        Procesa Payment Intents (pi_...) o órdenes PayPal que cobraron pero no activaron. Se crea/usará el usuario, se inserta la compra y se envía el email &quot;Acceso Liberado&quot;. O envía solo ese email a un correo abajo.
      </p>

      <div className="space-y-6">
        <SendAccessEmailForm />
        <ManualRescueForm />
      </div>
    </div>
  )
}
