/**
 * Verificación de cookie de bypass para Edge (middleware).
 * Usa Web Crypto en lugar de Node crypto.
 */

const COOKIE_NAME = 'admin_bypass'

export { COOKIE_NAME }

export async function verifyBypassCookieEdge(
  cookieValue: string | undefined,
  secret: string | undefined
): Promise<boolean> {
  if (!secret || !cookieValue) return false
  const parts = cookieValue.split('.')
  if (parts.length !== 2) return false
  const [expiryStr, signHex] = parts
  const expiry = parseInt(expiryStr, 10)
  if (isNaN(expiry) || expiry < Date.now() / 1000) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(expiryStr)
  )
  const expectedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return signHex === expectedHex
}
