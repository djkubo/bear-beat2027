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
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
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
