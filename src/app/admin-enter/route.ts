import { NextRequest, NextResponse } from 'next/server'
import {
  verifyBypassToken,
  createBypassCookieValue,
  COOKIE_NAME,
  COOKIE_MAX_AGE_SEC,
} from '@/lib/admin-bypass'

/**
 * GET /admin-enter?t=TOKEN
 * Tras usar /fix-admin?token=SECRET, usa el enlace "Entrar al panel" que trae t=TOKEN.
 * Verifica el token, setea cookie de bypass y redirige a /admin (sin depender de sesión Supabase).
 */
export async function GET(request: NextRequest) {
  const t = request.nextUrl.searchParams.get('t')
  if (!t || !verifyBypassToken(t)) {
    return NextResponse.redirect(new URL('/login?redirect=/admin', request.url))
  }
  const cookieValue = createBypassCookieValue()
  if (!cookieValue) {
    return NextResponse.redirect(new URL('/login?redirect=/admin', request.url))
  }
  const res = NextResponse.redirect(new URL('/admin', request.url))
  res.cookies.set(COOKIE_NAME, cookieValue, {
    path: '/',
    maxAge: COOKIE_MAX_AGE_SEC,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
  return res
}
