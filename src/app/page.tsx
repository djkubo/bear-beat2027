import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import HomeLanding from '@/components/landing/HomeLanding'

// ==========================================
// HOME – Redirección RSC: usuario con compra → Dashboard
// ==========================================

export default async function HomePage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: purchases } = await supabase
      .from('purchases')
      .select('*')
      .eq('user_id', user.id)

    if (purchases && purchases.length > 0) {
      redirect('/dashboard')
    }
  }

  return <HomeLanding />
}
