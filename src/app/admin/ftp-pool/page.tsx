'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type PoolRow = {
  id: number
  username: string
  in_use: boolean
  assigned_at: string | null
  purchase_id: number | null
  created_at: string
}

export default function AdminFtpPoolPage() {
  const router = useRouter()
  const [list, setList] = useState<PoolRow[]>([])
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchList = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ftp-pool')
      if (res.status === 403) {
        router.push('/dashboard')
        return
      }
      const data = await res.json()
      if (data.list) setList(data.list)
      else setList([])
    } catch (_) {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!username.trim() || !password) {
      setError('Usuario y contraseña son obligatorios.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/ftp-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al añadir la cuenta')
        return
      }
      setSuccess(`Cuenta "${username.trim()}" añadida al pool.`)
      setUsername('')
      setPassword('')
      fetchList()
    } catch (_) {
      setError('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  const free = list.filter((r) => !r.in_use).length
  const inUse = list.filter((r) => r.in_use).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-bear-blue/5 via-background to-bear-black/5">
      <div className="bg-card border-b-2 border-bear-blue/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div>
            <Link href="/admin" className="text-sm text-bear-blue hover:underline mb-2 block">
              ← Volver al Dashboard
            </Link>
            <h1 className="text-3xl font-extrabold">📂 Pool de cuentas FTP</h1>
            <p className="text-muted-foreground">
              Una cuenta por cliente de pago. Libre: {free} · En uso: {inUse}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Añadir cuenta */}
        <div className="bg-card rounded-2xl p-6 border-2 border-bear-blue/30 shadow-xl mb-8">
          <h2 className="text-xl font-bold mb-4">Añadir cuenta al pool</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Crea la subcuenta en Hetzner Console (solo lectura) y pega aquí usuario y contraseña.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Usuario FTP</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej. u540473-sub1"
                className="px-3 py-2 border-2 border-bear-blue/30 rounded-lg bg-background min-w-[180px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="px-3 py-2 border-2 border-bear-blue/30 rounded-lg bg-background min-w-[160px]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-bear-blue text-bear-black font-bold rounded-lg hover:bg-bear-blue/90 disabled:opacity-50"
            >
              {submitting ? 'Añadiendo…' : 'Añadir al pool'}
            </button>
          </form>
          {error && <p className="mt-3 text-red-600 font-medium">{error}</p>}
          {success && <p className="mt-3 text-green-600 font-medium">{success}</p>}
        </div>

        {/* Lista */}
        <div className="bg-card rounded-2xl p-6 border-2 border-bear-blue/30 shadow-xl">
          <h2 className="text-xl font-bold mb-4">Cuentas en el pool</h2>
          {loading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : list.length === 0 ? (
            <p className="text-muted-foreground">
              No hay cuentas. Añade subcuentas creadas en Hetzner para que cada compra reciba una.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-bear-blue/20">
                    <th className="text-left py-3 px-4 font-bold">ID</th>
                    <th className="text-left py-3 px-4 font-bold">Usuario</th>
                    <th className="text-left py-3 px-4 font-bold">Estado</th>
                    <th className="text-left py-3 px-4 font-bold">Compra</th>
                    <th className="text-left py-3 px-4 font-bold">Asignada</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-bear-blue/5">
                      <td className="py-3 px-4 font-mono text-sm">#{row.id}</td>
                      <td className="py-3 px-4 font-medium">{row.username}</td>
                      <td className="py-3 px-4">
                        {row.in_use ? (
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-700 rounded text-sm font-bold">
                            En uso
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-500/20 text-green-700 rounded text-sm font-bold">
                            Libre
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {row.purchase_id != null ? (
                          <Link
                            href="/admin/purchases"
                            className="text-bear-blue hover:underline font-mono"
                          >
                            #{row.purchase_id}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {row.assigned_at
                          ? new Date(row.assigned_at).toLocaleString('es-MX')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
