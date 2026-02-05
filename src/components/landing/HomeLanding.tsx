'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { trackCTAClick, trackPageView } from '@/lib/tracking'
import { downloadFile } from '@/lib/download'
import { registerServiceWorker, requestNotificationPermission, subscribeToPush, isPushSupported } from '@/lib/push-notifications'
import { MobileMenu } from '@/components/ui/MobileMenu'
import { createClient } from '@/lib/supabase/client'
import { useVideoInventory } from '@/lib/hooks/useVideoInventory'
import { StatsSection } from '@/components/landing/stats-section'
import { Play, CheckCircle2, Check, Download, Wifi, Folder, Music2, Search, ChevronRight, Lock } from 'lucide-react'

// ==========================================
// TIPOS (alineados con /contenido)
// ==========================================
interface Video {
  id: string
  name: string
  displayName?: string
  artist: string
  title: string
  key?: string
  bpm?: string
  sizeFormatted?: string
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

function DemoPlayer({ video, onClose, hasAccess = false, cdnBaseUrl, totalVideos = 0, packSlug = 'enero-2026' }: { video: Video; onClose: () => void; hasAccess?: boolean; cdnBaseUrl?: string | null; totalVideos?: number; packSlug?: string }) {
  const [downloading, setDownloading] = useState(false)
  const [demoError, setDemoError] = useState(false)
  const demoSrc = hasAccess ? `/api/download?file=${encodeURIComponent(video.path)}&stream=true` : `/api/demo-url?path=${encodeURIComponent(video.path)}`
  const moreLabel = totalVideos > 0 ? totalVideos.toLocaleString() : 'todos'

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadFile(video.path)
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
              <Link href={`/checkout?pack=${packSlug}`}>
                <button className="bg-bear-blue hover:bg-cyan-400 text-black font-black py-3 px-8 rounded-full transition shadow-[0_0_20px_rgba(8,225,247,0.4)]">
                  DESBLOQUEAR MI ARSENAL
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
  const [genres, setGenres] = useState<Genre[]>([])
  const [packInfo, setPackInfo] = useState<PackInfo | null>(null)
  const [featuredPack, setFeaturedPack] = useState<{ slug: string; name: string; price_mxn: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGenre, setExpandedGenre] = useState<string | null>(null)
  const [userState, setUserState] = useState<UserState>({ isLoggedIn: false, hasAccess: false })
  const [showPushModal, setShowPushModal] = useState(false)
  const [pushSubscribing, setPushSubscribing] = useState(false)
  const [demoError, setDemoError] = useState(false)
  const [cdnBaseUrl, setCdnBaseUrl] = useState<string | null>(null)
  const [thumbErrors, setThumbErrors] = useState<Set<string>>(new Set())
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(null)
  const expandedSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDemoError(false)
  }, [selectedVideo?.id])

  const handleDownloadFromList = async (video: Video) => {
    setDownloadingVideoId(video.id)
    try {
      await downloadFile(video.path)
    } catch (e) {
      console.error('Error downloading:', e)
    }
    setDownloadingVideoId(null)
  }

  const getThumbnailUrl = (video: Video): string => {
    // Si tiene URL completa (ej. Bunny), úsala
    if (video.thumbnailUrl && video.thumbnailUrl.startsWith('http')) {
      return video.thumbnailUrl
    }
    // Si no, construye la ruta relativa (IMPORTANTE: empieza con /)
    if (video.path) {
      return `/api/thumbnail-cdn?path=${encodeURIComponent(video.path)}`
    }
    // Fallback solo si no hay path
    return '/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png'
  }
  const videoRef = useRef<HTMLVideoElement>(null)
  const inventory = useVideoInventory()
  const totalSizeFormatted = packInfo?.totalSizeFormatted ?? inventory.totalSizeFormatted ?? '0 B'
  const genreCount = packInfo?.genreCount ?? inventory.genreCount ?? 0
  const packSlug = featuredPack?.slug ?? 'enero-2026'
  const packName = featuredPack?.name ?? 'Pack Enero 2026'
  const priceMXNFromPack = featuredPack?.price_mxn ?? 350

  useEffect(() => {
    fetch('/api/cdn-base').then(r => r.json()).then(d => setCdnBaseUrl(d.baseUrl)).catch(() => {})
    fetch('/api/packs?featured=true').then(r => r.json()).then(d => {
      if (d.pack) setFeaturedPack({ slug: d.pack.slug, name: d.pack.name, price_mxn: Number(d.pack.price_mxn) || 350 })
    }).catch(() => {})
    trackPageView('home')
    checkUser()
    loadStats() // Totales al instante (statsOnly) para que se vea bien tras sync
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

  // Primero cargar solo totales (rápido) para que hero/stats muestren el número correcto tras el sync
  const loadStats = async () => {
    const slug = featuredPack?.slug ?? 'enero-2026'
    try {
      const res = await fetch(`/api/videos?pack=${encodeURIComponent(slug)}&statsOnly=1`, { cache: 'no-store' })
      const data = await res.json()
      if (data.success && data.pack) setPackInfo((prev) => ({ ...prev, ...data.pack }))
    } catch (e) {
      console.error(e)
    }
  }

  const loadData = async () => {
    try {
      const slug = featuredPack?.slug ?? 'enero-2026'
      setLoading(true)
      const res = await fetch(`/api/videos?pack=${encodeURIComponent(slug)}`, { cache: 'no-store' })
      const data = await res.json()
      if (data.success) {
        setGenres(data.genres || [])
        if (data.pack) setPackInfo(data.pack)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [featuredPack?.slug])

  useEffect(() => {
    if (!featuredPack) return
    loadData()
  }, [featuredPack?.slug])

  const totalVideos = packInfo?.totalVideos ?? inventory.count ?? 0
  const totalPurchases = packInfo?.totalPurchases ?? inventory.totalPurchases ?? 0
  const priceMXN = priceMXNFromPack

  // Mismo filtro que /contenido: artista, título, displayName, género, key, BPM
  const query = searchQuery.toLowerCase().trim()
  const filteredGenres = genres
    .filter((g) => g.id !== 'preview')
    .map((g) => ({
      ...g,
      videos: (g.videos || []).filter(
        (v) =>
          !query ||
          (v.artist || '').toLowerCase().includes(query) ||
          (v.title || '').toLowerCase().includes(query) ||
          (v.displayName || '').toLowerCase().includes(query) ||
          (v.genre || '').toLowerCase().includes(query) ||
          (v.key && v.key.toLowerCase().includes(query)) ||
          (v.bpm && String(v.bpm).includes(query))
      ),
    }))
    .filter((g) => g.videos.length > 0 || !query)

  useEffect(() => {
    if (expandedGenre && expandedSectionRef.current) {
      const t = setTimeout(() => expandedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
      return () => clearTimeout(t)
    }
  }, [expandedGenre])

  // Modo Bestia: pedir notificaciones push a usuarios sin acceso (una vez por sesión)
  useEffect(() => {
    if (loading || userState.hasAccess || !isPushSupported()) return
    const key = 'bb_push_prompt_shown'
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) return
    const t = setTimeout(() => setShowPushModal(true), 2500)
    return () => clearTimeout(t)
  }, [loading, userState.hasAccess])

  const handleAcceptPush = async () => {
    setPushSubscribing(true)
    try {
      await registerServiceWorker()
      const permission = await requestNotificationPermission()
      if (permission === 'granted') {
        await subscribeToPush()
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('bb_push_prompt_shown', '1')
        setShowPushModal(false)
      } else {
        setShowPushModal(false)
      }
    } catch (_) {
      setShowPushModal(false)
    }
    setPushSubscribing(false)
  }

  return (
    <div className={`min-h-screen bg-[#050505] text-white overflow-x-hidden ${!userState.hasAccess ? 'pb-24 md:pb-0' : ''}`}>

      {/* Modal push: Activa alertas para Packs Gratis y Descuentos Flash (solo si !hasAccess) */}
      <AnimatePresence>
        {showPushModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowPushModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border-2 border-bear-blue/50 rounded-2xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(8,225,247,0.2)]"
            >
              <p className="text-2xl mb-2">📣</p>
              <h3 className="text-xl font-black text-white mb-2">Activa alertas para recibir Packs Gratis y Descuentos Flash</h3>
              <p className="text-zinc-400 text-sm mb-6">Te avisamos cuando haya ofertas exclusivas y contenido nuevo. Sin spam.</p>
              <div className="flex gap-3">
                <button
                  onClick={handleAcceptPush}
                  disabled={pushSubscribing}
                  className="flex-1 bg-bear-blue text-bear-black font-black py-3 rounded-xl hover:brightness-110 transition disabled:opacity-60"
                >
                  {pushSubscribing ? 'Activando…' : 'Activar alertas'}
                </button>
                <button
                  onClick={() => { setShowPushModal(false); if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('bb_push_prompt_shown', '1') }}
                  className="px-4 py-3 text-zinc-400 hover:text-white text-sm font-medium"
                >
                  Ahora no
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png" alt="Bear Beat" width={32} height={32} />
            <span className="font-black text-xl tracking-tighter text-white">BEAR<span className="text-bear-blue">BEAT</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {!userState.hasAccess && (
              <Link href="#catalogo" className="text-sm font-medium text-zinc-400 hover:text-bear-blue transition">
                Ver catálogo
              </Link>
            )}
            {userState.isLoggedIn ? (
              <Link href="/dashboard" className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-sm font-bold transition">Mi Panel</Link>
            ) : (
              <Link href="/login" className="text-sm font-bold text-white hover:text-bear-blue transition">Login</Link>
            )}
            {!userState.hasAccess && (
              <Link href={`/checkout?pack=${packSlug}`}>
                <button className="bg-bear-blue hover:bg-cyan-400 text-black px-5 py-2 rounded-full text-sm font-black transition shadow-[0_0_15px_rgba(8,225,247,0.3)]">
                  ACCESO TOTAL ${priceMXN}
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

              {/* VIDEO (IZQUIERDA EN DESKTOP) - Portada dinámica del primer video disponible */}
              <div className="order-last lg:order-first relative">
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video group cursor-pointer" onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:scale-105 transition duration-700"
                    style={{
                      backgroundImage: `url(${genres[0]?.videos?.[0] ? getThumbnailUrl(genres[0].videos[0]) : '/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png'})`,
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-20 h-20 bg-bear-blue rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(8,225,247,0.6)] animate-pulse">
                      <Play className="w-8 h-8 text-black fill-black ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur px-3 py-1 rounded-full text-xs font-mono text-bear-blue border border-bear-blue/30">
                    PREVIEW 2026 • HD 1080P
                  </div>
                </div>
              </div>

              {/* TEXTO DE VENTA (DERECHA EN DESKTOP) – Sin redundancia con catálogo */}
              <div className="text-center lg:text-left space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/50 text-orange-400 text-xs font-bold uppercase tracking-wider mb-2">
                  ⚠️ ACCESO RESTRINGIDO • SOLO 50 CUPOS HOY
                </div>

                <h1 className="text-4xl lg:text-6xl font-black text-white leading-[1] tracking-tight">
                  TU COMPETENCIA TE VA A <span className="text-bear-blue">ENVIDIAR</span>.
                </h1>

                <p className="text-lg text-zinc-400 max-w-lg mx-auto lg:mx-0">
                  Deja de ser un DJ del montón que pierde horas en YouTube. Obtén la <strong className="text-white">Ventaja Injusta</strong>: 1,268 Video Remixes de Élite. Arrastra, suelta y revienta la pista mientras ellos siguen buscando qué poner.
                </p>

                <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-4 py-2">
                  <div className="text-center lg:text-left">
                    <p className="text-sm text-zinc-500 line-through mb-0.5">$1,500 MXN</p>
                    <div className="text-4xl lg:text-5xl font-black text-white flex items-baseline justify-center lg:justify-start gap-1">
                      <span className="text-xl text-bear-blue">$</span>{priceMXN}
                      <span className="text-lg font-bold text-zinc-400 ml-1">MXN</span>
                    </div>
                    <p className="text-bear-blue font-bold text-sm tracking-widest">UNA VEZ · TUYO PARA SIEMPRE</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 max-w-md mx-auto lg:mx-0">
                  <Link href={`/checkout?pack=${packSlug}`} onClick={() => trackCTAClick('HERO', 'landing')}>
                    <button className="w-full bg-bear-blue hover:brightness-110 text-bear-black text-lg font-black py-4 rounded-xl shadow-[0_0_20px_rgba(8,225,247,0.3)] transition">
                      ⚡ OBTENER MI VENTAJA INJUSTA - ${priceMXN}
                    </button>
                  </Link>
                  <Link href="#catalogo" onClick={() => trackCTAClick('HERO_direct', 'landing')} className="text-center lg:text-left">
                    <button className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl border border-white/20 transition">
                      Ver catálogo y escuchar demos
                    </button>
                  </Link>
                  <p className="text-xs text-zinc-500 flex justify-center lg:justify-start gap-3 flex-wrap">
                    <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> 🔒 Si no te hace ganar más dinero, te devolvemos todo.</span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3 pasos */}
          <section className="py-6 px-4 border-y border-white/5">
            <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-center sm:text-left">
              <span className="text-white font-medium">1. Ves el catálogo</span>
              <span className="text-zinc-600 hidden sm:inline">→</span>
              <span className="text-white font-medium">2. Pagas ${priceMXN} una vez</span>
              <span className="text-zinc-600 hidden sm:inline">→</span>
              <span className="text-white font-medium">3. Descargas todo</span>
            </div>
          </section>

          <StatsSection totalPurchases={totalPurchases} totalVideos={totalVideos > 0 ? totalVideos : undefined} />

          {/* UNA SOLA FILA DE BENEFICIOS (Dolor vs Placer) */}
          <section className="py-12 border-y border-white/5">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-black/40 border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-bear-blue/20 flex items-center justify-center shrink-0 text-bear-blue"><Play className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-bold text-white">Tus Pantallas LED Merecen Respeto</h3>
                  <p className="text-zinc-500 text-sm">No más pixelación vergonzosa. Proyecta imagen de artista Top, no de amateur.</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-black/40 border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-bear-blue/20 flex items-center justify-center shrink-0 text-bear-blue"><Wifi className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-bold text-white">Mezcla Como un Cirujano</h3>
                  <p className="text-zinc-500 text-sm">Olvídate de entrenar el oído. Todo está calculado matemáticamente para que tus mezclas sean perfectas.</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-black/40 border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-bear-blue/20 flex items-center justify-center shrink-0 text-bear-blue"><Download className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-bold text-white">Tu Tiempo Vale Oro</h3>
                  <p className="text-zinc-500 text-sm">Descarga 170 GB mientras duermes. Levántate con el trabajo sucio ya hecho.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ¿Eres un DJ Pro o un Hobby? (Filtro de Ego) */}
          <section className="py-12 px-4 border-y border-white/5">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-black text-white text-center mb-8">¿Eres un DJ Pro o un Hobby?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl border-2 border-green-500/40 bg-green-500/5 p-6">
                  <h3 className="font-bold text-green-400 mb-2">Cobras Bien por tu Show:</h3>
                  <p className="text-zinc-400 text-sm">Si te pagan por calidad, necesitas herramientas de calidad. Punto.</p>
                </div>
                <div className="rounded-xl border-2 border-red-500/30 bg-red-500/5 p-6">
                  <h3 className="font-bold text-red-400 mb-2">Prefieres lo Barato a lo Bueno:</h3>
                  <p className="text-zinc-400 text-sm">Si $350 se te hace caro para tu carrera, este club no es para ti.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ESPEJO EXACTO DE /contenido: mismo título, stats, buscador, grid géneros + lista expandible + sidebar */}
          <section id="catalogo" className="py-8 md:py-12 px-4 border-t border-white/5">
            <div className="max-w-7xl mx-auto">
              {/* Header idéntico a contenido: Pack Enero 2026 + stats + buscador */}
              <div className="mb-6 md:mb-8">
                <h2 className="text-2xl md:text-4xl font-black text-white mb-2">
                  {packName}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mb-6 text-sm text-gray-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Folder className="h-4 w-4 text-bear-blue" />
                    {loading ? '...' : totalVideos.toLocaleString()} Videos
                  </span>
                  <span className="text-white/40">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-bear-blue font-medium">💾</span>
                    {loading ? '...' : totalSizeFormatted}
                  </span>
                  <span className="text-white/40">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Music2 className="h-4 w-4 text-bear-blue" />
                    {loading ? '...' : genreCount} Géneros
                  </span>
                </div>
                <div className="relative max-w-xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Busca por artista, canción, BPM o Key..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 rounded-xl border border-zinc-800 bg-black text-white placeholder-gray-500 outline-none transition-colors focus:border-bear-blue focus:ring-2 focus:ring-bear-blue/20"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* GRID DE GÉNEROS + LISTA EXPANDIBLE (igual que /contenido) */}
                <div className="lg:col-span-2 space-y-6 min-w-0">
                  {loading && filteredGenres.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 h-24 animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredGenres.map((genre) => {
                          const firstVideo = genre.videos?.[0]
                          const isExpanded = expandedGenre === genre.id
                          return (
                            <motion.div
                              key={genre.id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`rounded-xl border bg-zinc-900/80 overflow-hidden transition-all hover:border-bear-blue hover:shadow-[0_0_24px_rgba(8,225,247,0.12)] cursor-pointer min-w-0 ${isExpanded ? 'border-bear-blue/60 ring-2 ring-bear-blue/20' : 'border-zinc-800'}`}
                              onClick={() => setExpandedGenre(isExpanded ? null : genre.id)}
                            >
                              <div className="flex gap-4 p-4">
                                <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-zinc-800 border border-white/5 flex items-center justify-center">
                                  {firstVideo && !thumbErrors.has(firstVideo.id) ? (
                                    <img src={getThumbnailUrl(firstVideo)} alt="" className="w-full h-full object-cover" onError={() => setThumbErrors((s) => new Set(s).add(firstVideo.id))} />
                                  ) : (
                                    <Folder className="h-8 w-8 text-bear-blue" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                  <h3 className="font-bold text-white truncate">{genre.name}</h3>
                                  <p className="text-sm text-gray-500">
                                    {genre.videoCount} videos · {genre.totalSizeFormatted}
                                  </p>
                                  <p className="mt-1 text-xs text-bear-blue font-medium flex items-center gap-1">
                                    {isExpanded ? 'Cerrar carpeta' : 'Abrir carpeta'}
                                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                  </p>
                                </div>
                                <span className="shrink-0 self-center text-bear-blue">
                                  <ChevronRight className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                </span>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>

                      <AnimatePresence initial={false}>
                        {expandedGenre && (
                          <motion.div
                            ref={expandedSectionRef}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden min-w-0"
                          >
                            {filteredGenres
                              .filter((g) => g.id === expandedGenre)
                              .map((genre) => (
                                <div key={genre.id} className="min-w-0">
                                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-zinc-800/50">
                                    <h3 className="font-bold text-white truncate">Videos en {genre.name}</h3>
                                    <button type="button" onClick={() => setExpandedGenre(null)} className="text-sm text-zinc-400 hover:text-white transition">Cerrar</button>
                                  </div>
                                  <div className="max-h-[50vh] sm:max-h-[420px] overflow-y-auto overflow-x-hidden min-h-0 overscroll-contain">
                                    {genre.videos.map((video) => (
                                      <div
                                        key={video.id}
                                        className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors ${selectedVideo?.id === video.id ? 'bg-bear-blue/10' : ''}`}
                                        onClick={() => { setSelectedVideo(video); setDemoError(false); }}
                                      >
                                        <button
                                          type="button"
                                          className="p-2 rounded-lg bg-bear-blue/20 text-bear-blue hover:bg-bear-blue/30 transition shrink-0"
                                          onClick={(e) => { e.stopPropagation(); setSelectedVideo(video); setDemoError(false); }}
                                          aria-label="Reproducir demo"
                                        >
                                          <Play className="h-4 w-4" />
                                        </button>
                                        <div className="w-14 h-10 sm:w-16 sm:h-10 shrink-0 rounded overflow-hidden bg-zinc-800 border border-white/5 flex items-center justify-center">
                                          {!thumbErrors.has(video.id) ? (
                                            <img
                                              src={getThumbnailUrl(video)}
                                              alt=""
                                              className="w-full h-full object-cover"
                                              onError={() => setThumbErrors((s) => new Set(s).add(video.id))}
                                            />
                                          ) : (
                                            <Play className="h-5 w-5 text-bear-blue/60" />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-white truncate">{video.artist}</p>
                                          <p className="text-sm text-gray-500 truncate">{video.title}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          {video.key && <span className="px-2 py-0.5 rounded text-xs font-mono bg-purple-500/20 text-purple-300">{video.key}</span>}
                                          {video.bpm && <span className="px-2 py-0.5 rounded text-xs font-mono bg-green-500/20 text-green-300">{video.bpm}</span>}
                                          {userState.hasAccess && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleDownloadFromList(video)
                                                trackCTAClick('download_from_list', 'landing', video.name)
                                              }}
                                              disabled={downloadingVideoId === video.id}
                                              className="p-2 rounded-lg text-bear-blue hover:bg-bear-blue/20 transition shrink-0 disabled:opacity-60"
                                              aria-label="Descargar video"
                                            >
                                              <Download className="h-4 w-4" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>

                {/* SIDEBAR: Preview + CTA (igual que /contenido para usuario free) */}
                <aside className="space-y-6 min-w-0">
                  <div className="lg:sticky lg:top-24 space-y-6">
                    {selectedVideo ? (
                      <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                          <Play className="h-4 w-4 text-bear-blue" />
                          Preview Demo
                        </h3>
                        <div
                          className="relative aspect-video bg-black rounded-xl overflow-hidden mb-4 select-none"
                          onContextMenu={(e) => e.preventDefault()}
                        >
                          <img src={getThumbnailUrl(selectedVideo)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <span className="text-white/20 text-xl font-black rotate-[-25deg]">BEAR BEAT</span>
                          </div>
                          {demoError ? (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/80 p-4 text-center">
                              <p className="text-amber-400 font-bold">Demo no disponible</p>
                              <p className="text-sm text-zinc-400">Los demos requieren Bunny CDN o FTP configurado en el servidor.</p>
                              <p className="text-xs text-zinc-500">Desbloquea el pack para descargar y ver todos los videos.</p>
                            </div>
                          ) : (
                            <video
                              ref={videoRef}
                              key={selectedVideo.path}
                              src={`/api/demo-url?path=${encodeURIComponent(selectedVideo.path)}`}
                              className="relative z-10 w-full h-full object-contain"
                              controls
                              controlsList="nodownload nofullscreen noremoteplayback"
                              disablePictureInPicture
                              playsInline
                              autoPlay
                              preload="auto"
                              onError={() => setDemoError(true)}
                            />
                          )}
                          <div className="absolute top-2 right-2 z-10">
                            <span className="bg-red-500/90 px-2 py-0.5 rounded text-xs font-bold">DEMO</span>
                          </div>
                        </div>
                        <p className="font-bold text-white truncate">{selectedVideo.artist}</p>
                        <p className="text-sm text-gray-500 truncate">{selectedVideo.title}</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {selectedVideo.key && <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300">{selectedVideo.key}</span>}
                          {selectedVideo.bpm && <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-300">{selectedVideo.bpm} BPM</span>}
                        </div>
                        <Link href={`/checkout?pack=${packSlug}`} onClick={() => trackCTAClick('sidebar_preview', 'landing')}>
                          <button className="w-full mt-3 h-11 rounded-xl bg-bear-blue text-bear-black font-black hover:brightness-110 transition flex items-center justify-center gap-2">
                            <Lock className="h-4 w-4" />
                            Desbloquear descarga
                          </button>
                        </Link>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
                        <Music2 className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">Selecciona un video</p>
                        <p className="text-xs text-gray-600">para ver la preview</p>
                      </div>
                    )}

                    <div className="rounded-2xl border-2 border-bear-blue/60 bg-bear-blue/5 p-6 shadow-[0_0_30px_rgba(8,225,247,0.08)]">
                      <h3 className="font-black text-white text-lg mb-1">¿Cuánto vale tu reputación?</h3>
                      <p className="text-xs text-amber-400 font-medium mb-2">🔥 El 93% de las licencias de Enero ya se vendieron. Quedan pocas.</p>
                      <p className="text-2xl text-zinc-500 line-through mb-0.5">Valor Real del Material $12,680 MXN</p>
                      <p className="text-3xl font-black text-bear-blue mb-1">Tu Inversión Ridícula: ${priceMXN} MXN</p>
                      <p className="text-xs text-gray-500 mb-4">Pago único · Descarga web y FTP</p>
                      <ul className="space-y-2 mb-5 text-sm text-gray-300">
                        {[`${totalVideos > 0 ? totalVideos.toLocaleString() : '…'} videos HD`, 'Descarga ilimitada', 'Acceso FTP incluido'].map((item, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      <Link href={`/checkout?pack=${packSlug}`} onClick={() => trackCTAClick('sidebar_cta', 'landing')}>
                        <button className="w-full h-12 rounded-xl bg-bear-blue text-bear-black font-black text-sm hover:brightness-110 transition">
                          💎 UNIRME A LA ÉLITE AHORA
                        </button>
                      </Link>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Pago único. Descargas por web o FTP. Sin suscripciones.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </section>

          {/* CTA FINAL */}
          <section className="py-12 md:py-16 px-4 text-center bg-gradient-to-b from-transparent to-bear-blue/10">
            <h2 className="text-2xl md:text-4xl font-black text-white mb-4 tracking-tight">Todo el pack por ${priceMXN} MXN</h2>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">Pago único. Descarga por web o FTP cuando quieras.</p>
            <Link href={`/checkout?pack=${packSlug}`} onClick={() => trackCTAClick('final_cta', 'landing')}>
              <button className="bg-bear-blue hover:brightness-110 text-bear-black text-lg font-black py-4 px-8 rounded-xl transition">
                Ir a pagar
              </button>
            </Link>
          </section>

          {/* STICKY CTA MÓVIL – Siempre visible al scroll (invitados) */}
          {!userState.hasAccess && (
            <div className="fixed bottom-0 left-0 right-0 z-[30] md:hidden border-t border-white/10 bg-[#0a0a0a]/95 backdrop-blur p-3 safe-area-pb">
              <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
                <p className="text-sm text-gray-400">
                  <span className="text-white font-bold">{totalVideos > 0 ? totalVideos.toLocaleString() : '…'}</span> videos · ${priceMXN} MXN
                </p>
                <Link href={`/checkout?pack=${packSlug}`} onClick={() => trackCTAClick('sticky_cta', 'landing')} className="shrink-0">
                  <button className="h-11 px-5 rounded-xl bg-bear-blue text-bear-black font-black text-sm hover:brightness-110 transition">
                    Comprar
                  </button>
                </Link>
              </div>
            </div>
          )}
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
            packSlug={packSlug}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
