/**
 * Hetzner Robot API – crear subcuenta en Storage Box (solo lectura para clientes).
 * Doc: https://robot.hetzner.com/doc/webservice/en.html
 * Username formato: uXXXXX-subN (ej. u540473-sub1).
 */

const ROBOT_BASE = 'https://robot-ws.your-server.de'

function getAuth(): string | null {
  const user = process.env.HETZNER_ROBOT_USER
  const pass = process.env.HETZNER_ROBOT_PASSWORD
  if (!user || !pass) return null
  return Buffer.from(`${user}:${pass}`).toString('base64')
}

export type CreateSubaccountResult =
  | { ok: true; username: string; password: string; host: string }
  | { ok: false; error: string }

/** GET lista de subcuentas para obtener el siguiente número (uXXXXX-subN). */
async function listSubaccounts(storageboxId: string): Promise<{ username: string }[]> {
  const auth = getAuth()
  if (!auth) return []
  const url = `${ROBOT_BASE}/storagebox/${storageboxId}/subaccount`
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  })
  if (!res.ok) return []
  const data = await res.json()
  const raw = Array.isArray(data) ? data : Array.isArray((data as any)?.subaccount) ? (data as any).subaccount : []
  return raw
    .map((item: any) => item?.subaccount?.username ?? item?.username)
    .filter(Boolean)
    .map((username: string) => ({ username }))
}

/**
 * Crea una subcuenta en el Storage Box (solo lectura si readOnly=true).
 * Username se genera como u{storageboxId}-sub{N} con N = siguiente número libre.
 */
export async function createStorageBoxSubaccount(
  storageboxId: string,
  _usernameHint: string,
  password: string,
  readOnly: boolean = true
): Promise<CreateSubaccountResult> {
  const auth = getAuth()
  if (!auth) {
    return { ok: false, error: 'HETZNER_ROBOT_USER o HETZNER_ROBOT_PASSWORD no configurados' }
  }

  const existing = await listSubaccounts(storageboxId)
  const prefix = `u${storageboxId}-sub`
  const usedNumbers = new Set(
    existing
      .map((s) => {
        const m = s.username.match(new RegExp(`^${prefix.replace('-', '\\-')}(\\d+)$`))
        return m ? parseInt(m[1], 10) : NaN
      })
      .filter((n) => !Number.isNaN(n))
  )
  let n = 1
  while (usedNumbers.has(n)) n++
  const username = `${prefix}${n}`

  const url = `${ROBOT_BASE}/storagebox/${storageboxId}/subaccount`
  const body = new URLSearchParams({
    username,
    password,
    read_only: readOnly ? 'true' : 'false',
  })

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const msg = (err as { error?: { message?: string } })?.error?.message || res.statusText
      return { ok: false, error: `Hetzner API ${res.status}: ${msg}` }
    }

    const data = (await res.json()) as { subaccount?: { username?: string } }
    const subUsername = data?.subaccount?.username || username
    const host = `${subUsername}.your-storagebox.de`

    return {
      ok: true,
      username: subUsername,
      password,
      host,
    }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Error llamando a Hetzner Robot API' }
  }
}

export function isHetznerFtpConfigured(): boolean {
  return !!(
    process.env.HETZNER_ROBOT_USER &&
    process.env.HETZNER_ROBOT_PASSWORD &&
    process.env.HETZNER_STORAGEBOX_ID
  )
}
