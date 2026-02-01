import { createBrowserClient } from '@supabase/ssr'

const isProd = process.env.NODE_ENV === 'production'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return createBrowserClient(
      url || 'https://placeholder.supabase.co',
      key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.placeholder'
    )
  }
  return createBrowserClient(url, key, {
    cookies: {},
    cookieOptions: {
      path: '/',
      sameSite: 'lax',
      secure: isProd,
    },
  })
}
