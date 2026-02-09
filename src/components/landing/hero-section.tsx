'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Play, CheckCircle2 } from 'lucide-react'
import { trackCTAClick } from '@/lib/tracking'

interface HeroSectionProps {
  pack: {
    name: string
    slug: string
    total_videos: number
    total_size_gb: number
    price_mxn: number
    cover_image_url?: string
  } | null
  /** Datos en tiempo real del catálogo (cuando no hay pack o para sobreescribir). */
  totalVideos?: number
  totalSizeFormatted?: string
}

export function HeroSection({ pack, totalVideos: totalVideosProp }: HeroSectionProps) {
  const totalVideos = totalVideosProp ?? pack?.total_videos ?? 0
  const priceMXN = pack?.price_mxn ?? 350
  const videoLabel = totalVideos > 0 ? totalVideos.toLocaleString() : 'miles de'

  return (
    <section className="relative overflow-hidden bg-[#050505] py-16 lg:py-24">
      {/* Fondo Premium */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-bear-blue/20 via-[#050505] to-[#050505]" />
      <div className="absolute inset-0 bg-grid-white/[0.02]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* COLUMNA 1: Visual (VIDEO A LA IZQUIERDA EN DESKTOP) */}
          {/* En móvil usamos order-last para que quede abajo del texto, en desktop order-first */}
          <div className="order-last lg:order-first relative group">
            <div className="relative rounded-3xl overflow-hidden border border-bear-blue/30 shadow-[0_0_50px_-12px_rgba(8,225,247,0.3)] bg-zinc-900 aspect-video flex items-center justify-center">
               {/* Efecto de 'Play' Gigante */}
               <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all">
                 <Link href="/contenido" className="transform group-hover:scale-110 transition-all duration-300">
                   <div className="w-24 h-24 rounded-full bg-bear-blue flex items-center justify-center shadow-lg shadow-bear-blue/50 animate-pulse">
                     <Play className="w-10 h-10 text-black fill-black ml-1" />
                   </div>
                 </Link>
               </div>
               {/* Texto flotante sobre el video */}
               <div className="absolute bottom-4 left-0 right-0 text-center">
                 <span className="text-white/80 text-sm font-mono bg-black/60 px-3 py-1 rounded-full backdrop-blur-md">
                   🎬 MIRA LA CALIDAD HD
                 </span>
               </div>
            </div>
            {/* Elemento decorativo detrás */}
            <div className="absolute -z-10 top-10 -left-10 w-full h-full bg-bear-blue/5 rounded-3xl blur-3xl" />
          </div>

          {/* COLUMNA 2: Venta (TEXTO A LA DERECHA) */}
          <div className="space-y-8 text-center lg:text-left">
            
            {/* Badge de Urgencia */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/50 animate-in slide-in-from-bottom-4 fade-in duration-700">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              <span className="text-sm font-bold text-orange-400 tracking-wide uppercase">
                ⚠️ ACCESO RESTRINGIDO • SOLO 50 CUPOS HOY
              </span>
            </div>

            {/* Titular Agresivo */}
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tight leading-[0.9]">
                TU COMPETENCIA TE VA A <span className="text-transparent bg-clip-text bg-gradient-to-r from-bear-blue to-cyan-400">ENVIDIAR</span>.
              </h1>
              <p className="text-xl text-zinc-400 max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed">
                Deja de ser un DJ del montón que pierde horas en YouTube. Obtén la <strong className="text-white">Ventaja Injusta</strong>: {videoLabel} Video Remixes de Élite. Arrastra, suelta y revienta la pista mientras ellos siguen buscando qué poner.
              </p>
            </div>

            {/* Oferta Irresistible (Precio Anclado) */}
            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm inline-block">
              <div className="flex flex-col lg:flex-row items-center gap-6">
                <div className="text-center lg:text-left">
                  <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider mb-1">Valor Real del Material</p>
                  <p className="text-2xl text-zinc-600 line-through font-bold decoration-red-500/50">$12,680 MXN</p>
                </div>
                <div className="hidden lg:block w-px h-12 bg-white/10" />
                <div className="text-center lg:text-left">
                  <p className="text-bear-blue text-sm font-bold uppercase tracking-wider mb-1">Tu Inversión Ridícula</p>
                  <p className="text-5xl font-black text-white tracking-tighter shadow-bear-blue/20 drop-shadow-lg">
                    ${priceMXN} <span className="text-2xl text-zinc-400 font-medium">MXN</span>
                  </p>
                </div>
              </div>
            </div>

            {/* CTA + Garantía */}
            <div className="space-y-4 max-w-lg mx-auto lg:mx-0">
              <Button
                asChild
                className="w-full h-16 text-xl lg:text-2xl font-black bg-bear-blue hover:brightness-110 text-bear-black rounded-xl shadow-[0_0_40px_-10px_rgba(8,225,247,0.6)] hover:shadow-[0_0_60px_-10px_rgba(8,225,247,0.8)] transition-all transform hover:-translate-y-1"
              >
                <Link href="/checkout" onClick={() => trackCTAClick('HERO_CTA', 'hero')}>
                  ⚡ OBTENER MI VENTAJA INJUSTA - ${priceMXN}
                </Link>
              </Button>
              <div className="flex items-center justify-center lg:justify-start gap-4 text-xs text-zinc-500 font-medium">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> 🔒 Si no te hace ganar más dinero, te devolvemos todo.</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
