'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Play, Download, Wifi } from 'lucide-react'
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
}

export function HeroSection({ pack }: HeroSectionProps) {
  const packName = pack?.name || 'Video Remixes Pack 2026'
  const totalVideos = pack?.total_videos ?? 0
  const priceМXN = pack?.price_mxn || 350

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-bear-blue/5 via-background to-bear-black/5 py-20 lg:py-32">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
      
      {/* Logo Bear Beat en background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <img 
          src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png" 
          alt="Bear Beat Background" 
          className="w-1/2 max-w-2xl"
        />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-center lg:text-left animate-fade-in">
          {/* COLUMNA IZQUIERDA (VIDEO/VISUAL) - En Mobile va SEGUNDO (order-2) */}
          <div className="order-2 lg:order-1 flex justify-center lg:justify-start relative group">
            <Link href="/contenido" className="relative w-full max-w-md aspect-video bg-zinc-900 rounded-2xl border-2 border-bear-blue/30 flex items-center justify-center shadow-[0_0_30px_rgba(8,225,247,0.2)] overflow-hidden group-hover:shadow-[0_0_40px_rgba(8,225,247,0.3)] transition-shadow">
              <Play className="w-20 h-20 text-bear-blue animate-pulse ml-1" />
              <span className="absolute bottom-4 text-bear-blue font-mono text-sm">PREVIEW 2026</span>
            </Link>
          </div>

          {/* COLUMNA DERECHA (TEXTO) - En Mobile va PRIMERO (order-1) */}
          <div className="order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bear-blue/10 border-2 border-bear-blue/30">
              <span className="text-2xl">🔥</span>
              <span className="text-sm font-bold text-bear-black">PACK ACTUAL - Enero 2026</span>
            </div>

            <div className="flex justify-center lg:justify-start mb-4">
              <img 
                src="/logos/BBLOGOTIPOPOSITIVO_Mesa de trabajo 1.png" 
                alt="Bear Beat" 
                className="h-20 sm:h-28 lg:h-36 w-auto"
              />
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              <span className="block mb-2">{totalVideos} Video Remixes</span>
              <span className="block bg-gradient-to-r from-bear-blue to-bear-blue/70 bg-clip-text text-transparent">
                Para DJs
              </span>
            </h1>

            <p className="text-xl md:text-2xl lg:text-3xl font-bold max-w-xl">
              Descarga todo por solo
              <span className="block text-4xl md:text-5xl text-bear-blue mt-3">$350 MXN</span>
            </p>

            <p className="text-base md:text-lg text-muted-foreground">
              ✅ Pago único • ✅ Sin mensualidades • ✅ Acceso inmediato
            </p>

            <div className="flex flex-col gap-3 max-w-xl">
              <Link href="/checkout" className="w-full" onClick={() => trackCTAClick('COMPRAR AHORA', 'hero')}>
                <Button 
                  size="xl" 
                  className="btn-pulse w-full bg-bear-blue text-bear-black hover:bg-bear-blue/90 font-extrabold text-lg md:text-2xl py-6 md:py-8 shadow-2xl rounded-2xl"
                >
                  🛒 COMPRAR AHORA - $350 MXN
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">👆 Haz clic aquí para comprar</p>
            </div>

            <div className="flex flex-wrap gap-3 justify-center lg:justify-start pt-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur border-2 border-bear-blue/30">
                <span className="text-green-500">✅</span>
                <span className="text-sm font-bold">Acceso inmediato</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur border-2 border-bear-blue/30">
                <Download className="h-4 w-4 text-bear-blue" />
                <span className="text-sm font-bold">Descarga ilimitada</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur border-2 border-bear-blue/30">
                <Wifi className="h-4 w-4 text-bear-blue" />
                <span className="text-sm font-bold">Acceso FTP</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              🎉 Más de <span className="font-bold text-foreground">500 DJs</span> ya compraron este pack
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
