'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trackCTAClick, trackPageView } from '@/lib/tracking'
import { downloadFile } from '@/lib/download'
import { registerServiceWorker, requestNotificationPermission, subscribeToPush, isPushSupported } from '@/lib/push-notifications'
import { MobileMenu } from '@/components/ui/MobileMenu'
import { createClient } from '@/lib/supabase/client'
import { useFeaturedPack } from '@/lib/hooks/useFeaturedPack'
import { StatsSection } from '@/components/landing/stats-section'
import { Play, CheckCircle2, Check, Download, Wifi, Folder, Music2, Search, ChevronRight, Lock, X } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

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

function VideoDemoDialog({
  open,
  onOpenChange,
  video,
  hasAccess = false,
  packSlug = 'enero-2026',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  video: Video | null
  hasAccess?: boolean
  packSlug?: string
}) {
  const [downloading, setDownloading] = useState(false)
  const [demoError, setDemoError] = useState(false)
  useEffect(() => setDemoError(false), [video?.id])

  if (!video) return null

  // Siempre usa /api/demo-url para playback (Bunny redirige y soporta Range).
  const demoSrc = `/api/demo-url?path=${encodeURIComponent(video.path)}`

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadFile(video.path)
    } catch (error) {
      toast.error((error as Error)?.message || 'Error al descargar')
    }
    setDownloading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,1000px)] p-0 overflow-hidden">
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {!hasAccess && (
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center opacity-30">
              <p className="text-white text-6xl font-black rotate-[-15deg]">BEAR BEAT</p>
            </div>
          )}
          {demoError && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/80 p-6 text-center">
              <p className="text-amber-400 font-black">Demo no disponible</p>
              <p className="text-sm text-zinc-400">
                Intenta más tarde. Si esto sigue pasando, revisa que Bunny CDN o FTP estén configurados.
              </p>
            </div>
          )}
          <video
            src={demoSrc}
            className="w-full h-full"
            controls
            autoPlay
            playsInline
            preload="metadata"
            controlsList={hasAccess ? undefined : 'nodownload noremoteplayback'}
            disablePictureInPicture={!hasAccess}
            onError={() => setDemoError(true)}
          />
        </div>

        <div className="p-6 text-center">
          <DialogHeader className="px-0 pt-0">
            <DialogTitle className="text-xl font-bold text-white">
              {video.artist} - {video.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-400">
              {hasAccess ? 'Descarga disponible para miembros con acceso.' : 'Escucha el demo. Desbloquea para descargar.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-3 mt-2 text-sm text-zinc-400">
            {video.bpm && <span className="bg-zinc-800 px-2 py-1 rounded">{video.bpm} BPM</span>}
            {video.key && <span className="bg-zinc-800 px-2 py-1 rounded">{video.key}</span>}
          </div>

          <div className="mt-6">
            {hasAccess ? (
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="bg-green-500 hover:bg-green-400 text-black font-bold py-3 px-8 rounded-full transition disabled:opacity-60"
              >
                {downloading ? 'Descargando...' : 'Descargar video'}
              </button>
            ) : (
              <Link
                href={`/checkout?pack=${packSlug}`}
                className="bg-bear-blue hover:bg-cyan-400 text-black font-black py-3 px-8 rounded-full transition shadow-[0_0_20px_rgba(8,225,247,0.4)] inline-flex items-center justify-center"
                onClick={() => trackCTAClick('paywall_cta', 'landing_demo_player', video.name)}
              >
                DESBLOQUEAR MI ARSENAL
              </Link>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ==========================================
// HOME LANDING PRINCIPAL
// ==========================================
type HomeLandingProps = {
  initialPack?: {
    slug: string
    name: string
    description?: string | null
    price_mxn: number
    price_usd?: number | null
  }
  initialPackInfo?: PackInfo | null
  initialHeroThumbUrl?: string | null
}

export default function HomeLanding({ initialPack, initialPackInfo, initialHeroThumbUrl }: HomeLandingProps) {
  const router = useRouter()
  const { pack: featuredPack } = useFeaturedPack()

  // La landing debe renderizar estable en SSR. Estos defaults evitan "flicker" de precio/pack.
  const FALLBACK_PACK = {
    slug: 'enero-2026',
    name: 'Pack Enero 2026',
    description: null as string | null,
    price_mxn: 350,
    price_usd: 19,
  }

  const pack = initialPack ? { ...featuredPack, ...initialPack } : featuredPack || FALLBACK_PACK
  const packSlug = pack.slug || 'enero-2026'
  const packName = pack.name || 'Pack Enero 2026'
  const priceMXNFromPack = Number(pack.price_mxn) || 350

  const [genres, setGenres] = useState<Genre[]>([])
  const [packInfo, setPackInfo] = useState<PackInfo | null>(initialPackInfo || null)
  const [loading, setLoading] = useState(true)
  const [loadingAll, setLoadingAll] = useState(false)
  const [loadingGenreId, setLoadingGenreId] = useState<string | null>(null)
  const [isFullCatalogLoaded, setIsFullCatalogLoaded] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [demoVideo, setDemoVideo] = useState<Video | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGenre, setExpandedGenre] = useState<string | null>(null)
  const [userState, setUserState] = useState<UserState>({ isLoggedIn: false, hasAccess: false })
  const [showPushModal, setShowPushModal] = useState(false)
  const [pushSubscribing, setPushSubscribing] = useState(false)
  const [thumbErrors, setThumbErrors] = useState<Set<string>>(new Set())
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(null)
  const expandedSectionRef = useRef<HTMLDivElement>(null)

  const handleDownloadFromList = async (video: Video) => {
    setDownloadingVideoId(video.id)
    try {
      await downloadFile(video.path)
    } catch (e) {
      toast.error((e as Error)?.message || 'Error al descargar')
    }
    setDownloadingVideoId(null)
  }

  const getThumbnailUrl = (video: Video): string => {
    // Mantener alineado con /contenido: usar thumbnailUrl si existe, aunque sea relativa.
    if (video.thumbnailUrl) {
      if (video.thumbnailUrl.startsWith('http://') || video.thumbnailUrl.startsWith('https://')) return video.thumbnailUrl
      if (video.thumbnailUrl.startsWith('/')) return video.thumbnailUrl
      return `/api/thumbnail-cdn?path=${encodeURIComponent(video.thumbnailUrl)}`
    }
    if (video.path) return `/api/thumbnail-cdn?path=${encodeURIComponent(video.path)}`
    return '/api/placeholder/thumb?text=V'
  }
  const getPlaceholderThumbUrl = (video: Video): string => {
    const artist = encodeURIComponent(video.artist || '')
    const title = encodeURIComponent(video.title || video.displayName || '')
    return `/api/placeholder/thumb?artist=${artist}&title=${title}`
  }
  const totalSizeFormatted = packInfo?.totalSizeFormatted ?? '0 B'
  const genreCount = packInfo?.genreCount ?? 0

  useEffect(() => {
    trackPageView('home')
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: purchases } = await supabase.from('purchases').select('id').eq('user_id', user.id)
        const hasAccess = !!purchases?.length
        setUserState({ isLoggedIn: true, hasAccess, userName: user.email?.split('@')[0] })
        if (hasAccess) {
          router.replace('/dashboard')
        }
      }
    } catch {
      // ignore
    }
  }

  // Cargar stats + lista de géneros (ligero) para no reventar el LCP.
  const loadStats = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/videos?pack=${encodeURIComponent(packSlug)}&statsOnly=1`, { cache: 'no-store' })
      const data = await res.json()
      if (data.success) {
        if (Array.isArray(data.genres)) setGenres(data.genres || [])
        if (data.pack) setPackInfo((prev) => ({ ...prev, ...data.pack }))
      }
    } catch (e) {
      console.warn('[home] loadStats failed:', (e as Error)?.message || e)
    } finally {
      setLoading(false)
    }
  }

  const loadAllVideos = async () => {
    if (loadingAll) return
    try {
      setLoadingAll(true)
      const res = await fetch(`/api/videos?pack=${encodeURIComponent(packSlug)}`, { cache: 'no-store' })
      const data = await res.json()
      if (data.success) {
        setGenres(data.genres || [])
        if (data.pack) setPackInfo(data.pack)
        setIsFullCatalogLoaded(true)
      }
    } catch (e) {
      console.warn('[home] loadAllVideos failed:', (e as Error)?.message || e)
    } finally {
      setLoadingAll(false)
    }
  }

  const loadGenreVideos = async (genreId: string) => {
    if (!genreId || isFullCatalogLoaded) return
    const current = genres.find((g) => g.id === genreId)
    if (current && current.videoCount > 0 && (current.videos || []).length > 0) return
    if (loadingGenreId) return
    try {
      setLoadingGenreId(genreId)
      const res = await fetch(
        `/api/videos?pack=${encodeURIComponent(packSlug)}&genre=${encodeURIComponent(genreId)}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      if (data.success && Array.isArray(data.genres) && data.genres.length > 0) {
        const loadedGenre: Genre = data.genres[0]
        setGenres((prev) => prev.map((g) => (g.id === genreId ? loadedGenre : g)))
        if (data.pack) setPackInfo((prev) => ({ ...prev, ...data.pack }))
      }
    } catch (e) {
      console.warn('[home] loadGenreVideos failed:', (e as Error)?.message || e)
    } finally {
      setLoadingGenreId(null)
    }
  }

  // Al cambiar pack: reset y carga ligera.
  useEffect(() => {
    setExpandedGenre(null)
    setSelectedVideo(null)
    setDemoVideo(null)
    setIsFullCatalogLoaded(false)
    setLoadingAll(false)
    setLoadingGenreId(null)
    setPackInfo(initialPackInfo || null)
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packSlug])

  // Si el usuario usa búsqueda, cargar catálogo completo una sola vez (para filtrar del lado del cliente).
  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) return
    if (isFullCatalogLoaded || loadingAll) return
    const t = setTimeout(() => {
      loadAllVideos()
    }, 450)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, isFullCatalogLoaded, loadingAll, packSlug])

  const totalVideos = packInfo?.totalVideos ?? 0
  const totalPurchases = packInfo?.totalPurchases ?? 0
  const priceMXN = priceMXNFromPack
  const heroThumbVideo = initialHeroThumbUrl ? null : genres.find((g) => (g.videos || []).length > 0)?.videos?.[0]
  const heroThumbSrc =
    initialHeroThumbUrl ||
    (heroThumbVideo ? getThumbnailUrl(heroThumbVideo) : '/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png')
  const heroThumbIsPreview = Boolean(initialHeroThumbUrl || heroThumbVideo)
  const totalSizeCopy = totalSizeFormatted && totalSizeFormatted !== '0 B' ? totalSizeFormatted : 'todo el pack'

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

  // Push: prompt no intrusivo (una vez por sesión). Evitar modal bloqueante.
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

      {/* Push prompt: banner (no modal) para no bloquear la UX ni interceptar clicks */}
      <AnimatePresence>
        {showPushModal && (
          <motion.div
            // Evitar animar opacity (reduce contraste y falla auditorías a11y en cargas rápidas).
            initial={{ y: 18 }}
            animate={{ y: 0 }}
            exit={{ y: 18 }}
            className="fixed left-4 z-[44] w-[min(420px,calc(100vw-2rem))] pointer-events-none bottom-20 md:bottom-4"
            style={{
              paddingBottom: 'env(safe-area-inset-bottom, 0)',
              paddingLeft: 'env(safe-area-inset-left, 0)',
            }}
          >
            <div className="pointer-events-auto rounded-2xl border border-bear-blue/30 bg-zinc-950/95 backdrop-blur shadow-[0_0_40px_rgba(8,225,247,0.12)] p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-10 w-10 rounded-xl bg-bear-blue/15 text-bear-blue flex items-center justify-center shrink-0">
                  <span className="text-lg">📣</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white">Packs gratis y descuentos flash</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Activa alertas y te avisamos cuando haya ofertas y drops nuevos. Sin spam.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPushModal(false)
                    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('bb_push_prompt_shown', '1')
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bear-blue/40"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAcceptPush}
                  disabled={pushSubscribing}
                  className="flex-1 bg-bear-blue text-bear-black font-black py-2.5 rounded-xl hover:brightness-110 transition disabled:opacity-60"
                >
                  {pushSubscribing ? 'Activando…' : 'Activar alertas'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPushModal(false)
                    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('bb_push_prompt_shown', '1')
                  }}
                  className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-sm font-bold border border-white/10 transition"
                >
                  Ahora no
                </button>
              </div>
            </div>
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
              <Link
                href={`/checkout?pack=${packSlug}`}
                className="bg-bear-blue hover:bg-cyan-400 text-black px-5 py-2 rounded-full text-sm font-black transition shadow-[0_0_15px_rgba(8,225,247,0.3)] inline-flex items-center justify-center"
              >
                ACCESO TOTAL ${priceMXN}
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
            <Link
              href="/contenido"
              className="bg-bear-blue text-black font-bold py-4 px-8 rounded-xl text-lg hover:scale-105 transition w-full sm:w-auto inline-flex items-center justify-center"
            >
              🚀 Ir al Contenido Web
            </Link>
            <Link
              href="/dashboard"
              className="bg-zinc-800 border border-zinc-700 text-white font-bold py-4 px-8 rounded-xl text-lg hover:bg-zinc-700 transition w-full sm:w-auto inline-flex items-center justify-center"
            >
              📊 Ver mi Dashboard
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
	                <a
	                  href="#catalogo"
	                  className="relative block rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bear-blue/40"
	                >
                    <span className="sr-only">Ver catálogo</span>
	                  <Image
	                    src={heroThumbSrc}
	                    alt={heroThumbIsPreview ? `Preview ${packName}` : 'Bear Beat'}
	                    fill
	                    sizes="(max-width: 1024px) 92vw, 50vw"
	                    priority
	                    // /api/thumbnail-cdn ya redirige a Bunny (CDN). No queremos pasar por el optimizador.
	                    unoptimized
	                    className="absolute inset-0 object-cover opacity-60 group-hover:scale-105 transition duration-700"
	                  />
	                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
	                    <div className="w-20 h-20 bg-bear-blue rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(8,225,247,0.6)] animate-pulse">
	                      <Play className="w-8 h-8 text-black fill-black ml-1" />
	                    </div>
	                  </div>
                  <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur px-3 py-1 rounded-full text-xs font-mono text-bear-blue border border-bear-blue/30">
                    PREVIEW 2026 • HD 1080P
                  </div>
                </a>
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
                  Deja de ser un DJ del montón que pierde horas en YouTube. Obtén la <strong className="text-white">Ventaja Injusta</strong>: {totalVideos > 0 ? totalVideos.toLocaleString() : '1,000+'} Video Remixes de Élite. Arrastra, suelta y revienta la pista mientras ellos siguen buscando qué poner.
                </p>

                <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-4 py-2">
                  <div className="text-center lg:text-left">
                    <p className="text-sm text-zinc-400 line-through mb-0.5">$1,500 MXN</p>
                    <div className="text-4xl lg:text-5xl font-black text-white flex items-baseline justify-center lg:justify-start gap-1">
                      <span className="text-xl text-bear-blue">$</span>{priceMXN}
                      <span className="text-lg font-bold text-zinc-400 ml-1">MXN</span>
                    </div>
                    <p className="text-bear-blue font-bold text-sm tracking-widest">UNA VEZ · TUYO PARA SIEMPRE</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 max-w-md mx-auto lg:mx-0">
                  <Link
                    href={`/checkout?pack=${packSlug}`}
                    onClick={() => trackCTAClick('HERO', 'landing')}
                    className="w-full bg-bear-blue hover:brightness-110 text-bear-black text-lg font-black py-4 rounded-xl shadow-[0_0_20px_rgba(8,225,247,0.3)] transition inline-flex items-center justify-center"
                  >
                    ⚡ OBTENER MI VENTAJA INJUSTA - ${priceMXN}
                  </Link>
                  <a
                    href="#catalogo"
                    onClick={() => trackCTAClick('HERO_direct', 'landing')}
                    className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl border border-white/20 transition inline-flex items-center justify-center text-center"
                  >
                    Ver catálogo y escuchar demos
                  </a>
                  <p className="text-xs text-zinc-400 flex justify-center lg:justify-start gap-3 flex-wrap">
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
            <div className="max-w-7xl mx-auto px-4">
              <h2 className="sr-only">Beneficios</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-black/40 border border-white/10">
                  <div className="w-10 h-10 rounded-lg bg-bear-blue/20 flex items-center justify-center shrink-0 text-bear-blue"><Play className="h-5 w-5" /></div>
                  <div>
                    <h3 className="font-bold text-white">Tus Pantallas LED Merecen Respeto</h3>
                    <p className="text-zinc-400 text-sm">No más pixelación vergonzosa. Proyecta imagen de artista Top, no de amateur.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-black/40 border border-white/10">
                  <div className="w-10 h-10 rounded-lg bg-bear-blue/20 flex items-center justify-center shrink-0 text-bear-blue"><Wifi className="h-5 w-5" /></div>
                  <div>
                    <h3 className="font-bold text-white">Mezcla Como un Cirujano</h3>
                    <p className="text-zinc-400 text-sm">Olvídate de entrenar el oído. Todo está calculado matemáticamente para que tus mezclas sean perfectas.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-black/40 border border-white/10">
                  <div className="w-10 h-10 rounded-lg bg-bear-blue/20 flex items-center justify-center shrink-0 text-bear-blue"><Download className="h-5 w-5" /></div>
                  <div>
                    <h3 className="font-bold text-white">Tu Tiempo Vale Oro</h3>
                    <p className="text-zinc-400 text-sm">Descarga {totalSizeCopy} mientras duermes. Levántate con el trabajo sucio ya hecho.</p>
                  </div>
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
                  <p className="text-zinc-400 text-sm">Si ${priceMXN} se te hace caro para tu carrera, este club no es para ti.</p>
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
                  <label htmlFor="landing-catalog-search" className="sr-only">
                    Buscar en el catálogo
                  </label>
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none" />
                  <Input
                    id="landing-catalog-search"
                    type="text"
                    placeholder="Busca por artista, canción, BPM o Key..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-10"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                      aria-label="Borrar búsqueda"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {loadingAll && (
                  <p className="mt-2 text-xs text-zinc-400">Cargando catálogo completo para búsqueda…</p>
                )}
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
                            <motion.button
                              key={genre.id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              type="button"
                              aria-expanded={isExpanded}
                              aria-controls={`landing-genre-panel-${genre.id}`}
                              className={`rounded-xl border bg-zinc-900/80 overflow-hidden transition-all hover:border-bear-blue hover:shadow-[0_0_24px_rgba(8,225,247,0.12)] min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bear-blue/40 ${isExpanded ? 'border-bear-blue/60 ring-2 ring-bear-blue/20' : 'border-zinc-800'}`}
                              onClick={() => {
                                if (isExpanded) return setExpandedGenre(null)
                                setExpandedGenre(genre.id)
                                void loadGenreVideos(genre.id)
                              }}
                            >
                              <div className="flex gap-4 p-4">
                                <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-zinc-800 border border-white/5 flex items-center justify-center">
                                  {firstVideo && !thumbErrors.has(firstVideo.id) ? (
                                    <img
                                      src={getThumbnailUrl(firstVideo)}
                                      alt={`Portada ${genre.name}`}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      decoding="async"
                                      onError={() => setThumbErrors((s) => new Set(s).add(firstVideo.id))}
                                    />
                                  ) : (
                                    <Folder className="h-8 w-8 text-bear-blue" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                  <h3 className="font-bold text-white truncate">{genre.name}</h3>
                                  <p className="text-sm text-zinc-400">
                                    {genre.videoCount} videos · {genre.totalSizeFormatted}
                                  </p>
                                  <p className="mt-1 text-xs text-bear-blue font-medium flex items-center gap-1">
                                    {isExpanded ? 'Cerrar carpeta' : 'Abrir carpeta'}
                                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                  </p>
                                </div>
                                <span className="shrink-0 self-center text-bear-blue">
                                  {loadingGenreId === genre.id ? (
                                    <span
                                      className="h-5 w-5 inline-block rounded-full border-2 border-bear-blue/30 border-t-bear-blue animate-spin"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <ChevronRight className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                  )}
                                </span>
                              </div>
                            </motion.button>
                          )
                        })}
                      </div>

                      <AnimatePresence initial={false}>
                        {expandedGenre && (
                          <motion.div
                            ref={expandedSectionRef}
                            id={`landing-genre-panel-${expandedGenre}`}
                            role="region"
                            aria-label="Lista de videos"
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
                                    {(genre.videos || []).length === 0 ? (
                                      <div className="p-4">
                                        {loadingGenreId === genre.id ? (
                                          <div className="space-y-2">
                                            {Array.from({ length: 8 }).map((_, i) => (
                                              <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm text-zinc-400">
                                              {genre.videoCount > 0
                                                ? 'Cargando videos…'
                                                : 'Este género no tiene videos disponibles.'}
                                            </p>
                                            {genre.videoCount > 0 && (
                                              <button
                                                type="button"
                                                onClick={() => void loadGenreVideos(genre.id)}
                                                className="text-sm font-bold text-bear-blue hover:underline"
                                              >
                                                Reintentar
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      genre.videos.map((video) => (
                                        <div
                                          key={video.id}
                                          className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${selectedVideo?.id === video.id ? 'bg-bear-blue/10' : ''}`}
                                        >
                                          <button
                                            type="button"
                                            className="p-2 rounded-lg bg-bear-blue/20 text-bear-blue hover:bg-bear-blue/30 transition shrink-0"
                                            onClick={(e) => {
                                              setSelectedVideo(video)
                                              setDemoVideo(video)
                                            }}
                                            aria-label="Ver demo"
                                          >
                                            <Play className="h-4 w-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setSelectedVideo(video)}
                                            className="flex items-center gap-3 flex-1 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bear-blue/40 rounded-lg"
                                            aria-label={`Seleccionar ${video.artist} - ${video.title}`}
                                          >
                                            <div className="w-14 h-10 sm:w-16 sm:h-10 shrink-0 rounded overflow-hidden bg-zinc-800 border border-white/5 flex items-center justify-center">
                                              {!thumbErrors.has(video.id) ? (
                                                <img
                                                  src={getThumbnailUrl(video)}
                                                  alt={`Portada ${video.artist} - ${video.title}`}
                                                  className="w-full h-full object-cover"
                                                  loading="lazy"
                                                  decoding="async"
                                                  onError={() => setThumbErrors((s) => new Set(s).add(video.id))}
                                                />
                                              ) : (
                                                <img
                                                  src={getPlaceholderThumbUrl(video)}
                                                  alt={`Portada ${video.artist} - ${video.title}`}
                                                  className="w-full h-full object-cover opacity-90"
                                                  loading="lazy"
                                                  decoding="async"
                                                />
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="font-medium text-white truncate">{video.artist}</p>
                                              <p className="text-sm text-zinc-400 truncate">{video.title}</p>
                                            </div>
                                          </button>
                                          <div className="flex items-center gap-2 shrink-0">
                                            {video.key && (
                                              <span className="px-2 py-0.5 rounded text-xs font-mono bg-purple-500/20 text-purple-300">
                                                {video.key}
                                              </span>
                                            )}
                                            {video.bpm && (
                                              <span className="px-2 py-0.5 rounded text-xs font-mono bg-green-500/20 text-green-300">
                                                {video.bpm}
                                              </span>
                                            )}
                                            {userState.hasAccess && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
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
                                      ))
                                    )}
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
                          <img
                            src={getThumbnailUrl(selectedVideo)}
                            alt={`Portada ${selectedVideo.artist} - ${selectedVideo.title}`}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <span className="text-white/20 text-xl font-black rotate-[-25deg]">BEAR BEAT</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDemoVideo(selectedVideo)}
                            className="absolute inset-0 z-10 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bear-blue/40"
                            aria-label="Reproducir demo"
                          >
                            <span className="w-16 h-16 rounded-full bg-bear-blue/90 hover:bg-bear-blue text-bear-black flex items-center justify-center shadow-[0_0_30px_rgba(8,225,247,0.45)] transition">
                              <Play className="h-7 w-7 fill-black ml-0.5" />
                            </span>
                          </button>
                          <div className="absolute top-2 right-2 z-10">
                            <span className="bg-red-500/90 px-2 py-0.5 rounded text-xs font-bold">DEMO</span>
                          </div>
                        </div>
                        <p className="font-bold text-white truncate">{selectedVideo.artist}</p>
                        <p className="text-sm text-zinc-400 truncate">{selectedVideo.title}</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {selectedVideo.key && <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300">{selectedVideo.key}</span>}
                          {selectedVideo.bpm && <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-300">{selectedVideo.bpm} BPM</span>}
                        </div>
                        <Link
                          href={`/checkout?pack=${packSlug}`}
                          onClick={() => trackCTAClick('sidebar_preview', 'landing')}
                          className="w-full mt-3 h-11 rounded-xl bg-bear-blue text-bear-black font-black hover:brightness-110 transition inline-flex items-center justify-center gap-2"
                        >
                          <Lock className="h-4 w-4" />
                          Desbloquear descarga
                        </Link>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
                        <Music2 className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                        <p className="text-sm text-zinc-400">Selecciona un video</p>
                        <p className="text-xs text-zinc-400">para ver la preview</p>
                      </div>
                    )}

                      <div className="rounded-2xl border-2 border-bear-blue/60 bg-bear-blue/5 p-6 shadow-[0_0_30px_rgba(8,225,247,0.08)]">
                      <h3 className="font-black text-white text-lg mb-1">¿Cuánto vale tu reputación?</h3>
                      <p className="text-xs text-amber-400 font-medium mb-2">🔥 El 93% de las licencias de Enero ya se vendieron. Quedan pocas.</p>
                      <p className="text-2xl text-zinc-400 line-through mb-0.5">Valor Real del Material $12,680 MXN</p>
                      <p className="text-3xl font-black text-bear-blue mb-1">Tu Inversión Ridícula: ${priceMXN} MXN</p>
                      <p className="text-xs text-zinc-400 mb-4">Pago único · Descarga web y FTP</p>
                      <ul className="space-y-2 mb-5 text-sm text-gray-300">
                        {[`${totalVideos > 0 ? totalVideos.toLocaleString() : '…'} videos HD`, 'Descarga ilimitada', 'Acceso FTP incluido'].map((item, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={`/checkout?pack=${packSlug}`}
                        onClick={() => trackCTAClick('sidebar_cta', 'landing')}
                        className="w-full h-12 rounded-xl bg-bear-blue text-bear-black font-black text-sm hover:brightness-110 transition inline-flex items-center justify-center"
                      >
                        💎 UNIRME A LA ÉLITE AHORA
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
            <Link
              href={`/checkout?pack=${packSlug}`}
              onClick={() => trackCTAClick('final_cta', 'landing')}
              className="bg-bear-blue hover:brightness-110 text-bear-black text-lg font-black py-4 px-8 rounded-xl transition inline-flex items-center justify-center"
            >
              Ir a pagar
            </Link>
          </section>

          {/* STICKY CTA MÓVIL – Siempre visible al scroll (invitados) */}
          {!userState.hasAccess && (
            <div className="fixed bottom-0 left-0 right-0 z-[30] md:hidden border-t border-white/10 bg-[#0a0a0a]/95 backdrop-blur p-3 safe-area-pb">
              <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
                <p className="text-sm text-zinc-400">
                  <span className="text-white font-bold">{totalVideos > 0 ? totalVideos.toLocaleString() : '…'}</span> videos · ${priceMXN} MXN
                </p>
                <Link
                  href={`/checkout?pack=${packSlug}`}
                  onClick={() => trackCTAClick('sticky_cta', 'landing')}
                  className="shrink-0 h-11 px-5 rounded-xl bg-bear-blue text-bear-black font-black text-sm hover:brightness-110 transition inline-flex items-center justify-center"
                >
                  Comprar
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* VIDEO MODAL */}
      <VideoDemoDialog
        open={!!demoVideo}
        onOpenChange={(open) => {
          if (!open) setDemoVideo(null)
        }}
        video={demoVideo}
        hasAccess={userState.hasAccess}
        packSlug={packSlug}
      />
    </div>
  )
}
