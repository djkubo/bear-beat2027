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
}

export function PricingSection({ pack }: PricingSectionProps) {
  const packName = pack?.name || 'Video Remixes Pack 2026'
  const slug = pack?.slug || 'pack-enero-2026'
  const totalVideos = pack?.total_videos || 3000
  const totalSize = pack?.total_size_gb || 500
  const priceMXN = pack?.price_mxn || 350
  const priceUSD = pack?.price_usd || 18

  const features = [
    `${totalVideos.toLocaleString()} videos HD/4K`,
    `${totalSize} GB de contenido`,
    'Organizados por 20+ géneros',
    'Descarga por carpetas',
    'Acceso FTP (FileZilla, Air Explorer)',
    'Acceso web (navegador)',
    'Redescargas ilimitadas',
    'Soporte 24/7 por WhatsApp',
  ]

  return (
    <section id="pricing" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-6xl font-extrabold mb-4">
            ¿Cuánto cuesta?
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
              🔥 OFERTA DE LANZAMIENTO
            </span>
          </div>

          <div className="pack-card bg-card p-8 md:p-12 border-2 border-bear-blue/30 shadow-xl">
            {/* Header - MUY CLARO */}
            <div className="text-center mb-8">
              <h3 className="text-3xl font-extrabold mb-6">{packName}</h3>
              
              {/* Price - SÚPER OBVIO */}
              <div className="space-y-4 bg-bear-blue/10 rounded-2xl p-6 border-2 border-bear-blue/50">
                <p className="text-2xl font-bold">PAGAS UNA SOLA VEZ:</p>
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
            <Link href={`/checkout?pack=${slug}`}>
              <Button 
                size="xl" 
                className="w-full mb-4 bg-bear-blue text-bear-black hover:bg-bear-blue/90 font-extrabold text-2xl py-8 shadow-2xl rounded-2xl"
              >
                🛒 SÍ, QUIERO COMPRAR AHORA
              </Button>
            </Link>
            
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
