/**
 * GET /api/packs – Listado público de packs (available + featured).
 * Usado por la landing y el checkout para mostrar precios y slugs sin hardcode.
 * Query: featured=true devuelve solo el pack destacado (o el primero available).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const featuredOnly = req.nextUrl.searchParams.get('featured') === 'true'

    let query = (supabase.from('packs') as any)
      .select('id, slug, name, description, price_mxn, price_usd, release_month, release_date, total_videos, total_size_gb, status, featured')
      .in('status', ['available', 'upcoming'])
      .order('release_date', { ascending: false })

    if (featuredOnly) {
      query = query.eq('featured', true).limit(1)
    }

    const { data, error } = await query

    if (error) {
      console.error('API packs:', error)
      return NextResponse.json({ error: 'Error al cargar packs' }, { status: 500 })
    }

    if (featuredOnly) {
      const single = Array.isArray(data) ? data[0] : null
      if (!single) {
        const { data: fallback } = await (supabase.from('packs') as any)
          .select('id, slug, name, description, price_mxn, price_usd, release_month, release_date, total_videos, total_size_gb, status, featured')
          .eq('status', 'available')
          .order('release_date', { ascending: false })
          .limit(1)
          .maybeSingle()
        return NextResponse.json({ pack: fallback || null })
      }
      return NextResponse.json({ pack: single })
    }

    return NextResponse.json({ packs: data || [] })
  } catch (e) {
    console.error('API packs GET:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
