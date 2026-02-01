import { createServerClient as createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const isProd = process.env.NODE_ENV === 'production'

export async function createServerClient() {
  const cookieStore = await cookies()

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options?: unknown) {
          try {
            const opts = { ...(options as Record<string, unknown>), path: '/', sameSite: 'lax' as const }
            if (isProd) (opts as Record<string, unknown>).secure = true
            cookieStore.set(name, value, opts)
          } catch {
            // Server component, ignore
          }
        },
        remove(name: string, _options?: unknown) {
          try {
            cookieStore.delete(name)
          } catch {
            // Server component, ignore
          }
        },
        setAll(cookiesToSet: { name: string; value: string; options?: unknown }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const opts = { ...(options as Record<string, unknown>), path: '/', sameSite: 'lax' as const }
              if (isProd) (opts as Record<string, unknown>).secure = true
              cookieStore.set(name, value, opts)
            })
          } catch {
            // Server component, ignore
          }
        },
      },
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
        secure: isProd,
      },
    }
  )
}
