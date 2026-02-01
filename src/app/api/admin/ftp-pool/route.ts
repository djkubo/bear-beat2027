import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'

type FtpPoolInsert = Database['public']['Tables']['ftp_pool']['Insert']

/**
 * POST: Crear credencial FTP en el pool (admin).
 * Body: { username: string, password: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password } = body as { username?: string; password?: string }
    if (!username || !password) {
      return NextResponse.json(
        { error: 'username y password son requeridos' },
        { status: 400 }
      )
    }
    const adminClient = createAdminClient()
    const row: FtpPoolInsert = { username, password }
    const { data, error } = await adminClient
      .from('ftp_pool')
      .insert(row as never)
      .select('id, username, in_use')
      .single()
    if (error) {
      console.error('ftp_pool insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (e) {
    console.error('ftp-pool POST:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
