import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // Durante el build (Docker) puede no haber env; usar placeholders para que no falle el prerender
  if (!url || !key) {
    return createBrowserClient(
      url || 'https://placeholder.supabase.co',
      key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.placeholder'
    )
  }
  return createBrowserClient(url, key)
}
