import { CompatibleLogos } from '@/components/landing/compatible-logos'

interface StatsSectionProps {
  /** Número real de compras (DJs que ya compraron). Solo se muestra si es > 0. */
  totalPurchases?: number
  /** Número real de videos en el catálogo. Opcional para la línea de apoyo. */
  totalVideos?: number
}

export function StatsSection({ totalPurchases, totalVideos }: StatsSectionProps = {}) {
  const hasRealPurchases = totalPurchases != null && totalPurchases > 0
  return (
    <section className="py-10 border-y border-white/5 bg-black/50">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-sm font-mono text-zinc-500 mb-6 uppercase tracking-widest">
          COMPATIBLE CON EL ESTÁNDAR DE LA INDUSTRIA
        </p>

        <CompatibleLogos variant="all" logoHeight={44} />

        <div className="mt-10 p-6 bg-zinc-900/50 rounded-2xl border border-white/5 inline-flex items-center gap-4">
          <div className="flex -space-x-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center text-xs">🎧</div>
            ))}
          </div>
          <div className="text-left">
            <p className="text-white font-bold">
              {hasRealPurchases ? `Únete a +${totalPurchases.toLocaleString()} DJs de Élite` : 'Únete a la comunidad de DJs de élite'}
            </p>
            <p className="text-xs text-zinc-400">
              {totalVideos != null && totalVideos > 0
                ? `Más de ${totalVideos.toLocaleString()} video remixes listos para descargar.`
                : 'Que ya están usando Bear Beat en sus eventos.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
