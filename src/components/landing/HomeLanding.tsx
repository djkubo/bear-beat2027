'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trackCTAClick, trackPageView } from '@/lib/tracking'
import { MobileMenu } from '@/components/ui/MobileMenu'
import { createClient } from '@/lib/supabase/client'
import { useVideoInventory } from '@/lib/hooks/useVideoInventory'
import { StatsSection } from '@/components/landing/stats-section'
import { CompatibleLogos } from '@/components/landing/compatible-logos'
import { Play, CheckCircle2, Download, Wifi } from 'lucide-react'

// ==========================================
// TIPOS
// ==========================================
interface Video {
  id: string
  name: string
  artist: string
  title: string
  key?: string
  bpm?: string
  sizeFormatted: string
  path: string
  genre: string
  thumbnailUrl?: string
  duration?: string
  resolution?: string
}

interface Genre {
  id: string
  name: string
  videoCount: number
  totalSizeFormatted: string
  videos: Video[]
}

interface PackInfo {
  totalVideos: number
  totalSizeFormatted: string
  genreCount: number
  totalPurchases?: number
}

interface UserState {
  isLoggedIn: boolean
  hasAccess: boolean
  userName?: string
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function DemoPlayer({ video, onClose, hasAccess = false, cdnBaseUrl, totalVideos = 0 }: { video: Video; onClose: () => void; hasAccess?: boolean; cdnBaseUrl?: string | null; totalVideos?: number }) {
  const [downloading, setDownloading] = useState(false)
  const [demoError, setDemoError] = useState(false)
  const demoSrc = hasAccess ? `/api/download?file=${encodeURIComponent(video.path)}&stream=true` : `/api/demo-url?path=${encodeURIComponent(video.path)}`
  const moreLabel = totalVideos > 0 ? totalVideos.toLocaleString() : '3,000+'

  const handleDownload = async () => {
    setDownloading(true)
    try {
      window.open(`/api/download?file=${encodeURIComponent(video.path)}`, '_blank')
    } catch (error) {
      console.error('Error downloading:', error)
    }
    setDownloading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        className="relative w-full max-w-4xl bg-zinc-900 rounded-2xl overflow-hidden border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition">✕</button>

        <div className="relative aspect-video bg-black flex items-center justify-center">
          {!hasAccess && (
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center opacity-30">
              <p className="text-white text-6xl font-black rotate-[-15deg]">BEAR BEAT</p>
            </div>
          )}
          <video
            src={demoSrc}
            className="w-full h-full"
            controls
            autoPlay
            playsInline
            controlsList={hasAccess ? undefined : 'nodownload noremoteplayback'}
            disablePictureInPicture={!hasAccess}
            onError={() => !hasAccess && setDemoError(true)}
          />
        </div>

        <div className="p-6 text-center">
          <h3 className="text-xl font-bold text-white">{video.artist} - {video.title}</h3>
          <div className="flex justify-center gap-3 mt-2 text-sm text-zinc-400">
            {video.bpm && <span className="bg-zinc-800 px-2 py-1 rounded">{video.bpm} BPM</span>}
            {video.key && <span className="bg-zinc-800 px-2 py-1 rounded">{video.key}</span>}
          </div>

          <div className="mt-6">
            {hasAccess ? (
              <button onClick={handleDownload} disabled={downloading} className="bg-green-500 hover:bg-green-400 text-black font-bold py-3 px-8 rounded-full transition">
                {downloading ? 'Descargando...' : '⬇️ Descargar Video'}
              </button>
            ) : (
              <Link href="/checkout?pack=enero-2026">
                <button className="bg-bear-blue hover:bg-cyan-400 text-black font-black py-3 px-8 rounded-full transition shadow-[0_0_20px_rgba(8,225,247,0.4)]">
                  DESBLOQUEAR ESTE Y {moreLabel} MÁS
                </button>
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ==========================================
// HOME LANDING PRINCIPAL
// ==========================================
export default function HomeLanding() {
  const router = useRouter()
  const [genres, setGenres] = useState<Genre[]>([])
  const [packInfo, setPackInfo] = useState<PackInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [cdnBaseUrl, setCdnBaseUrl] = useState<string | null>(null)
  const [userState, setUserState] = useState<UserState>({ isLoggedIn: false, hasAccess: false })
  const inventory = useVideoInventory()

  useEffect(() => {
    fetch('/api/cdn-base').then(r => r.json()).then(d => setCdnBaseUrl(d.baseUrl)).catch(() => {})
    trackPageView('home')
    checkUser()
    loadData()
  }, [])

  const checkUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: purchases } = await supabase.from('purchases').select('id').eq('user_id', user.id)
      setUserState({ isLoggedIn: true, hasAccess: !!purchases?.length, userName: user.email?.split('@')[0] })
    }
  }

  const loadData = async () => {
    try {
      // Misma fuente que /contenido: listado real del servidor para que el usuario vea qué está comprando
      const res = await fetch(`/api/videos?pack=enero-2026`, { cache: 'no-store' })
      const data = await res.json()
      if (data.success) {
        setGenres(data.genres || [])
        setPackInfo(data.pack)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Solo datos reales del servidor (API /api/videos). Sin fallback inventado.
  const totalVideos = packInfo?.totalVideos ?? inventory.count ?? 0
  const totalPurchases = packInfo?.totalPurchases ?? inventory.totalPurchases ?? 0
  const priceMXN = 350

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png" alt="Bear Beat" width={32} height={32} />
            <span className="font-black text-xl tracking-tighter text-white">BEAR<span className="text-bear-blue">BEAT</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {!userState.hasAccess && (
              <>
                <Link href="#demo-section" className="text-sm font-medium text-zinc-400 hover:text-white transition">Demos</Link>
                <Link href="#demo-section" className="text-sm font-medium text-zinc-400 hover:text-white transition">Precios</Link>
              </>
            )}
            {userState.isLoggedIn ? (
              <Link href="/dashboard" className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-sm font-bold transition">Mi Panel</Link>
            ) : (
              <Link href="/login" className="text-sm font-bold text-white hover:text-bear-blue transition">Login</Link>
            )}
            {!userState.hasAccess && (
              <Link href="/checkout?pack=enero-2026">
                <button className="bg-bear-blue hover:bg-cyan-400 text-black px-5 py-2 rounded-full text-sm font-black transition shadow-[0_0_15px_rgba(8,225,247,0.3)]">
                  ACCESO TOTAL $350
                </button>
              </Link>
            )}
          </nav>
          <div className="md:hidden">
            <MobileMenu currentPath="/" userHasAccess={userState.hasAccess} isLoggedIn={userState.isLoggedIn} />
          </div>
        </div>
      </header>

      {/* ==========================================
          VISTA: USUARIO CON ACCESO (DASHBOARD LITE)
          ========================================== */}
      {userState.hasAccess ? (
        <section className="py-20 px-4 text-center">
          <h1 className="text-4xl font-black mb-4">¡Bienvenido a la Élite, {userState.userName}! 💎</h1>
          <p className="text-zinc-400 mb-8">Tu arsenal está listo. ¿Cómo quieres descargar hoy?</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/contenido">
              <button className="bg-bear-blue text-black font-bold py-4 px-8 rounded-xl text-lg hover:scale-105 transition w-full sm:w-auto">
                🚀 Ir al Contenido Web
              </button>
            </Link>
            <Link href="/dashboard">
              <button className="bg-zinc-800 border border-zinc-700 text-white font-bold py-4 px-8 rounded-xl text-lg hover:bg-zinc-700 transition w-full sm:w-auto">
                📊 Ver mi Dashboard
              </button>
            </Link>
          </div>
        </section>
      ) : (
        // ==========================================
        // VISTA: LANDING PAGE DE VENTAS (GUEST)
        // ==========================================
        <>
          {/* HERO SECTION NEUROVENTAS */}
          <section className="relative pt-12 pb-20 lg:pt-24 lg:pb-32 px-4 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-bear-blue/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">

              {/* VIDEO (IZQUIERDA EN DESKTOP) */}
              <div className="order-last lg:order-first relative">
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video group cursor-pointer" onClick={() => document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })}>
                  <div className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:scale-105 transition duration-700" style={{ backgroundImage: "url('/thumbnails-cache/Reggaeton_Bad Bunny - Monaco.jpg')" }} />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-20 h-20 bg-bear-blue rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(8,225,247,0.6)] animate-pulse">
                      <Play className="w-8 h-8 text-black fill-black ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur px-3 py-1 rounded-full text-xs font-mono text-bear-blue border border-bear-blue/30">
                    PREVIEW 2026 • HD 1080P
                  </div>
                </div>
                {/* Logos oficiales: añade en /public/logos/ serato.png, rekordbox.png, virtualdj.png (o .svg) */}
                <div className="mt-6 flex flex-col items-center lg:items-start gap-3">
                  <span className="text-xs font-bold tracking-widest text-zinc-500">COMPATIBLE CON</span>
                  <CompatibleLogos variant="hero" logoHeight={36} subtle />
                </div>
              </div>

              {/* TEXTO DE VENTA (DERECHA EN DESKTOP) */}
              <div className="text-center lg:text-left space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/50 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Oferta Limitada Enero 2026
                </div>

                <h1 className="text-5xl lg:text-7xl font-black text-white leading-[0.9] tracking-tight">
                  TU SET <span className="text-bear-blue">PERFECTO</span><br />
                  EN 5 MINUTOS.
                </h1>

                <p className="text-xl text-zinc-400 max-w-lg mx-auto lg:mx-0">
                  Deja de perder horas editando. Descarga{' '}
                  <strong className="text-white">
                    +{totalVideos > 0 ? totalVideos.toLocaleString() : loading ? '…' : 'miles de'} Video Remixes
                  </strong>{' '}
                  organizados por Key & BPM. Listos para reventar la pista.
                </p>

                {/* PRECIO ANCLADO */}
                <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-4 lg:gap-8 py-4">
                  <div>
                    <p className="text-zinc-500 text-sm font-bold line-through decoration-red-500/50">$1,500 MXN</p>
                    <p className="text-xs text-zinc-600">Precio Regular</p>
                  </div>
                  <div className="text-center lg:text-left">
                    <div className="text-5xl font-black text-white flex items-start gap-1">
                      <span className="text-2xl mt-1 text-bear-blue">$</span>{priceMXN}
                    </div>
                    <p className="text-bear-blue font-bold text-sm tracking-widest">PAGO ÚNICO</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 max-w-md mx-auto lg:mx-0">
                  <Link href="/checkout?pack=enero-2026" onClick={() => trackCTAClick('HERO', 'landing')}>
                    <button className="w-full bg-bear-blue hover:bg-cyan-400 text-black text-xl font-black py-5 rounded-xl shadow-[0_0_30px_rgba(8,225,247,0.4)] hover:shadow-[0_0_50px_rgba(8,225,247,0.6)] transition transform hover:-translate-y-1">
                      ⚡ DESCARGAR TODO AHORA
                    </button>
                  </Link>
                  <p className="text-xs text-zinc-500 flex justify-center lg:justify-start gap-4">
                    <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> Acceso Inmediato</span>
                    <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> Garantía 30 Días</span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* PRUEBA SOCIAL: datos reales (compras y catálogo) */}
          <StatsSection totalPurchases={totalPurchases} totalVideos={totalVideos > 0 ? totalVideos : undefined} />

          {/* BENEFICIOS / CARACTERÍSTICAS */}
          <section className="py-16 bg-zinc-900/30 border-y border-white/5">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-black border border-white/10 hover:border-bear-blue/30 transition">
                <div className="w-12 h-12 bg-bear-blue/10 rounded-lg flex items-center justify-center mb-4 text-bear-blue"><Play /></div>
                <h3 className="text-xl font-bold text-white mb-2">Calidad HD Nativa</h3>
                <p className="text-zinc-400 text-sm">Sin pixelación en pantallas LED gigantes. 1080p real a 320kbps de audio.</p>
              </div>
              <div className="p-6 rounded-2xl bg-black border border-white/10 hover:border-bear-blue/30 transition">
                <div className="w-12 h-12 bg-bear-blue/10 rounded-lg flex items-center justify-center mb-4 text-bear-blue"><Wifi /></div>
                <h3 className="text-xl font-bold text-white mb-2">Key & BPM Incluido</h3>
                <p className="text-zinc-400 text-sm">Olvídate de analizar. Arrastra y mezcla armónicamente al instante.</p>
              </div>
              <div className="p-6 rounded-2xl bg-black border border-white/10 hover:border-bear-blue/30 transition">
                <div className="w-12 h-12 bg-bear-blue/10 rounded-lg flex items-center justify-center mb-4 text-bear-blue"><Download /></div>
                <h3 className="text-xl font-bold text-white mb-2">Servidores FTP Flash</h3>
                <p className="text-zinc-400 text-sm">Descarga 100GB mientras te tomas un café. Velocidad ilimitada.</p>
              </div>
            </div>
          </section>

          {/* DEMOS SECTION – Mismos videos que en /contenido (datos reales del servidor) */}
          <section id="demo-section" className="py-20 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-3xl font-black text-white">Prueba la Calidad</h2>
                  <p className="text-zinc-400">Los mismos videos del Pack Enero 2026. Escucha antes de comprar. 100% transparencia.</p>
                </div>
              </div>

              {loading && genres.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="aspect-video bg-zinc-800/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {genres
                      .filter((g) => g.id !== 'preview')
                      .flatMap((g) => (g.videos || []).slice(0, 2))
                      .slice(0, 30)
                      .map((video, i) => (
                        <div key={video.id || i} onClick={() => setSelectedVideo(video)} className="group cursor-pointer">
                          <div className="aspect-video bg-zinc-800 rounded-lg overflow-hidden relative">
                            {video.thumbnailUrl ? (
                              <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition" />
                            ) : (
                              <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                <Play size={24} className="text-zinc-600" />
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-10 h-10 bg-bear-blue/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition"><Play size={16} className="text-black ml-1" /></div>
                            </div>
                          </div>
                          <p className="mt-2 text-xs font-bold truncate text-white group-hover:text-bear-blue transition">{video.artist} - {video.title}</p>
                          <p className="text-[10px] text-zinc-500">{video.genre} • {video.bpm || '—'} BPM</p>
                        </div>
                      ))}
                  </div>
                  {genres.filter((g) => g.id !== 'preview').length > 0 ? (
                    <p className="mt-6 text-center text-sm text-zinc-500">
                      Muestra por género. Al comprar tendrás acceso a todo el catálogo en <Link href="/contenido" className="text-bear-blue hover:underline">Contenido</Link>.
                    </p>
                  ) : !loading && genres.length === 0 ? (
                    <p className="mt-6 text-center text-sm text-zinc-500">El catálogo se está actualizando. Vuelve pronto o revisa <Link href="/contenido" className="text-bear-blue hover:underline">Contenido</Link>.</p>
                  ) : null}
                </>
              )}
            </div>
          </section>

          {/* FINAL CTA */}
          <section className="py-24 px-4 text-center bg-gradient-to-b from-transparent to-bear-blue/10">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6">¿LISTO PARA ROMPERLA?</h2>
            <p className="text-xl text-zinc-300 mb-8 max-w-2xl mx-auto">Únete a la élite de DJs que ya no pierden tiempo buscando música.</p>
            <Link href="/checkout?pack=enero-2026">
              <button className="bg-bear-blue hover:bg-cyan-400 text-black text-2xl font-black py-6 px-12 rounded-2xl shadow-[0_0_50px_rgba(8,225,247,0.5)] hover:scale-105 transition">
                QUIERO MI ACCESO AHORA
              </button>
            </Link>
            <p className="mt-6 text-sm text-zinc-500">Garantía de devolución de dinero de 30 días.</p>
          </section>
        </>
      )}

      {/* VIDEO MODAL */}
      <AnimatePresence>
        {selectedVideo && (
          <DemoPlayer
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
            hasAccess={userState.hasAccess}
            cdnBaseUrl={cdnBaseUrl}
            totalVideos={totalVideos}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
