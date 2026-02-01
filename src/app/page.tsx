'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trackCTAClick, trackPageView } from '@/lib/tracking'
import { getDemoCdnUrl } from '@/lib/utils'
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

function ScarcityBar({ sold, total }: { sold: number; total: number }) {
  const percentage = (sold / total) * 100
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2">
        <span className="font-bold text-red-500">⚠️ {total - sold} lugares disponibles</span>
        <span className="text-gray-400">{sold}/{total} vendidos</span>
      </div>
      <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
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

// Reproductor de demo inline — URL directa a Bunny CDN (BUNNY_CDN_URL o NEXT_PUBLIC_BUNNY_CDN_URL)
function DemoPlayer({ video, onClose, hasAccess = false, cdnBaseUrl }: { video: Video; onClose: () => void; hasAccess?: boolean; cdnBaseUrl?: string | null }) {
  const [downloading, setDownloading] = useState(false)
  const [demoError, setDemoError] = useState(false)
  const demoSrc = hasAccess ? `/api/download?file=${encodeURIComponent(video.path)}&stream=true` : getDemoCdnUrl(video.path, cdnBaseUrl)
  
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="relative w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cerrar */}
        <button onClick={onClose} className="absolute -top-12 right-0 text-white text-xl hover:text-bear-blue">
          ✕ Cerrar
        </button>

        {/* Video con watermark (solo si no tiene acceso) */}
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden">
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
            className="w-full h-full"
            controls
            autoPlay
            controlsList={hasAccess ? undefined : "nodownload"}
            disablePictureInPicture={!hasAccess}
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

const GENRE_ICONS: Record<string, string> = {
  bachata: '💃', cubaton: '🇨🇺', cumbia: '🎺', dembow: '🔥',
  merengue: '🎹', reggaeton: '🎤', salsa: '💫', pop: '🎵',
  rock: '🎸', electronica: '💿', default: '🎬'
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================
export default function HomePage() {
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
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [cdnBaseUrl, setCdnBaseUrl] = useState<string | null>(null)

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
      const res = await fetch('/api/videos?pack=enero-2026')
      const data = await res.json()
      if (data.success) {
        setGenres(data.genres)
        setPackInfo(data.pack)
      }
    } catch (error) {
      // Inventario sigue viniendo de useVideoInventory (Supabase)
    } finally {
      setLoading(false)
    }
  }

  const handleCTAClick = (location: string) => {
    trackCTAClick('comprar_oferta', location, 'lanzamiento_2026')
  }

  // Una sola fuente de verdad: packInfo (mismo fetch que la lista). Fallback a inventory y luego a defaults para enero-2026 (evita "..." en cold start / API lenta).
  const PACK_DEFAULTS = { totalVideos: 1000, genreCount: 17, totalSizeFormatted: '141.28 GB' }
  const totalVideos = packInfo?.totalVideos ?? inventory.count ?? PACK_DEFAULTS.totalVideos
  const genreCount = packInfo?.genreCount ?? inventory.genreCount ?? PACK_DEFAULTS.genreCount
  const totalSizeFormatted = packInfo?.totalSizeFormatted ?? inventory.totalSizeFormatted ?? PACK_DEFAULTS.totalSizeFormatted
  const statsLoading = !statsTimedOut && ((loading && !packInfo) || inventory.loading)

  return (
    <div className={`min-h-screen bg-bear-black text-white ${!userState.hasAccess ? 'pb-20 md:pb-0' : ''}`}>
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
      <header className="sticky top-0 z-50 py-3 md:py-4 px-4 border-b border-white/10 bg-bear-black/95 backdrop-blur-sm">
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
      <section className="py-16 md:py-24 lg:py-28 px-4 relative overflow-hidden">
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
          // HERO PARA NUEVOS USUARIOS
          // ==========================================
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-4 bg-gradient-to-r from-white via-gray-200 to-bear-blue/90 bg-clip-text text-transparent">
              1,000 videos HD para DJs. Un pago. Descarga hoy.
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-lg md:text-xl text-gray-300 mb-6 max-w-2xl mx-auto">
              El mismo tipo de contenido que usan los DJs Pro. Organizado por género (BPM + Key incluidos). Listo para usar.
            </motion.p>

            {/* 3 bullets antes del CTA */}
            <motion.ul initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="list-none space-y-2 mb-6 text-left max-w-md mx-auto">
              <li className="flex items-center gap-2 text-gray-200">
                <span className="text-bear-blue">✓</span> {statsLoading ? '...' : totalVideos.toLocaleString()} remixes HD
              </li>
              <li className="flex items-center gap-2 text-gray-200">
                <span className="text-bear-blue">✓</span> Descarga Web + FTP
              </li>
              <li className="flex items-center gap-2 text-gray-200">
                <span className="text-bear-blue">✓</span> Pago único $350 MXN
              </li>
            </motion.ul>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Link href="/checkout?pack=enero-2026" onClick={() => handleCTAClick('hero')}>
                <button className="bg-bear-blue text-bear-black font-black text-xl md:text-3xl px-12 py-6 md:py-8 rounded-3xl shadow-2xl shadow-bear-blue/30 hover:scale-105 transition-all">
                  QUIERO ACCESO AHORA →
                </button>
              </Link>
              <p className="text-sm text-gray-500 mt-4">Pago seguro (Stripe) · Garantía 30 días</p>
            </motion.div>
          </div>
        )}
      </section>

      {/* ==========================================
          CONTENIDO SOLO PARA USUARIOS SIN ACCESO
          ========================================== */}
      {!userState.hasAccess && (
        <>
      {/* MARQUEE GÉNEROS - justo debajo del Hero */}
      <section className="py-6 px-4 overflow-hidden">
        <div className="overflow-hidden select-none">
          <div className="flex w-max animate-marquee">
            {[...genres, ...genres].map((genre) => (
              <div
                key={`${genre.id}-${genre.name}`}
                className="flex-shrink-0 mx-2 w-[140px] md:w-[160px] bg-bear-black border border-bear-blue/30 rounded-2xl p-4 text-center hover:border-bear-blue/60 transition-colors"
              >
                <span className="text-3xl mb-2 block">{GENRE_ICONS[genre.id] || GENRE_ICONS.default}</span>
                <h3 className="font-black text-sm text-bear-blue">{genre.name}</h3>
                <p className="text-xl font-black my-1">{genre.videoCount}</p>
                <p className="text-[10px] text-gray-500">videos</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS BAR - DATOS REALES */}
      <section className="py-8 px-4 bg-bear-blue/10 border-y border-bear-blue/30">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl md:text-4xl font-black text-bear-blue">
              {statsLoading ? '...' : totalVideos.toLocaleString()}
            </div>
            <div className="text-xs md:text-sm text-gray-400">Video Remixes</div>
          </div>
          <div>
            <div className="text-2xl md:text-4xl font-black text-bear-blue">
              {statsLoading ? '...' : genreCount}
            </div>
            <div className="text-xs md:text-sm text-gray-400">Géneros</div>
          </div>
          <div>
            <div className="text-2xl md:text-4xl font-black text-bear-blue">
              {statsLoading ? '...' : totalSizeFormatted}
            </div>
            <div className="text-xs md:text-sm text-gray-400">De Contenido</div>
          </div>
        </div>
      </section>

      {/* ==========================================
          PREVIEW DE VIDEOS - 6 TARJETAS + PDF
          ========================================== */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-4xl font-black mb-2">
              👀 Mira lo que vas a recibir
            </h2>
            <p className="text-gray-400 text-sm md:text-base">
              Demos del pack. Haz clic para ver.
            </p>
          </div>

          {/* Grid de 6 tarjetas de video (demos principales) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {genres.flatMap((g) => g.videos).slice(0, 6).map((video) => (
              <motion.div
                key={video.id}
                whileHover={{ scale: 1.03 }}
                onClick={() => setSelectedVideo(video)}
                className="bg-white/5 rounded-xl overflow-hidden cursor-pointer group border border-transparent hover:border-bear-blue/50"
              >
                <div className="aspect-video bg-gray-900 relative overflow-hidden">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.artist}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-bear-blue/20 to-purple-500/20 flex items-center justify-center">
                      <span className="text-3xl opacity-50">🎬</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 bg-bear-blue rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-xl ml-1">▶</span>
                    </div>
                  </div>
                  {video.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs font-mono">
                      {video.duration}
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="font-bold text-xs truncate">{video.artist}</p>
                  <p className="text-[10px] text-gray-500 truncate">{video.title}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-center">
            <a
              href="/api/tracks-pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-bear-blue transition underline underline-offset-2"
            >
              Ver listado completo de tracks (PDF)
            </a>
          </p>
        </div>
      </section>

      {/* ==========================================
          ¿ES BEAR BEAT PARA TI? – 2 columnas tipo card, iconos grandes
          ========================================== */}
      <section className="py-12 px-4 bg-black/40 border-y border-white/10">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-black text-center mb-8">
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
                  <span><strong className="text-white">Valoras tu tiempo:</strong> Prefieres pagar una vez y tener 1,000 videos listos y organizados, en lugar de perder 50 horas ripeando de YouTube con mala calidad.</span>
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
                  <span><strong className="text-white">No usas laptop:</strong> Aunque puedes descargar en el celular, el pack es pesado (141 GB). Necesitas una PC/Mac para sacarle el jugo real.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-400 shrink-0 text-xl" aria-hidden>❌</span>
                  <span><strong className="text-white">Buscas &quot;gratis&quot;:</strong> La calidad, los servidores rápidos y el soporte tienen un costo. Esto es una inversión para tu negocio, no un gasto.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PAIN POINTS */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-black text-center mb-12">
            😤 ¿Te identificas con esto?
          </h2>
          <div className="space-y-6">
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
                className="flex items-center gap-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4"
              >
                <span className="text-3xl">{pain.icon}</span>
                <p className="text-lg">{pain.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="py-16 px-4 bg-gradient-to-b from-bear-blue/10 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-4xl font-black mb-8">
            ✅ Con Bear Beat todo eso se acaba
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: '⚡', title: 'Descarga instantánea', desc: `${statsLoading ? '...' : totalVideos.toLocaleString()} videos listos en minutos` },
              { icon: '🎯', title: 'Organizados por género', desc: `${statsLoading ? '...' : genreCount} categorías para encontrar rápido` },
              { icon: '💎', title: 'Calidad profesional', desc: 'HD/4K sin marcas de agua' },
              { icon: '🔄', title: 'Descarga ilimitada', desc: 'Web + FTP para descarga masiva' },
            ].map((benefit, i) => (
              <div key={i} className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-left">
                <span className="text-3xl mb-3 block">{benefit.icon}</span>
                <h3 className="font-bold text-lg mb-2">{benefit.title}</h3>
                <p className="text-gray-400">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICE REVEAL */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-4xl font-black mb-6">
            💰 ¿Cuánto cuesta normalmente esto?
          </h2>
          
          <div className="space-y-2 mb-6 text-left max-w-md mx-auto">
            {[
              { item: `${statsLoading ? '...' : totalVideos.toLocaleString()} videos a $10 c/u`, price: `$${((statsLoading ? 0 : totalVideos) * 10).toLocaleString()}` },
              { item: 'Suscripción pools (anual)', price: '$2,400' },
              { item: '40 hrs buscando/descargando', price: '$4,000' },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center text-sm text-gray-400">
                <span>{row.item}</span>
                <span className="font-bold text-red-400/80 line-through">{row.price}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-sm mb-8">Valor total: <span className="line-through">$8,000+ MXN</span></p>
          
          {/* Tarjeta ganadora: $350 con borde brillante y glow */}
          <div className="relative rounded-3xl p-8 md:p-10 bg-gradient-to-b from-bear-blue/15 to-bear-blue/5 border-2 border-bear-blue/80 shadow-[0_0_40px_rgba(8,225,247,0.25)] ring-2 ring-bear-blue/40 ring-offset-4 ring-offset-bear-black mb-8">
            <p className="text-gray-400 text-sm uppercase tracking-wider mb-2">Tu precio hoy</p>
            <div className="text-5xl md:text-7xl font-black text-bear-blue mb-2 drop-shadow-[0_0_20px_rgba(8,225,247,0.5)]">$350</div>
            <p className="text-gray-300 mb-4">MXN • Pago único • Acceso de por vida</p>
            <p className="text-sm text-green-400 font-semibold">🛡️ Garantía 30 días: si no te gusta, te devolvemos todo.</p>
          </div>

          <Link href="/checkout?pack=enero-2026" onClick={() => handleCTAClick('price')}>
            <button className="bg-bear-blue text-bear-black font-black text-xl md:text-2xl px-12 py-6 rounded-2xl shadow-2xl shadow-bear-blue/30 hover:scale-105 transition-all">
              QUIERO MI ACCESO AHORA →
            </button>
          </Link>
        </div>
      </section>

      {/* SCARCITY */}
      <section className="py-8 px-4 bg-red-500/10 border-y border-red-500/30">
        <div className="max-w-xl mx-auto">
          <ScarcityBar sold={847} total={1000} />
        </div>
      </section>

      {/* GUARANTEE */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-green-500/10 border-2 border-green-500/50 rounded-3xl p-8">
            <span className="text-6xl mb-4 block">🛡️</span>
            <h2 className="text-2xl md:text-3xl font-black mb-4">Garantía de 30 Días</h2>
            <p className="text-gray-400 text-lg">
              Si no estás 100% satisfecho, te devolvemos tu dinero. Sin preguntas, sin complicaciones.
            </p>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-16 px-4 bg-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-black text-center mb-12">
            ⭐ Lo que dicen los DJs
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'DJ Carlos', city: 'CDMX', text: 'Pensé que era demasiado bueno. Pagué y en 5 minutos ya estaba descargando por FTP. ¡Increíble!' },
              { name: 'DJ María', city: 'Monterrey', text: 'Tengo 3 suscripciones de video pools. Con Bear Beat me ahorro $400/mes y tengo mejor contenido.' },
              { name: 'DJ Roberto', city: 'Guadalajara', text: 'El FTP es una maravilla. Dejé descargando todo la noche y al día siguiente tenía todo listo.' },
            ].map((t, i) => (
              <div key={i} className="bg-bear-black border border-bear-blue/30 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-bear-blue/20 rounded-full flex items-center justify-center font-bold">{t.name[3]}</div>
                  <div>
                    <p className="font-bold">{t.name}</p>
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

      {/* FINAL CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent to-bear-blue/20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-6">
            🎯 Decisión Simple
          </h2>
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-red-400 mb-4">❌ Sin Bear Beat</h3>
              <ul className="text-left text-gray-400 space-y-2 text-sm">
                <li>• Seguir buscando videos por horas</li>
                <li>• Pagar múltiples suscripciones</li>
                <li>• Quedarte atrás de la competencia</li>
                <li>• Videos de mala calidad</li>
              </ul>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-green-400 mb-4">✅ Con Bear Beat</h3>
              <ul className="text-left text-gray-400 space-y-2 text-sm">
                <li>• {statsLoading ? '...' : totalVideos.toLocaleString()} videos descargados hoy</li>
                <li>• Un solo pago de $350</li>
                <li>• Arsenal profesional completo</li>
                <li>• Calidad HD garantizada</li>
              </ul>
            </div>
          </div>
          
          <Link href="/checkout?pack=enero-2026" onClick={() => handleCTAClick('final')}>
            <button className="bg-bear-blue text-bear-black font-black text-xl md:text-3xl px-12 py-8 rounded-2xl shadow-2xl hover:scale-105 transition-all animate-pulse">
              SÍ, QUIERO MIS {statsLoading ? '...' : totalVideos.toLocaleString()} VIDEOS →
            </button>
          </Link>
          <p className="text-sm text-gray-500 mt-4">
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

      {/* Sticky CTA móvil: precio siempre visible */}
      {!userState.hasAccess && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-bear-blue border-t-2 border-bear-black p-3 safe-area-pb">
          <Link href="/checkout?pack=enero-2026" onClick={() => handleCTAClick('sticky_mobile')} className="block w-full">
            <button className="w-full bg-bear-black text-bear-blue font-black text-lg py-4 rounded-xl">
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
