import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Cliente Supabase con service role (solo usar en API routes del servidor).
 * Tiene acceso total a la BD; no usar en el cliente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient<Database>(url, key)
}
