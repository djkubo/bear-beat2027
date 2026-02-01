/**
 * Hetzner Robot Webservice API para crear subcuentas Storage Box.
 * Cuando un cliente paga, se crea una subcuenta read-only y se le asigna.
 * Doc: https://robot.hetzner.com/doc/webservice/en.html
 */

const ROBOT_BASE = 'https://robot-ws.your-server.de'

function randomPassword(length = 20): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  let s = ''
  try {
    const buf = new Uint8Array(length)
    const c = typeof crypto !== 'undefined' ? crypto : (globalThis as any).crypto
    if (c?.getRandomValues) {
      c.getRandomValues(buf)
      for (let i = 0; i < length; i++) s += chars[buf[i]! % chars.length]
      return s
    }
  } catch (_) {}
  for (let i = 0; i < length; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

/**
 * Crea una subcuenta en el Storage Box (solo lectura, para un cliente).
 * Requiere HETZNER_ROBOT_USER, HETZNER_ROBOT_PASSWORD y HETZNER_STORAGEBOX_ID.
 * @returns { username, password } o null si falla o no está configurado.
 */
export async function createStorageBoxSubaccount(options?: {
  password?: string
  homedirectory?: string
  readonly?: boolean
}): Promise<{ username: string; password: string } | null> {
  const user = process.env.HETZNER_ROBOT_USER
  const pass = process.env.HETZNER_ROBOT_PASSWORD
  const boxId = process.env.HETZNER_STORAGEBOX_ID
  if (!user || !pass || !boxId) {
    console.warn('Hetzner Robot: faltan HETZNER_ROBOT_USER, HETZNER_ROBOT_PASSWORD o HETZNER_STORAGEBOX_ID')
    return null
  }

  const password = options?.password ?? randomPassword(20)
  const homedirectory = options?.homedirectory ?? '/'
  const readonly = options?.readonly !== false

  const body = new URLSearchParams({
    homedirectory,
    password,
    readonly: String(readonly),
  })

  const auth = Buffer.from(`${user}:${pass}`).toString('base64')
  const url = `${ROBOT_BASE}/storagebox/${boxId}/subaccount`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: body.toString(),
      // Este endpoint puede ser lento (Ansible usa 30000 ms)
      signal: AbortSignal.timeout(60000),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const code = (err as { error?: { code?: string } })?.error?.code
      if (code === 'STORAGEBOX_SUBACCOUNT_LIMIT_EXCEEDED') {
        console.warn('Hetzner Robot: límite de subcuentas alcanzado')
      } else if (code === 'STORAGEBOX_INVALID_PASSWORD') {
        console.warn('Hetzner Robot: contraseña rechazada por Hetzner')
      } else {
        console.error('Hetzner Robot: crear subcuenta falló', res.status, await res.text())
      }
      return null
    }

    const data = (await res.json()) as { subaccount?: { username?: string; password?: string } }
    const sub = data?.subaccount
    const username = sub?.username
    if (!username) {
      console.error('Hetzner Robot: respuesta sin username', data)
      return null
    }
    // Si la API devuelve password (cuando no enviamos uno), usarlo; si no, el que enviamos
    const finalPassword = typeof sub?.password === 'string' ? sub.password : password
    return { username, password: finalPassword }
  } catch (e) {
    console.error('Hetzner Robot: error de red o timeout', e)
    return null
  }
}
