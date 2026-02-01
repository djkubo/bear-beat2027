import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const redirectResponse = NextResponse.redirect(`${origin}${next}`)
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

  return NextResponse.redirect(`${origin}/login`)
}
