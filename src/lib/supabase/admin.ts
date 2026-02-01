/**
 * Cliente Supabase con service role (solo para uso en servidor).
 * Bypasea RLS. Usar solo para operaciones internas (pool FTP, etc.).
 */

import { createClient } from '@supabase/supabase-js'

let adminClient: ReturnType<typeof createClient> | null = null

export function createServiceRoleClient() {
  if (adminClient) return adminClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
  }
  adminClient = createClient(url, key)
  return adminClient
}
