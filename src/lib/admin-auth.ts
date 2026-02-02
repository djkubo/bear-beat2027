/**
 * Lista blanca de emails que pueden acceder a /admin sin tener role admin en public.users.
 * Variable de entorno: ADMIN_EMAIL_WHITELIST (comma-separated). Ej: vrpacks2021@gmail.com,otro@email.com
 */
const DEFAULT_ADMIN_EMAIL_WHITELIST = 'vrpacks2021@gmail.com'

export function isAdminEmailWhitelist(email: string | undefined): boolean {
  if (!email?.trim()) return false
  const list = (process.env.ADMIN_EMAIL_WHITELIST || DEFAULT_ADMIN_EMAIL_WHITELIST)
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.trim().toLowerCase())
}
