'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trackCTAClick, trackPageView } from '@/lib/tracking'
// Demo: /api/demo-url redirige a CDN firmado (rápido) o proxy
import { MobileMenu } from '@/components/ui/MobileMenu'
import { createClient } from '@/lib/supabase/client'
import { useVideoInventory } from '@/lib/hooks/useVideoInventory'

// ==========================================
// TIPOS - Datos reales del API
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

// Estado del usuario
interface UserState {
  isLoggedIn: boolean
  hasAccess: boolean
  userName?: string
}

// ==========================================
// COMPONENTES
// ==========================================

function CountdownTimer({ endDate }: { endDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const distance = endDate.getTime() - now
      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        })
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [endDate])

  return (
    <div className="flex gap-2 md:gap-3 justify-center">
      {[
        { value: timeLeft.days, label: 'DÍAS' },
        { value: timeLeft.hours, label: 'HRS' },
        { value: timeLeft.minutes, label: 'MIN' },
        { value: timeLeft.seconds, label: 'SEG' },
      ].map((item, i) => (
        <div key={i} className="bg-red-600 text-white px-3 md:px-4 py-2 rounded-lg text-center min-w-[60px]">
          <div className="text-2xl md:text-3xl font-black">{String(item.value).padStart(2, '0')}</div>
          <div className="text-[10px] md:text-xs font-bold">{item.label}</div>
        </div>
      ))}
    </div>
  )
}

/** Escasez: barra casi llena (85–99%) para urgencia. "Oferta limitada" / "% cupos vendidos". */
const CUPOS_MES = 100
function ScarcityBar({ sold }: { sold: number }) {
  const percentage = Math.min(99, Math.max(85, Math.round((sold / CUPOS_MES) * 100)))
  const copy = percentage >= 90
    ? '⚠️ Oferta limitada a las próximas 50 licencias a este precio'
    : `${percentage}% de los cupos de este mes vendidos`
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2">
        <span className="font-bold text-red-400">{copy}</span>
        <span className="text-gray-400">{sold.toLocaleString()} licencias reservadas</span>
      </div>
      <div className="h-3 md:h-4 bg-gray-800/80 rounded-full overflow-hidden border border-red-500/30">
        <motion.div
          className="h-full bg-gradient-to-r from-red-500 to-red-600"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, delay: 0.5 }}
        />
      </div>
    </div>
  )
}

// Reproductor de demo: con acceso usa download; sin acceso usa /api/demo-url (CDN o proxy)
function DemoPlayer({ video, onClose, hasAccess = false }: { video: Video; onClose: () => void; hasAccess?: boolean; cdnBaseUrl?: string | null }) {
  const [downloading, setDownloading] = useState(false)
  const [demoError, setDemoError] = useState(false)
  const demoSrc = hasAccess ? `/api/download?file=${encodeURIComponent(video.path)}&stream=true` : `/api/demo-url?path=${encodeURIComponent(video.path)}`
  
  const handleDownload = async () => {
    setDownloading(true)
    try {
      // Abrir descarga en nueva pestaña
      window.open(`/api/download?file=${encodeURIComponent(video.path)}`, '_blank')
    } catch (error) {
      console.error('Error downloading:', error)
    }
    setDownloading(false)
  }

  const blockCopy = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 select-none"
      onClick={onClose}
      onContextMenu={blockCopy}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="relative w-full max-w-4xl select-none"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation() }}
      >
        {/* Cerrar */}
        <button onClick={onClose} className="absolute -top-12 right-0 text-white text-xl hover:text-bear-blue">
          ✕ Cerrar
        </button>

        {/* Video con watermark (solo si no tiene acceso) - no descarga, no clic derecho, no arrastre */}
        <div
          className="relative aspect-video bg-black rounded-2xl overflow-hidden select-none"
          onContextMenu={blockCopy}
          onDragStart={(e) => e.preventDefault()}
        >
          {!hasAccess && (
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
              <p className="text-white/20 text-4xl md:text-6xl font-black rotate-[-25deg]">BEAR BEAT</p>
            </div>
          )}
          {demoError && !hasAccess ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900/90 text-gray-400 p-6 text-center">
              <p className="text-lg font-bold text-white/80 mb-2">Demo no disponible</p>
              <p className="text-sm">Revisa BUNNY_CDN_URL en .env o que el archivo exista en el CDN.</p>
            </div>
          ) : !demoSrc && !hasAccess ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900/90 text-gray-400 p-6 text-center">
              <p className="text-lg font-bold text-white/80 mb-2">Demo no configurado</p>
              <p className="text-sm">Añade BUNNY_CDN_URL en .env.local (ej: https://bear-beat.b-cdn.net).</p>
            </div>
          ) : (
          <video
            src={demoSrc}
            className="w-full h-full pointer-events-auto"
            controls
            autoPlay
            playsInline
            preload="auto"
            draggable={false}
            controlsList={hasAccess ? undefined : "nodownload nofullscreen noremoteplayback noplaybackrate"}
            disablePictureInPicture={!hasAccess}
            disableRemotePlayback
            onContextMenu={blockCopy}
            onError={() => !hasAccess && setDemoError(true)}
          />
          )}
          <div className={`absolute top-4 right-4 ${hasAccess ? 'bg-green-500' : 'bg-red-500'} px-3 py-1 rounded-full text-sm font-bold`}>
            {hasAccess ? '✓ ACCESO COMPLETO' : 'DEMO'}
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 text-center">
          <p className="text-xl font-bold">{video.artist}</p>
          <p className="text-gray-400">{video.title}</p>
          <div className="flex justify-center gap-3 mt-2">
            {video.key && <span className="bg-purple-500/30 px-3 py-1 rounded text-sm">{video.key}</span>}
            {video.bpm && <span className="bg-green-500/30 px-3 py-1 rounded text-sm">{video.bpm} BPM</span>}
          </div>
        </div>

        {/* CTA - Diferente según acceso */}
        <div className="mt-6 text-center">
          {hasAccess ? (
            <button 
              onClick={handleDownload}
              disabled={downloading}
              className="bg-green-500 text-white font-black text-xl px-12 py-4 rounded-xl hover:bg-green-600 transition disabled:opacity-50"
            >
              {downloading ? '⏳ Preparando...' : '⬇️ DESCARGAR ESTE VIDEO'}
            </button>
          ) : (
            <Link href="/checkout?pack=enero-2026">
              <button className="bg-bear-blue text-bear-black font-black text-xl px-12 py-4 rounded-xl hover:bg-bear-blue/90">
                DESCARGAR ESTE Y TODOS LOS DEMÁS →
              </button>
            </Link>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

/** Tarjeta de video: siempre muestra fondo + icono de play (sin depender de portadas que fallen) */
function VideoCard({ video, onSelect }: { video: Video; onSelect: () => void }) {
  const [thumbError, setThumbError] = useState(false)
  const showThumb = video.thumbnailUrl && !thumbError
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      onClick={onSelect}
      className="bg-white/5 rounded-xl overflow-hidden cursor-pointer group border border-transparent hover:border-bear-blue/50"
    >
      <div className="aspect-video bg-gray-900 relative overflow-hidden">
        {showThumb ? (
          <img
            src={video.thumbnailUrl}
            alt={video.artist}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setThumbError(true)}
          />
        ) : null}
        {/* Fondo cuando no hay imagen o falló: gradiente + icono de play siempre visible */}
        <div className={`absolute inset-0 bg-gradient-to-br from-bear-blue/25 via-gray-900 to-purple-900/30 flex flex-col items-center justify-center ${showThumb ? 'opacity-0 group-hover:opacity-100' : ''}`}>
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-bear-blue/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
            <span className="text-white text-2xl md:text-3xl ml-1" aria-hidden>▶</span>
          </div>
          <span className="text-white/70 text-xs mt-2 font-medium">Reproducir</span>
        </div>
        {/* Overlay play al hacer hover si hay thumbnail */}
        {showThumb && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-bear-blue flex items-center justify-center shadow-xl">
              <span className="text-bear-black text-2xl ml-1">▶</span>
            </div>
          </div>
        )}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs font-mono z-10">
            {video.duration}
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="font-bold text-xs truncate">{video.artist}</p>
        <p className="text-[10px] text-gray-500 truncate">{video.title}</p>
      </div>
    </motion.div>
  )
}

// ==========================================
// PÁGINA PRINCIPAL (Landing – solo para usuarios sin compra o guest)
// ==========================================
export default function HomeLanding() {
  const router = useRouter()
  const [endDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 3)
    return date
  })

  // Estado para datos reales
  const [genres, setGenres] = useState<Genre[]>([])
  const [packInfo, setPackInfo] = useState<PackInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [popularVideos, setPopularVideos] = useState<Video[]>([])
  const [lastDownloaded, setLastDownloaded] = useState<Video | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [cdnBaseUrl, setCdnBaseUrl] = useState<string | null>(null)
  const popularCarouselRef = useRef<HTMLDivElement>(null)

  // Base URL del CDN Bunny (BUNNY_CDN_URL) — el front no ve esa variable, la pedimos al API
  useEffect(() => {
    fetch('/api/cdn-base')
      .then((res) => res.json())
      .then((data) => typeof data?.baseUrl === 'string' && data.baseUrl && setCdnBaseUrl(data.baseUrl))
      .catch(() => {})
  }, [])

  // Estado del usuario
  const [userState, setUserState] = useState<UserState>({
    isLoggedIn: false,
    hasAccess: false
  })

  // Inventario en tiempo real desde Supabase (tabla videos)
  const inventory = useVideoInventory()

  // Timeout para no mostrar "..." eternamente si la API tarda (cold start en Render)
  const [statsTimedOut, setStatsTimedOut] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setStatsTimedOut(true), 2000)
    return () => clearTimeout(t)
  }, [])

  // Cargar datos reales al montar
  useEffect(() => {
    trackPageView('home')
    verificarAccesoDirecto()
    cargarVideos()
  }, [])

  const verificarAccesoDirecto = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setUserState({ isLoggedIn: false, hasAccess: false })
        return
      }

      // Verificar compras directamente
      const { data: purchases } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.id)

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      const hasAccess = Boolean(purchases && purchases.length > 0)

      setUserState({
        isLoggedIn: true,
        hasAccess,
        userName: profile?.name || user.email?.split('@')[0] || 'Usuario'
      })

      console.log('✅ ACCESO DETECTADO:', hasAccess, 'Compras:', purchases?.length || 0)
    } catch (error) {
      console.error('Error:', error)
      setUserState({ isLoggedIn: false, hasAccess: false })
    }
  }

  const cargarVideos = async () => {
    try {
      const [videosRes, popularRes] = await Promise.all([
        fetch(`/api/videos?pack=enero-2026&statsOnly=1&_=${Date.now()}`, { cache: 'no-store', headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' } }),
        fetch('/api/videos/popular?pack=enero-2026&limit=10', { cache: 'no-store' }),
      ])
      const data = await videosRes.json()
      if (data.success) {
        setGenres(data.genres)
        setPackInfo(data.pack)
      }
      const popularData = await popularRes.json()
      if (popularData.success && Array.isArray(popularData.videos)) {
        setPopularVideos(popularData.videos)
      }
    } catch (error) {
      // Inventario sigue viniendo de useVideoInventory (Supabase)
    } finally {
      setLoading(false)
    }
  }

  // Última descarga del usuario (solo si está logueado)
  useEffect(() => {
    if (!userState.isLoggedIn) return
    fetch('/api/videos/last-downloaded', { cache: 'no-store' })
      .then((res) => res.json())
      .then((d) => d.success && d.video && setLastDownloaded(d.video))
      .catch(() => {})
  }, [userState.isLoggedIn])

  const handleCTAClick = (location: string) => {
    trackCTAClick('comprar_oferta', location, 'lanzamiento_2026')
  }

  // Datos en tiempo real: packInfo (fetch /api/videos) o inventory (useVideoInventory). Sin defaults estáticos.
  const totalVideos = packInfo?.totalVideos ?? inventory.count ?? 0
  const genreCount = packInfo?.genreCount ?? inventory.genreCount ?? 0
  const totalSizeFormatted = packInfo?.totalSizeFormatted ?? inventory.totalSizeFormatted ?? '0 B'
  const totalPurchases = packInfo?.totalPurchases ?? inventory.totalPurchases ?? 0
  const statsLoading = !statsTimedOut && ((loading && !packInfo) || inventory.loading)

  return (
    <div className={`min-h-screen bg-bear-black text-white antialiased ${!userState.hasAccess ? 'pb-20 md:pb-0' : ''}`}>
      {/* BANNER SUPERIOR - DIFERENTE SEGÚN ESTADO */}
      {userState.hasAccess ? (
        // ==========================================
        // BANNER PARA USUARIOS CON ACCESO – compacto
        // ==========================================
        <div className="bg-gradient-to-r from-bear-blue/90 via-cyan-500/90 to-bear-blue/90 py-2.5 md:py-3 px-4 border-b border-bear-blue/30">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-bear-black font-semibold text-sm">
              ¡Hola{userState.userName ? `, ${userState.userName}` : ''}! Ya tienes acceso
            </p>
            <div className="flex gap-2">
              <Link href="/contenido">
                <button className="bg-bear-black text-bear-blue px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition">
                  ⬇️ Descargar
                </button>
              </Link>
              <Link href="/dashboard">
                <button className="bg-white/90 text-bear-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white transition">
                  Mi Panel
                </button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        // ==========================================
        // BANNER DE URGENCIA PARA NUEVOS USUARIOS
        // ==========================================
        <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 py-2 md:py-3 px-4 text-center">
          <p className="text-xs md:text-sm font-bold animate-pulse">
            🔥 OFERTA DE LANZAMIENTO 2026 - PRECIO ESPECIAL POR TIEMPO LIMITADO 🔥
          </p>
        </div>
      )}

      {/* NAVBAR - UX clara: marca | acciones (CTA principal + secundaria) */}
      <header className="sticky top-0 z-50 py-3 md:py-4 px-4 md:px-6 border-b border-white/10 bg-zinc-950/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
          {/* Marca */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat"
              width={44}
              height={44}
              className="w-9 h-9 md:w-10 md:h-10"
            />
            <span className="text-lg md:text-xl font-black text-bear-blue tracking-tight">BEAR BEAT</span>
          </Link>

          {/* Acciones desktop */}
          <nav className="hidden md:flex items-center gap-3" aria-label="Navegación principal">
            {userState.hasAccess ? (
              <>
                <Link href="/dashboard" className="text-sm font-semibold text-bear-blue hover:text-white transition px-3 py-2 rounded-lg hover:bg-bear-blue/10">
                  Mi Panel
                </Link>
                <Link href="/mi-cuenta" className="text-sm text-white/70 hover:text-white transition px-3 py-2 rounded-lg hover:bg-white/5">
                  Mi cuenta
                </Link>
                <Link href="/contenido" className="text-sm font-bold text-bear-black bg-bear-blue hover:bg-bear-blue/90 transition px-4 py-2.5 rounded-lg">
                  Ver Contenido
                </Link>
                <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full border border-green-400/30">
                  Acceso activo
                </span>
              </>
            ) : userState.isLoggedIn ? (
              <>
                <Link href="/dashboard" className="text-sm text-white/70 hover:text-white transition px-3 py-2 rounded-lg hover:bg-white/5">
                  Mi Panel
                </Link>
                <Link href="/mi-cuenta" className="text-sm text-white/70 hover:text-white transition px-3 py-2 rounded-lg hover:bg-white/5">
                  Mi cuenta
                </Link>
                <Link href="/contenido" className="text-sm font-bold text-bear-black bg-bear-blue hover:bg-bear-blue/90 transition px-4 py-2.5 rounded-lg">
                  Ver Contenido
                </Link>
              </>
            ) : (
              <>
                <span className="text-xs text-white/50 mr-1 hidden lg:inline">+2,847 DJs con acceso</span>
                <Link href="/login" className="text-sm text-white/80 hover:text-white transition px-3 py-2 rounded-lg hover:bg-white/5">
                  Iniciar sesión
                </Link>
                <Link href="/contenido" className="text-sm font-bold text-bear-black bg-bear-blue hover:bg-bear-blue/90 transition px-4 py-2.5 rounded-lg">
                  Ver Contenido
                </Link>
              </>
            )}
          </nav>

          <MobileMenu currentPath="/" userHasAccess={userState.hasAccess} isLoggedIn={userState.isLoggedIn} />
        </div>
      </header>

      {/* HERO SECTION - DIFERENTE SEGÚN ESTADO */}
      <section className="py-12 md:py-24 lg:py-28 px-4 md:px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-bear-blue/10 rounded-full blur-[150px] pointer-events-none" />
        
        {userState.hasAccess ? (
          // ==========================================
          // HERO PARA USUARIOS CON ACCESO – limpio y directo
          // ==========================================
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.h1 
              initial={{ opacity: 0, y: 16 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.05 }} 
              className="text-3xl md:text-5xl font-black leading-tight mb-4"
            >
              Tienes acceso a{' '}
              <span className="text-bear-blue">{statsLoading ? '...' : totalVideos.toLocaleString()}</span>
              {' '}Video Remixes
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 12 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.1 }} 
              className="text-base md:text-lg text-gray-400 mb-6"
            >
              Tus videos están listos. Descarga por navegador o por FTP.
            </motion.p>

            {/* Mini stats: mismo dato que verán en /contenido */}
            {!statsLoading && (
              <motion.p 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 0.15 }}
                className="text-sm text-white/60 mb-8"
              >
                {totalVideos.toLocaleString()} videos · {genreCount} géneros · {totalSizeFormatted}
              </motion.p>
            )}

            <motion.div 
              initial={{ opacity: 0, y: 12 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-3 justify-center items-center"
            >
              <Link href="/contenido">
                <button className="w-full sm:w-auto bg-bear-blue text-bear-black font-black text-lg px-8 py-4 rounded-xl shadow-lg shadow-bear-blue/25 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                  <span>⬇️</span>
                  Ir a descargar
                </button>
              </Link>
              <Link href="/dashboard">
                <button className="w-full sm:w-auto bg-white/5 border border-white/20 text-white font-semibold text-lg px-8 py-4 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                  <span>📊</span>
                  Mi Panel
                </button>
              </Link>
            </motion.div>

            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.35 }}
              className="mt-6 text-xs text-white/40"
            >
              Descarga por navegador · FTP · Soporte 24/7
            </motion.p>
          </div>
        ) : (
          // ==========================================
          // HERO PARA NUEVOS USUARIOS – Gancho + dolor/solución + CTA alto contraste
          // ==========================================
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-4 bg-gradient-to-r from-white via-cyan-200 to-bear-blue bg-clip-text text-transparent">
              {statsLoading ? '...' : totalVideos.toLocaleString()} videos HD para DJs. Un pago. Descarga hoy.
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Deja de perder horas ripeando de YouTube en mala calidad. Contenido HD organizado por género, con BPM y Key. Como el que usan los DJs pro.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex flex-col items-center gap-4">
              <Link href="/checkout?pack=enero-2026" onClick={() => handleCTAClick('hero')} className="w-full sm:w-auto">
                <button className="w-full min-h-[52px] sm:min-h-[60px] bg-bear-blue text-bear-black font-black text-xl md:text-3xl px-10 py-5 md:py-7 rounded-2xl shadow-[0_0_30px_rgba(8,225,247,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all border-2 border-bear-blue">
                  QUIERO ACCESO AHORA →
                </button>
              </Link>
              <p className="text-sm text-gray-400">🔒 Acceso inmediato · Garantía de 30 días</p>
            </motion.div>
          </div>
        )}
      </section>

      {/* ==========================================
          CONTENIDO SOLO PARA USUARIOS SIN ACCESO
          ========================================== */}
      {!userState.hasAccess && (
        <>
      {/* PRUEBA SOCIAL – Datos duros: GB + Archivos (tangibilidad) */}
      <section className="py-10 px-4 md:px-6 border-b border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl md:text-2xl font-black text-bear-blue mb-2">
            Contenido del pack
          </h2>
          <div className="flex flex-wrap gap-4 mb-6 p-4 rounded-xl bg-white/5 border border-bear-blue/20">
            <span className="text-2xl md:text-3xl font-black text-bear-blue">{statsLoading ? '...' : totalSizeFormatted}</span>
            <span className="text-gray-400 self-center">·</span>
            <span className="text-2xl md:text-3xl font-black text-bear-blue">{statsLoading ? '...' : totalVideos.toLocaleString()} archivos</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {genres.filter((g) => g.id !== 'preview').map((genre) => (
              <Link
                key={`${genre.id}-${genre.name}`}
                href="/contenido"
                className="flex items-center justify-between gap-4 p-4 bg-white/5 border border-bear-blue/20 rounded-xl hover:border-bear-blue/50 hover:bg-white/10 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-bear-blue truncate">{genre.name}</h3>
                  <p className="text-sm text-gray-400">
                    {genre.videoCount} videos · {genre.totalSizeFormatted}
                  </p>
                </div>
                <span className="text-bear-blue text-xl shrink-0" aria-hidden>▶</span>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/contenido">
              <button className="bg-bear-blue text-bear-black font-black px-6 py-3 rounded-xl hover:opacity-90 transition">
                Ver todo el contenido →
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* STATS BAR – Tangibilidad: archivos, géneros, GB */}
      <section className="py-8 px-4 md:px-6 bg-white/[0.03] border-y border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl md:text-4xl font-black text-bear-blue tabular-nums">
              {statsLoading ? '...' : totalVideos.toLocaleString()}
            </div>
            <div className="text-xs md:text-sm text-gray-400">Archivos</div>
          </div>
          <div>
            <div className="text-2xl md:text-4xl font-black text-bear-blue tabular-nums">
              {statsLoading ? '...' : genreCount}
            </div>
            <div className="text-xs md:text-sm text-gray-400">Géneros</div>
          </div>
          <div>
            <div className="text-2xl md:text-4xl font-black text-bear-blue tabular-nums">
              {statsLoading ? '...' : totalSizeFormatted}
            </div>
            <div className="text-xs md:text-sm text-gray-400">De contenido</div>
          </div>
        </div>
      </section>

      {/* LOS 10 MÁS POPULARES – Carrusel con demos (prueba social) */}
      <section className="py-10 px-4 md:px-6 border-b border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl md:text-2xl font-black mb-2 text-bear-blue">
            Los 10 más populares
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Los más descargados por la comunidad. Haz clic para ver demo.
          </p>
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => popularCarouselRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
              className="hidden md:flex shrink-0 w-10 h-10 items-center justify-center rounded-full bg-bear-blue/20 text-bear-blue hover:bg-bear-blue/40 transition-colors"
            >
              ←
            </button>
            <div
              ref={popularCarouselRef}
              className="flex gap-4 overflow-x-auto overflow-y-hidden pb-2 scroll-smooth snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {(popularVideos.length > 0 ? popularVideos : genres.flatMap((g) => g.videos).slice(0, 10)).map((video) => (
                <div key={video.id} className="shrink-0 w-[180px] md:w-[200px] snap-start">
                  <VideoCard video={video} onSelect={() => setSelectedVideo(video)} />
                </div>
              ))}
            </div>
            <button
              type="button"
              aria-label="Siguiente"
              onClick={() => popularCarouselRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
              className="hidden md:flex shrink-0 w-10 h-10 items-center justify-center rounded-full bg-bear-blue/20 text-bear-blue hover:bg-bear-blue/40 transition-colors"
            >
              →
            </button>
          </div>
          {popularVideos.length === 0 && !loading && (
            <p className="text-gray-500 text-sm mt-2">Pronto aparecerán los más descargados.</p>
          )}
        </div>
      </section>

      {/* ÚLTIMA DESCARGA (solo si el usuario está logueado y tiene al menos una) */}
      {lastDownloaded && (
        <section className="py-6 px-4 bg-black/30 border-b border-white/5">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-lg font-bold text-bear-blue mb-3">Última descarga</h2>
            <div className="flex justify-start">
              <div className="w-[160px] md:w-[180px] shrink-0">
                <VideoCard video={lastDownloaded} onSelect={() => setSelectedVideo(lastDownloaded)} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FILTRO DE CUALIFICACIÓN – "¿Es para ti?" Dos columnas checkmarks vs X */}
      <section className="py-12 px-4 bg-white/[0.03] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-black text-center mb-8 text-white">
            ¿Es Bear Beat para ti?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Tarjeta SÍ – borde verde sutil + fondo negro suave */}
            <div className="bg-black/50 border-2 border-green-500/50 rounded-2xl p-6 h-full shadow-lg">
              <h3 className="text-lg font-bold text-green-400 mb-5 flex items-center gap-3">
                <span className="text-4xl md:text-5xl" aria-hidden>✅</span>
                Para ti si...
              </h3>
              <ul className="space-y-4 text-gray-300 text-sm">
                <li className="flex gap-3">
                  <span className="text-green-400 shrink-0 text-xl" aria-hidden>✅</span>
                  <span><strong className="text-white">Eres DJ de Eventos:</strong> Cobras por tu trabajo y necesitas material que suene y se vea profesional (HD/4K) en pantallas grandes.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-400 shrink-0 text-xl" aria-hidden>✅</span>
                  <span><strong className="text-white">Valoras tu tiempo:</strong> Prefieres pagar una vez y tener {statsLoading ? '...' : totalVideos.toLocaleString()} videos listos y organizados, en lugar de perder 50 horas ripeando de YouTube con mala calidad.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-400 shrink-0 text-xl" aria-hidden>✅</span>
                  <span><strong className="text-white">Buscas Organización:</strong> Quieres carpetas ordenadas por género, con BPM y Key, listas para arrastrar a Rekordbox, Serato o VirtualDJ.</span>
                </li>
              </ul>
            </div>
            {/* Tarjeta NO – borde rojo/gris sutil + fondo negro suave */}
            <div className="bg-black/50 border-2 border-red-500/40 rounded-2xl p-6 h-full shadow-lg">
              <h3 className="text-lg font-bold text-red-400 mb-5 flex items-center gap-3">
                <span className="text-4xl md:text-5xl" aria-hidden>❌</span>
                No es para ti si...
              </h3>
              <ul className="space-y-4 text-gray-300 text-sm">
                <li className="flex gap-3">
                  <span className="text-red-400 shrink-0 text-xl" aria-hidden>❌</span>
                  <span><strong className="text-white">Solo buscas 1 canción:</strong> Si solo necesitas el video de moda de esta semana, mejor búscalo en otro lado. Esto es un arsenal completo.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-400 shrink-0 text-xl" aria-hidden>❌</span>
                  <span><strong className="text-white">No usas laptop:</strong> Aunque puedes descargar en el celular, el pack es pesado ({statsLoading ? '...' : totalSizeFormatted}). Necesitas una PC/Mac para sacarle el jugo real.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-400 shrink-0 text-xl" aria-hidden>❌</span>
                  <span><strong className="text-white">Buscas &quot;gratis&quot;:</strong> La calidad y el soporte tienen un costo. Esto es una inversión para tu negocio, no un gasto.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PAIN POINTS – ¿Te identificas? */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-black text-center mb-12 text-white">
            ¿Te identificas con esto?
          </h2>
          <div className="space-y-4">
            {[
              { icon: '😩', text: 'Pasas HORAS buscando videos en YouTube y bajándolos en mala calidad' },
              { icon: '💸', text: 'Pagas múltiples suscripciones que juntas cuestan más de $500/mes' },
              { icon: '😱', text: 'Llegas al evento y el video no carga o se ve pixeleado' },
              { icon: '🤯', text: 'Tu competencia tiene videos que tú no encuentras en ningún lado' },
              { icon: '⏰', text: 'No tienes tiempo para editar y crear tus propios remixes' },
            ].map((pain, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 bg-white/5 border border-red-500/20 rounded-xl p-4 md:p-5 hover:border-red-500/40 transition-colors"
              >
                <span className="text-2xl md:text-3xl shrink-0">{pain.icon}</span>
                <p className="text-base md:text-lg text-gray-300">{pain.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUCIÓN – Adiós frustración (iconografía limpia) */}
      <section className="py-16 px-4 bg-gradient-to-b from-bear-blue/5 to-transparent border-y border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-4xl font-black mb-8 text-white">
            Con Bear Beat todo eso se acaba
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
            {[
              { icon: '⚡', title: 'Descarga instantánea', desc: `${statsLoading ? '...' : totalVideos.toLocaleString()} videos listos en minutos` },
              { icon: '🎯', title: 'Organizados por género', desc: `${statsLoading ? '...' : genreCount} categorías, BPM + Key` },
              { icon: '💎', title: 'Sin marcas de agua', desc: 'HD/4K calidad profesional' },
              { icon: '🔄', title: 'Web + FTP', desc: 'Descarga masiva cuando quieras' },
            ].map((benefit, i) => (
              <div key={i} className="bg-white/5 border border-bear-blue/20 rounded-xl p-5 md:p-6 text-left hover:border-bear-blue/40 transition-colors">
                <span className="text-2xl md:text-3xl mb-2 block">{benefit.icon}</span>
                <h3 className="font-bold text-lg mb-1 text-bear-blue">{benefit.title}</h3>
                <p className="text-gray-400 text-sm">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OFERTA IRRESISTIBLE – Price anchoring: $12,680 tachado vs $350 + garantía */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-4xl font-black mb-8 text-white">
            ¿Cuánto cuesta normalmente esto?
          </h2>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6 text-left">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-gray-400">Precio normal (valor real)</span>
              <span className="text-xl font-black text-red-400/90 line-through">$12,680 MXN</span>
            </div>
            <div className="flex justify-between items-center py-4">
              <span className="text-bear-blue font-bold">Tu precio hoy</span>
              <span className="text-4xl md:text-5xl font-black text-bear-blue">$350 MXN</span>
            </div>
          </div>

          <div className="relative rounded-3xl p-8 md:p-10 bg-gradient-to-b from-bear-blue/15 to-bear-blue/5 border-2 border-bear-blue/80 shadow-[0_0_40px_rgba(8,225,247,0.2)] ring-2 ring-bear-blue/40 ring-offset-4 ring-offset-bear-black mb-8">
            <p className="text-gray-400 text-sm uppercase tracking-wider mb-2">Pago único · Acceso de por vida</p>
            <div className="text-5xl md:text-7xl font-black text-bear-blue mb-3 drop-shadow-[0_0_20px_rgba(8,225,247,0.4)]">$350</div>
            <p className="text-gray-300 mb-4">MXN</p>
            <div className="flex items-center justify-center gap-2 text-green-400 font-semibold">
              <span className="text-2xl" aria-hidden>🛡️</span>
              <span>Garantía de 30 días: si no te gusta, te devolvemos todo.</span>
            </div>
          </div>

          <Link href="/checkout?pack=enero-2026" onClick={() => handleCTAClick('price')} className="block w-full sm:inline-block">
            <button className="w-full min-h-[52px] sm:min-h-[56px] bg-bear-blue text-bear-black font-black text-xl md:text-2xl px-10 py-5 rounded-2xl shadow-[0_0_30px_rgba(8,225,247,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all border-2 border-bear-blue">
              QUIERO MI ACCESO AHORA →
            </button>
          </Link>
        </div>
      </section>

      {/* ESCASEZ – Barra casi llena (85–99%), "próximas 50 licencias" / "% cupos vendidos" */}
      {!statsLoading && (
        <section className="py-8 px-4 bg-red-500/10 border-y border-red-500/30">
          <div className="max-w-xl mx-auto">
            <ScarcityBar sold={totalPurchases} />
          </div>
        </section>
      )}

      {/* GARANTÍA – Escudo dorado/seguro */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-white/5 border-2 border-green-500/50 rounded-3xl p-8 md:p-10">
            <span className="text-5xl md:text-6xl mb-4 block" aria-hidden>🛡️</span>
            <h2 className="text-2xl md:text-3xl font-black mb-4 text-white">Garantía de 30 Días</h2>
            <p className="text-gray-400 text-lg">
              Si no estás 100% satisfecho, te devolvemos tu dinero. Sin preguntas, sin complicaciones.
            </p>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS – Prueba social */}
      <section className="py-16 px-4 bg-white/[0.03] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-black text-center mb-12 text-white">
            Lo que dicen los DJs
          </h2>
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {[
              { name: 'DJ Carlos', city: 'CDMX', text: 'Pensé que era demasiado bueno. Pagué y en 5 minutos ya estaba descargando por FTP. ¡Increíble!' },
              { name: 'DJ María', city: 'Monterrey', text: 'Tengo 3 suscripciones de video pools. Con Bear Beat me ahorro $400/mes y tengo mejor contenido.' },
              { name: 'DJ Roberto', city: 'Guadalajara', text: 'El FTP es una maravilla. Dejé descargando todo la noche y al día siguiente tenía todo listo.' },
            ].map((t, i) => (
              <div key={i} className="bg-white/5 border border-bear-blue/20 rounded-2xl p-6 hover:border-bear-blue/40 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-bear-blue/20 rounded-full flex items-center justify-center font-bold text-bear-blue">{t.name[3]}</div>
                  <div>
                    <p className="font-bold text-white">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.city}</p>
                  </div>
                </div>
                <p className="text-yellow-400 text-sm mb-2">⭐⭐⭐⭐⭐</p>
                <p className="text-gray-400 text-sm italic">"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CIERRE LÓGICO – Tabla comparativa + CTA final */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent to-bear-blue/10 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-8 text-white">
            Decisión simple
          </h2>
          <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-10">
            <div className="bg-red-500/10 border-2 border-red-500/40 rounded-2xl p-6 text-left">
              <h3 className="text-xl font-bold text-red-400 mb-4">Sin Bear Beat</h3>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Seguir buscando videos por horas</li>
                <li>• Pagar múltiples suscripciones</li>
                <li>• Quedarte atrás de la competencia</li>
                <li>• Videos de mala calidad</li>
              </ul>
            </div>
            <div className="bg-green-500/10 border-2 border-green-500/40 rounded-2xl p-6 text-left">
              <h3 className="text-xl font-bold text-green-400 mb-4">Con Bear Beat</h3>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• {statsLoading ? '...' : totalVideos.toLocaleString()} videos descargados hoy</li>
                <li>• Un solo pago de $350</li>
                <li>• Arsenal profesional completo</li>
                <li>• Calidad HD garantizada</li>
              </ul>
            </div>
          </div>

          <Link href="/checkout?pack=enero-2026" onClick={() => handleCTAClick('final')} className="block w-full sm:inline-block">
            <button className="w-full min-h-[56px] md:min-h-[64px] bg-bear-blue text-bear-black font-black text-xl md:text-3xl px-10 py-6 rounded-2xl shadow-[0_0_30px_rgba(8,225,247,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all border-2 border-bear-blue">
              SÍ, QUIERO MIS {statsLoading ? '...' : totalVideos.toLocaleString()} VIDEOS →
            </button>
          </Link>
          <p className="text-sm text-gray-400 mt-4">
            🔒 Pago seguro · ⚡ Acceso inmediato · 🛡️ Garantía 30 días
          </p>
        </div>
      </section>
        </>
      )}

      {/* FOOTER */}
      <footer className="py-8 px-4 border-t border-bear-blue/20">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png" alt="Bear Beat" width={30} height={30} />
              <span className="font-bold text-bear-blue">BEAR BEAT</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="/terminos" className="hover:text-white">Términos</Link>
              <Link href="/privacidad" className="hover:text-white">Privacidad</Link>
              <Link href="/reembolsos" className="hover:text-white">Reembolsos</Link>
            </div>
            <p className="text-xs text-gray-600">© 2026 Bear Beat. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Sticky CTA móvil – thumb-friendly (min 48px touch target) */}
      {!userState.hasAccess && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-bear-blue border-t-2 border-bear-black p-3 safe-area-pb">
          <Link href="/checkout?pack=enero-2026" onClick={() => handleCTAClick('sticky_mobile')} className="block w-full">
            <button className="w-full min-h-[52px] bg-bear-black text-bear-blue font-black text-lg py-4 rounded-xl active:scale-[0.98] transition-transform">
              Comprar ahora · $350 MXN
            </button>
          </Link>
        </div>
      )}

      {/* MODAL DE DEMO */}
      <AnimatePresence>
        {selectedVideo && (
          <DemoPlayer 
            video={selectedVideo} 
            onClose={() => setSelectedVideo(null)} 
            hasAccess={userState.hasAccess}
            cdnBaseUrl={cdnBaseUrl}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
