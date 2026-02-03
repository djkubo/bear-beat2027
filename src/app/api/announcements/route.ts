import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/announcements
 * Devuelve el anuncio activo más reciente para el chat.
 * Si la tabla global_announcements no existe en Supabase (404), devuelve [] sin error.
 */
export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('global_announcements')
      .select('id, message')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      const code = (error as { code?: string })?.code
      if (code === 'PGRST116' || code === '42P01') {
        return NextResponse.json({ announcement: null })
      }
      return NextResponse.json({ announcement: null })
    }
    return NextResponse.json({ announcement: data })
  } catch {
    return NextResponse.json({ announcement: null })
  }
}
