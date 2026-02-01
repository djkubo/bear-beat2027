import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { formatDate, formatPrice, formatMonth } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminPacksPage() {
  const supabase = createServerClient()
  
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
    <div className="min-h-screen bg-gradient-to-br from-bear-blue/5 via-background to-bear-black/5">
      {/* Header */}
      <div className="bg-card border-b-2 border-bear-blue/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/admin" className="text-sm text-bear-blue hover:underline mb-2 block">
                ← Volver al Dashboard
              </Link>
              <h1 className="text-3xl font-extrabold">📦 Gestión de Packs</h1>
              <p className="text-muted-foreground">
                Total: {packs?.length || 0} packs
              </p>
            </div>
            <button className="bg-bear-blue text-bear-black px-6 py-3 rounded-xl font-bold hover:bg-bear-blue/90">
              ➕ Crear Nuevo Pack
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {!packs || packs.length === 0 ? (
          <div className="bg-card rounded-2xl p-12 border-2 border-bear-blue/30 text-center">
            <p className="text-2xl font-bold text-muted-foreground mb-4">
              No hay packs creados
            </p>
            <button className="bg-bear-blue text-bear-black px-8 py-4 rounded-xl font-bold hover:bg-bear-blue/90">
              ➕ Crear Primer Pack
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packs.map((pack: any) => {
              const salesCount = pack.purchases?.[0]?.count || 0
              const revenue = salesCount * Number(pack.price_mxn)
              
              return (
                <div
                  key={pack.id}
                  className="bg-card rounded-2xl overflow-hidden border-2 border-bear-blue/30 shadow-xl hover:shadow-2xl transition-all"
                >
                  {/* Header con estado */}
                  <div className={`p-4 ${
                    pack.status === 'available' ? 'bg-green-500' :
                    pack.status === 'upcoming' ? 'bg-orange-500' :
                    pack.status === 'draft' ? 'bg-gray-500' :
                    'bg-red-500'
                  }`}>
                    <div className="flex justify-between items-center text-white">
                      <span className="font-bold">
                        {pack.status === 'available' ? '✅ DISPONIBLE' :
                         pack.status === 'upcoming' ? '📅 PRÓXIMAMENTE' :
                         pack.status === 'draft' ? '📝 BORRADOR' :
                         '📦 ARCHIVADO'}
                      </span>
                      {pack.featured && (
                        <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-bold">
                          ⭐ DESTACADO
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Info del pack */}
                    <div>
                      <h3 className="text-xl font-extrabold mb-1">{pack.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatMonth(pack.release_month)}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-bear-blue/10 rounded-lg p-3 text-center">
                        <div className="text-2xl font-extrabold text-bear-blue">
                          {pack.total_videos?.toLocaleString() || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Videos</div>
                      </div>
                      
                      <div className="bg-purple-100 rounded-lg p-3 text-center">
                        <div className="text-2xl font-extrabold text-purple-600">
                          {pack.total_size_gb || 0} GB
                        </div>
                        <div className="text-xs text-muted-foreground">Tamaño</div>
                      </div>
                    </div>

                    {/* Ventas */}
                    <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                      <div className="text-3xl font-extrabold text-green-600">
                        {salesCount}
                      </div>
                      <div className="text-sm text-muted-foreground">Ventas</div>
                      <div className="text-xl font-bold text-green-700 mt-1">
                        {formatPrice(revenue, 'MXN')}
                      </div>
                    </div>

                    {/* Precio */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">Precio:</span>
                      <span className="text-2xl font-extrabold text-bear-blue">
                        ${pack.price_mxn} MXN
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2">
                      <button className="flex-1 bg-bear-blue text-bear-black py-2 rounded-lg font-bold hover:bg-bear-blue/90 text-sm">
                        ✏️ Editar
                      </button>
                      <button className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-300 text-sm">
                        👁️ Ver
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
