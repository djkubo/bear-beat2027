import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { formatDate, formatPrice, formatMonth } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminPacksPage() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  // Obtener todos los packs con contador de ventas
  const { data: packs } = await supabase
    .from('packs')
    .select(`
      *,
      purchases(count)
    `)
    .order('release_date', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <a href="/admin" className="text-sm text-bear-blue hover:underline mb-2 inline-block font-medium">
            ← Volver al Panel
          </a>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">📦 Gestión de Packs</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Total: {packs?.length || 0} packs
          </p>
        </div>
        <Link href="/admin/packs/new" className="w-full sm:w-auto inline-flex justify-center bg-bear-blue text-bear-black px-6 py-3 rounded-xl font-bold hover:bg-bear-blue/90 transition shadow-[0_0_15px_rgba(8,225,247,0.2)]">
          ➕ Crear Nuevo Pack
        </Link>
      </div>

      {!packs || packs.length === 0 ? (
        <div className="rounded-xl p-12 border border-white/5 bg-zinc-900/80 text-center">
          <p className="text-xl font-bold text-zinc-400 mb-4">
            No hay packs creados
          </p>
          <Link href="/admin/packs/new" className="inline-block bg-bear-blue text-bear-black px-8 py-4 rounded-xl font-bold hover:bg-bear-blue/90 transition">
            ➕ Crear Primer Pack
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packs.map((pack: any) => {
            const salesCount = pack.purchases?.[0]?.count || 0
            const revenue = salesCount * Number(pack.price_mxn)
            return (
              <div
                key={pack.id}
                className="rounded-xl overflow-hidden border border-white/5 bg-zinc-900/80 shadow-xl hover:border-bear-blue/30 transition-all"
              >
                <div className={`p-3 ${
                  pack.status === 'available' ? 'bg-bear-blue/20 border-b border-bear-blue/30' :
                  pack.status === 'upcoming' ? 'bg-amber-500/20 border-b border-amber-500/30' :
                  pack.status === 'draft' ? 'bg-zinc-700/50 border-b border-white/10' :
                  'bg-zinc-800/50 border-b border-white/10'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-sm">
                      {pack.status === 'available' ? '✅ DISPONIBLE' :
                       pack.status === 'upcoming' ? '📅 PRÓXIMAMENTE' :
                       pack.status === 'draft' ? '📝 BORRADOR' : '📦 ARCHIVADO'}
                    </span>
                    {pack.featured && (
                      <span className="bg-bear-blue/30 text-bear-blue px-2 py-0.5 rounded text-xs font-bold">
                        ⭐ DESTACADO
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-white mb-1">{pack.name}</h3>
                    <p className="text-sm text-zinc-500">{formatMonth(pack.release_month)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg p-3 border border-white/5 bg-zinc-800/50 text-center">
                      <div className="text-2xl font-black text-bear-blue">{pack.total_videos?.toLocaleString() || 0}</div>
                      <div className="text-xs text-zinc-500">Videos</div>
                    </div>
                    <div className="rounded-lg p-3 border border-white/5 bg-zinc-800/50 text-center">
                      <div className="text-2xl font-black text-white">{pack.total_size_gb || 0} GB</div>
                      <div className="text-xs text-zinc-500">Tamaño</div>
                    </div>
                  </div>

                  <div className="rounded-lg p-4 border border-bear-blue/20 bg-bear-blue/5">
                    <div className="text-2xl font-black text-bear-blue">{salesCount}</div>
                    <div className="text-sm text-zinc-500">Ventas</div>
                    <div className="text-lg font-bold text-white mt-0.5">{formatPrice(revenue, 'MXN')}</div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-zinc-400">Precio:</span>
                    <span className="text-xl font-black text-bear-blue">${pack.price_mxn} MXN</span>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/admin/packs/${pack.id}/edit`} className="flex-1 text-center bg-bear-blue text-bear-black py-2 rounded-lg font-bold hover:bg-bear-blue/90 text-sm transition">
                      ✏️ Editar
                    </Link>
                    <Link href={`/checkout?pack=${pack.slug}`} target="_blank" rel="noopener noreferrer" className="flex-1 text-center bg-zinc-800 text-white py-2 rounded-lg font-bold hover:bg-zinc-700 text-sm transition border border-white/5">
                      👁️ Ver
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
