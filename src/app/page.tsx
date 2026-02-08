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

  // SSR bootstrap: evita que el hero cambie después de hidratar (mejor LCP móvil).
  const { data: featured } = await (supabase.from('packs') as any)
    .select('id, slug, name, description, price_mxn, price_usd, total_videos, total_size_gb, status, release_date, featured')
    .eq('featured', true)
    .limit(1)
    .maybeSingle()

  let pack = featured as
    | {
        id?: number
        slug?: string
        name?: string
        description?: string | null
        price_mxn?: number | null
        price_usd?: number | null
        total_videos?: number | null
        total_size_gb?: number | null
      }
    | null

  if (!pack) {
    const { data: fallback } = await (supabase.from('packs') as any)
      .select('id, slug, name, description, price_mxn, price_usd, total_videos, total_size_gb, status, release_date, featured')
      .eq('status', 'available')
      .order('release_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    pack = fallback || null
  }

  const initialPack = {
    slug: String(pack?.slug || 'enero-2026'),
    name: String(pack?.name || 'Pack Enero 2026'),
    description: pack?.description ?? null,
    price_mxn: Number(pack?.price_mxn) || 350,
    price_usd: pack?.price_usd != null ? Number(pack.price_usd) || 19 : 19,
  }

  const totalVideos = Number(pack?.total_videos) || 0
  const totalSizeGb = Number(pack?.total_size_gb) || 0
  const totalSizeFormatted = totalSizeGb > 0 ? `${totalSizeGb.toFixed(2)} GB` : '0 B'

  let totalPurchases: number | undefined = undefined
  if (pack?.id != null) {
    try {
      const { count } = await supabase
        .from('purchases')
        .select('*', { count: 'exact', head: true })
        .eq('pack_id', pack.id)
      totalPurchases = count ?? undefined
    } catch {
      // ignore
    }
  }

  let initialHeroThumbUrl: string | null = null
  if (pack?.id != null) {
    try {
      const { data: preview } = await (supabase.from('videos') as any)
        .select('file_path, thumbnail_url')
        .eq('pack_id', pack.id)
        .order('artist')
        .limit(1)
        .maybeSingle()

      const thumb = String(preview?.thumbnail_url || '').trim()
      if (thumb) {
        initialHeroThumbUrl =
          thumb.startsWith('http://') || thumb.startsWith('https://')
            ? thumb
            : `/api/thumbnail-cdn?path=${encodeURIComponent(thumb)}`
      } else if (preview?.file_path) {
        initialHeroThumbUrl = `/api/thumbnail-cdn?path=${encodeURIComponent(String(preview.file_path))}`
      }
    } catch {
      // ignore
    }
  }

  return (
    <HomeLanding
      initialPack={initialPack}
      initialPackInfo={{
        totalVideos,
        totalSizeFormatted,
        genreCount: 0,
        totalPurchases,
      }}
      initialHeroThumbUrl={initialHeroThumbUrl}
    />
  )
}
