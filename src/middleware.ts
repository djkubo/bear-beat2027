import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: unknown }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options as Record<string, unknown>)
            )
          },
        },
      }
    )

    // Refrescar sesión (getUser valida/refresca el token)
    const { data: { user } } = await supabase.auth.getUser()
    const pathname = request.nextUrl.pathname

    // Rutas /admin: si no hay usuario, redirigir a login desde aquí (mismo contexto de cookies que el layout)
    if (pathname.startsWith('/admin')) {
      if (!user) {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirect', '/admin')
        const redirectRes = NextResponse.redirect(redirectUrl)
        // Copiar cookies actualizadas al redirect para no perder sesión refrescada
        response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value))
        return redirectRes
      }
    }
  } catch (_e) {
    // Ignorar errores; dejar que el layout decida
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
