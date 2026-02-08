import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getPublicAppOrigin } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function toRedirectUrl(req: NextRequest, path: string): string {
  // Avoid redirecting to internal origins like https://0.0.0.0:10000 in production.
  const origin = getPublicAppOrigin(req)
  if (origin) return new URL(path, origin).toString()
  return path
}

function normalizeRedirectPath(value: string | null | undefined): string | null {
  const v = String(value || '').trim()
  if (!v) return null
  if (!v.startsWith('/')) return null
  if (v.startsWith('//')) return null
  if (v.includes('\n') || v.includes('\r')) return null
  const pathname = v.split('?')[0]?.split('#')[0] || v
  if (pathname.includes('..')) return null
  return v
}

async function parseBody(req: NextRequest): Promise<Record<string, string>> {
  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}))
    if (!body || typeof body !== 'object') return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = String(v)
    }
    return out
  }

  const form = await req.formData().catch(() => null)
  if (!form) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of form.entries()) {
    if (typeof v === 'string') out[k] = v
  }
  return out
}

function getRedirectFromReferer(req: NextRequest): string | null {
  const ref = req.headers.get('referer')
  if (!ref) return null
  try {
    const u = new URL(ref)
    return u.searchParams.get('redirect')
  } catch {
    return null
  }
}

/**
 * POST /api/login
 * Fallback server-side login to avoid leaking credentials in URL if a form submits before hydration (or no-JS).
 */
export async function POST(req: NextRequest) {
  const data = await parseBody(req)

  const email = String(data.email || '').trim()
  const password = String(data.password || '')
  const redirectRaw =
    data.redirect ||
    req.nextUrl.searchParams.get('redirect') ||
    getRedirectFromReferer(req) ||
    ''

  const redirectTo = normalizeRedirectPath(redirectRaw) || '/dashboard'

  if (!email || !password) {
    return NextResponse.redirect(toRedirectUrl(req, '/login?error=missing'), 303)
  }

  try {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return NextResponse.redirect(toRedirectUrl(req, '/login?error=invalid'), 303)
    }
    return NextResponse.redirect(toRedirectUrl(req, redirectTo), 303)
  } catch {
    return NextResponse.redirect(toRedirectUrl(req, '/login?error=server'), 303)
  }
}
