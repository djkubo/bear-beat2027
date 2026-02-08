import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

interface PricingSectionProps {
  pack: {
    name: string
    slug: string
    total_videos: number
    total_size_gb: number
    price_mxn: number
    price_usd: number
  } | null
  /** Datos en tiempo real del catálogo (prioridad sobre pack). */
  totalVideos?: number
  totalSizeFormatted?: string
  genreCount?: number
}

export function PricingSection({ pack, totalVideos: totalVideosProp, totalSizeFormatted, genreCount: genreCountProp }: PricingSectionProps) {
  const packName = pack?.name || 'Pack Enero 2026'
  const slug = pack?.slug || 'enero-2026'
  const totalVideos = totalVideosProp ?? pack?.total_videos ?? 0
  const sizeLabel = totalSizeFormatted ?? (pack?.total_size_gb ? `${pack.total_size_gb} GB` : null)
  const genreLabel = genreCountProp != null && genreCountProp > 0 ? `Organizados por ${genreCountProp} géneros` : 'Organizados por género'
  const priceMXN = pack?.price_mxn ?? 350
  const priceUSD = pack?.price_usd ?? 19

  const features = [
    totalVideos > 0 ? `${totalVideos.toLocaleString()} videos HD` : 'Videos HD',
    sizeLabel ? `${sizeLabel} de contenido` : 'Contenido listo para descargar',
    genreLabel,
    'Descarga por carpetas',
    'Acceso FTP (FileZilla, Air Explorer)',
    'Acceso web (navegador)',
    'Redescargas ilimitadas',
    'Te respondemos en minutos vía Chat',
  ]

  return (
    <section id="pricing" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-6xl font-extrabold mb-4">
            ¿Cuánto vale tu reputación?
          </h2>
          <p className="text-3xl font-bold text-bear-blue mb-2">
            ${priceMXN} pesos mexicanos
          </p>
          <p className="text-xl text-muted-foreground">
            ✅ Una sola vez • ❌ Sin mensualidades • ❌ Sin sorpresas
          </p>
        </div>

        <div className="relative">
          {/* Badge */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bear-blue text-bear-black text-sm font-bold shadow-lg">
              🔥 El 93% de las licencias de Enero ya se vendieron. Quedan pocas.
            </span>
          </div>

          <div className="pack-card bg-card p-8 md:p-12 border-2 border-bear-blue/30 shadow-xl">
            {/* Header - MUY CLARO */}
            <div className="text-center mb-8">
              <h3 className="text-3xl font-extrabold mb-6">{packName}</h3>
              
              {/* Price - SÚPER OBVIO */}
              <div className="space-y-4 bg-bear-blue/10 rounded-2xl p-6 border-2 border-bear-blue/50">
                <p className="text-2xl font-bold">Valor Real del Material</p>
                <p className="text-2xl line-through font-bold text-muted-foreground">$12,680 MXN</p>
                <p className="text-xl font-bold text-bear-blue">Tu Inversión Ridícula</p>
                <div className="flex items-baseline justify-center gap-3">
                  <span className="text-7xl font-extrabold text-bear-blue">${priceMXN}</span>
                  <span className="text-3xl font-bold">MXN</span>
                </div>
                <div className="text-xl font-bold text-muted-foreground">
                  (≈ ${priceUSD} dólares)
                </div>
                <p className="text-lg font-bold border-t-2 border-bear-blue/30 pt-4">
                  ✅ NO pagas cada mes<br/>
                  ✅ Es tuyo para siempre
                </p>
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA - GIGANTE Y OBVIO */}
            <Button
              asChild
              size="xl"
              className="w-full mb-4 bg-bear-blue text-bear-black hover:bg-bear-blue/90 font-extrabold text-2xl py-8 shadow-2xl rounded-2xl"
            >
              <Link href={`/checkout?pack=${slug}`}>💎 UNIRME A LA ÉLITE AHORA</Link>
            </Button>
            
            <p className="text-center text-sm font-bold text-bear-blue mb-6">
              👆 Haz clic aquí para ir a pagar 👆
            </p>

            {/* Payment methods */}
            <div className="text-center space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Métodos de pago aceptados:
              </p>
              <div className="flex justify-center items-center gap-4 flex-wrap">
                <span className="text-2xl">💳</span>
                <span className="text-2xl">🅿️</span>
                <span className="text-2xl">🏪</span>
                <span className="text-2xl">🏦</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tarjeta • PayPal • OXXO • SPEI
              </p>
            </div>

            {/* Guarantee */}
            <div className="mt-8 pt-8 border-t text-center space-y-2">
              <p className="text-sm font-medium">
                🔒 Pago 100% seguro
              </p>
              <p className="text-sm text-muted-foreground">
                ↩️ Garantía de devolución 7 días
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
