import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyBypassCookieEdge, COOKIE_NAME } from '@/lib/admin-bypass-edge'

/** Formato cookie bypass: expiry.sign (dos partes). En Edge puede no existir FIX_ADMIN_SECRET; el layout (Node) verifica con secreto. */
function looksLikeBypassCookie(value: string | undefined): boolean {
  if (!value) return false
  const parts = value.split('.')
  if (parts.length !== 2) return false
  const expiry = parseInt(parts[0], 10)
  return !isNaN(expiry) && expiry > 0
}

const BB_MC_ID_COOKIE = 'bb_mc_id'
const BB_USER_NAME_COOKIE = 'bb_user_name'
const MC_ID_MAX_AGE_DAYS = 30
const COOKIE_OPTS = { path: '/', sameSite: 'lax' as const, httpOnly: false }

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const url = request.nextUrl.clone()
  const mcId = url.searchParams.get('mc_id')
  const fname = url.searchParams.get('fname')

  // ManyChat: capturar mc_id y fname, guardar en cookies y redirigir a URL limpia
  if (mcId != null || (fname != null && fname.trim() !== '')) {
    const isProd = process.env.NODE_ENV === 'production'
    const maxAge = MC_ID_MAX_AGE_DAYS * 24 * 60 * 60
    const redirectUrl = new URL(pathname, url.origin)
    url.searchParams.forEach((value, key) => {
      if (key !== 'mc_id' && key !== 'fname') redirectUrl.searchParams.set(key, value)
    })
    const response = NextResponse.redirect(redirectUrl, 307)
    if (mcId) {
      response.cookies.set(BB_MC_ID_COOKIE, mcId, {
        ...COOKIE_OPTS,
        maxAge,
        ...(isProd && { secure: true }),
      })
    }
    if (fname != null && fname.trim() !== '') {
      response.cookies.set(BB_USER_NAME_COOKIE, fname.trim(), {
        ...COOKIE_OPTS,
        maxAge,
        ...(isProd && { secure: true }),
      })
    }
    return response
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  // En producción /fix-admin no existe (404)
  if (pathname === '/fix-admin' && process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }

  try {
    // Rutas /admin: permitir si hay cookie de bypass (tras /fix-admin cuando la sesión no persiste)
    if (pathname.startsWith('/admin')) {
      const bypassCookie = request.cookies.get(COOKIE_NAME)?.value
      const secret = process.env.FIX_ADMIN_SECRET
      // Verificar con secreto en Edge si está disponible; si no, dejar pasar si tiene formato válido (layout verifica)
      const allowedByBypass =
        bypassCookie &&
        (secret
          ? await verifyBypassCookieEdge(bypassCookie, secret)
          : looksLikeBypassCookie(bypassCookie))
      if (allowedByBypass) {
        return response
      }
      // Para /admin sin bypass: dejar pasar; el layout (Node) lee sesión con cookies.get
      return response
    }

    const isProd = process.env.NODE_ENV === 'production'
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options?: unknown) {
            const opts = { ...(options as Record<string, unknown>), path: '/', sameSite: 'lax' as const }
            if (isProd) (opts as Record<string, unknown>).secure = true
            response.cookies.set(name, value, opts)
          },
          remove(name: string, options?: unknown) {
            const opts = { ...(options as Record<string, unknown>), path: '/', sameSite: 'lax' as const, maxAge: 0 }
            if (isProd) (opts as Record<string, unknown>).secure = true
            response.cookies.set(name, '', opts)
          },
          setAll(cookiesToSet: { name: string; value: string; options?: unknown }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              const opts = { ...(options as Record<string, unknown>), path: '/', sameSite: 'lax' as const }
              if (isProd) (opts as Record<string, unknown>).secure = true
              response.cookies.set(name, value, opts)
            })
          },
        },
        cookieOptions: { path: '/', sameSite: 'lax', secure: isProd },
      }
    )
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
