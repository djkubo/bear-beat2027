'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Borrador' },
  { value: 'upcoming', label: 'Próximamente' },
  { value: 'available', label: 'Disponible' },
  { value: 'archived', label: 'Archivado' },
]

export default function AdminPackNewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    price_mxn: 350,
    price_usd: 19,
    release_month: new Date().toISOString().slice(0, 7),
    release_date: new Date().toISOString().slice(0, 10),
    total_videos: 0,
    total_size_gb: 0,
    status: 'draft',
    featured: false,
  })

  const deriveSlug = (name: string) =>
    name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug || deriveSlug(name),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim() || deriveSlug(form.name),
          description: form.description.trim() || null,
          price_mxn: Number(form.price_mxn),
          price_usd: Number(form.price_usd),
          release_month: form.release_month,
          release_date: form.release_date || null,
          total_videos: Number(form.total_videos) || 0,
          total_size_gb: Number(form.total_size_gb) || 0,
          status: form.status,
          featured: form.featured,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Error al crear pack')
        return
      }
      toast.success('Pack creado correctamente')
      router.push('/admin/packs')
      router.refresh()
    } catch (err) {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/admin/packs" className="text-sm text-bear-blue hover:underline mb-4 inline-block font-medium">
        ← Volver a Packs
      </Link>
      <h1 className="text-2xl font-black text-white mb-6">Crear nuevo pack</h1>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-white/5 bg-zinc-900/80 p-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-zinc-800 text-white px-4 py-2 focus:border-bear-blue focus:ring-1 focus:ring-bear-blue"
            placeholder="Pack Enero 2026"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Slug * (URL, sin espacios)</label>
          <input
            type="text"
            required
            value={form.slug}
            onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-zinc-800 text-white px-4 py-2 focus:border-bear-blue focus:ring-1 focus:ring-bear-blue font-mono text-sm"
            placeholder="enero-2026"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-zinc-800 text-white px-4 py-2 focus:border-bear-blue focus:ring-1 focus:ring-bear-blue"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Precio MXN *</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.price_mxn}
              onChange={(e) => setForm((p) => ({ ...p, price_mxn: Number(e.target.value) || 0 }))}
              className="w-full rounded-lg border border-white/10 bg-zinc-800 text-white px-4 py-2 focus:border-bear-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Precio USD *</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.price_usd}
              onChange={(e) => setForm((p) => ({ ...p, price_usd: Number(e.target.value) || 0 }))}
              className="w-full rounded-lg border border-white/10 bg-zinc-800 text-white px-4 py-2 focus:border-bear-blue"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Mes de lanzamiento * (YYYY-MM)</label>
            <input
              type="month"
              required
              value={form.release_month}
              onChange={(e) => setForm((p) => ({ ...p, release_month: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-zinc-800 text-white px-4 py-2 focus:border-bear-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Fecha de lanzamiento</label>
            <input
              type="date"
              value={form.release_date}
              onChange={(e) => setForm((p) => ({ ...p, release_date: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-zinc-800 text-white px-4 py-2 focus:border-bear-blue"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Total videos</label>
            <input
              type="number"
              min={0}
              value={form.total_videos}
              onChange={(e) => setForm((p) => ({ ...p, total_videos: Number(e.target.value) || 0 }))}
              className="w-full rounded-lg border border-white/10 bg-zinc-800 text-white px-4 py-2 focus:border-bear-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Tamaño (GB)</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={form.total_size_gb}
              onChange={(e) => setForm((p) => ({ ...p, total_size_gb: Number(e.target.value) || 0 }))}
              className="w-full rounded-lg border border-white/10 bg-zinc-800 text-white px-4 py-2 focus:border-bear-blue"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Estado</label>
          <select
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-zinc-800 text-white px-4 py-2 focus:border-bear-blue"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="featured"
            checked={form.featured}
            onChange={(e) => setForm((p) => ({ ...p, featured: e.target.checked }))}
            className="rounded border-white/20 bg-zinc-800 text-bear-blue focus:ring-bear-blue"
          />
          <label htmlFor="featured" className="text-sm text-zinc-300">
            Destacado (aparece en landing como pack principal)
          </label>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-bear-blue text-bear-black px-6 py-3 rounded-xl font-bold hover:bg-bear-blue/90 disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear pack'}
          </button>
          <Link
            href="/admin/packs"
            className="bg-zinc-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-700 border border-white/5"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
