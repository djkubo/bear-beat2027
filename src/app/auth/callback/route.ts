import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/** En producción usar siempre NEXT_PUBLIC_APP_URL para no redirigir a 0.0.0.0 o localhost. */
function getBaseUrl(request: Request): string {
  const origin = new URL(request.url).origin
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (process.env.NODE_ENV === 'production' && appUrl) return appUrl
  return origin
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const baseUrl = getBaseUrl(request)

  if (code) {
    const cookieStore = await cookies()
    const redirectResponse = NextResponse.redirect(`${baseUrl}${next}`)
    const isProd = process.env.NODE_ENV === 'production'
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(`${baseUrl}/login?error=config`)
    }
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
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
              redirectResponse.cookies.set(name, value, opts)
            } catch {
              // ignore
            }
          },
          remove(name: string, options?: unknown) {
            try {
              const opts = { ...(options as Record<string, unknown>), path: '/', sameSite: 'lax' as const, maxAge: 0 }
              if (isProd) (opts as Record<string, unknown>).secure = true
              redirectResponse.cookies.set(name, '', opts)
            } catch {
              // ignore
            }
          },
          setAll(cookiesToSet: { name: string; value: string; options?: unknown }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              const opts = { ...(options as Record<string, unknown>), path: '/', sameSite: 'lax' as const }
              if (isProd) (opts as Record<string, unknown>).secure = true
              redirectResponse.cookies.set(name, value, opts)
            })
          },
        },
        cookieOptions: { path: '/', sameSite: 'lax', secure: isProd },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return redirectResponse
    }
  }

  return NextResponse.redirect(`${baseUrl}/login`)
}
