/**
 * Bypass temporal para entrar a /admin cuando la sesión Supabase no persiste en producción.
 * Tras usar /fix-admin?token=SECRET, el usuario puede ir a /admin/enter?t=TOKEN para obtener
 * una cookie que permite acceso a /admin durante 15 minutos sin sesión Supabase.
 */

const BYPASS_PREFIX = 'admin-bypass-'
const COOKIE_NAME = 'admin_bypass'
const COOKIE_MAX_AGE_SEC = 15 * 60 // 15 min
const TOKEN_WINDOW_SEC = 300 // 5 min (token de entrada válido 5 min)

function getSecret() {
  return process.env.FIX_ADMIN_SECRET || ''
}

/** Genera token para URL /admin/enter?t=XXX (válido ~5 min) */
export function createBypassToken(): string {
  const secret = getSecret()
  if (!secret) return ''
  const crypto = require('crypto')
  const window = Math.floor(Date.now() / 1000 / TOKEN_WINDOW_SEC)
  return crypto.createHmac('sha256', secret).update(BYPASS_PREFIX + window).digest('hex')
}

/** Verifica token de la URL */
export function verifyBypassToken(token: string): boolean {
  const secret = getSecret()
  if (!secret || !token) return false
  const crypto = require('crypto')
  const now = Math.floor(Date.now() / 1000 / TOKEN_WINDOW_SEC)
  for (const w of [now, now - 1]) {
    const expected = crypto.createHmac('sha256', secret).update(BYPASS_PREFIX + w).digest('hex')
    if (token === expected) return true
  }
  return false
}

/** Genera valor de cookie (expiry + firma) */
export function createBypassCookieValue(): string {
  const secret = getSecret()
  if (!secret) return ''
  const crypto = require('crypto')
  const expiry = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE_SEC
  const sign = crypto.createHmac('sha256', secret).update(String(expiry)).digest('hex')
  return `${expiry}.${sign}`
}

/** Verifica cookie y devuelve si es válida */
export function verifyBypassCookie(cookieValue: string | undefined): boolean {
  const secret = getSecret()
  if (!secret || !cookieValue) return false
  const parts = cookieValue.split('.')
  if (parts.length !== 2) return false
  const [expiryStr, sign] = parts
  const expiry = parseInt(expiryStr, 10)
  if (isNaN(expiry) || expiry < Date.now() / 1000) return false
  const crypto = require('crypto')
  const expected = crypto.createHmac('sha256', secret).update(String(expiry)).digest('hex')
  return sign === expected
}

export { COOKIE_NAME, COOKIE_MAX_AGE_SEC }
