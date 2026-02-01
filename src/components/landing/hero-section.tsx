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
  const totalVideos = pack?.total_videos || 3000
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
        <div className="text-center space-y-8 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bear-blue/10 border-2 border-bear-blue/30">
            <span className="text-2xl">🔥</span>
            <span className="text-sm font-bold text-bear-black">PACK ACTUAL - Enero 2026</span>
          </div>

          {/* Logo grande */}
          <div className="flex justify-center mb-6">
            <img 
              src="/logos/BBLOGOTIPOPOSITIVO_Mesa de trabajo 1.png" 
              alt="Bear Beat" 
              className="h-24 sm:h-32 lg:h-40 w-auto"
            />
          </div>

          {/* Main Heading - ULTRA CLARO */}
          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-extrabold tracking-tight leading-tight">
            <span className="block mb-2">3,000 Videos</span>
            <span className="block bg-gradient-to-r from-bear-blue to-bear-blue/70 bg-clip-text text-transparent">
              Para DJs
            </span>
          </h1>

          {/* Subtitle - MUY SIMPLE */}
          <p className="text-2xl sm:text-3xl font-bold max-w-3xl mx-auto">
            Descarga todo por solo
            <span className="block text-5xl text-bear-blue mt-3">$350 MXN</span>
          </p>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            ✅ Pago único • ✅ Sin mensualidades • ✅ Acceso inmediato
          </p>

          {/* CTA Buttons - MUY OBVIO */}
          <div className="flex flex-col gap-4 justify-center items-center max-w-2xl mx-auto">
            <Link href="/checkout" className="w-full" onClick={() => trackCTAClick('COMPRAR AHORA', 'hero')}>
              <Button 
                size="xl" 
                className="btn-pulse w-full bg-bear-blue text-bear-black hover:bg-bear-blue/90 font-extrabold text-2xl py-8 shadow-2xl rounded-2xl"
              >
                🛒 COMPRAR AHORA - $350 MXN
              </Button>
            </Link>
            
            <p className="text-sm text-muted-foreground">
              👆 Haz clic aquí para comprar
            </p>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full border-2 border-bear-blue text-bear-black hover:bg-bear-blue/10 font-bold"
            >
              <Play className="h-5 w-5 mr-2" />
              👁️ Ver Videos de Ejemplo Gratis
            </Button>
          </div>

          {/* Features Pills */}
          <div className="flex flex-wrap gap-4 justify-center pt-8">
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

          {/* Social Proof */}
          <p className="text-sm text-muted-foreground">
            🎉 Más de <span className="font-bold text-foreground">500 DJs</span> ya compraron este pack
          </p>
        </div>
      </div>
    </section>
  )
}
