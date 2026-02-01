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

// Reproductor de demo inline
function DemoPlayer({ video, onClose, hasAccess = false }: { video: Video; onClose: () => void; hasAccess?: boolean }) {
  const [downloading, setDownloading] = useState(false)
  
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
          <video
            src={hasAccess ? `/api/download?file=${encodeURIComponent(video.path)}&stream=true` : `/api/demo/${encodeURIComponent(video.path)}`}
            className="w-full h-full"
            controls
            autoPlay
            controlsList={hasAccess ? undefined : "nodownload"}
            disablePictureInPicture={!hasAccess}
          />
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
  const [activeGenre, setActiveGenre] = useState<string | null>(null)
  
  // Estado del usuario
  const [userState, setUserState] = useState<UserState>({
    isLoggedIn: false,
    hasAccess: false
  })

  // Inventario en tiempo real desde Supabase (tabla videos)
  const inventory = useVideoInventory()

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
      const res = await fetch('/api/videos')
      const data = await res.json()
      if (data.success) {
        setGenres(data.genres)
        setPackInfo(data.pack)
        if (data.genres.length > 0) {
          setActiveGenre(data.genres[0].id)
        }
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

  // Obtener videos del género activo
  const activeGenreData = genres.find(g => g.id === activeGenre)

  return (
    <div className={`min-h-screen bg-bear-black text-white ${!userState.hasAccess ? 'pb-20 md:pb-0' : ''}`}>
      {/* BANNER SUPERIOR - DIFERENTE SEGÚN ESTADO */}
      {userState.hasAccess ? (
        // ==========================================
        // BANNER PARA USUARIOS CON ACCESO
        // ==========================================
        <div className="bg-gradient-to-r from-bear-blue via-cyan-500 to-bear-blue py-3 md:py-4 px-4">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
            <p className="text-bear-black font-bold text-sm md:text-base">
              🎉 ¡Hola{userState.userName ? `, ${userState.userName}` : ''}! Ya tienes acceso completo
            </p>
            <div className="flex gap-2">
              <Link href="/dashboard">
                <button className="bg-bear-black text-bear-blue px-4 py-2 rounded-lg text-sm font-bold hover:bg-bear-black/80 transition">
                  📊 Mi Panel
                </button>
              </Link>
              <Link href="/contenido">
                <button className="bg-white text-bear-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-white/90 transition">
                  ⬇️ Descargar Videos
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

      {/* NAVBAR */}
      <header className="py-4 md:py-6 px-4 border-b border-bear-blue/20">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image 
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat" width={50} height={50} className="w-10 h-10 md:w-12 md:h-12"
            />
            <span className="text-xl md:text-2xl font-black text-bear-blue">BEAR BEAT</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/contenido" className="text-white/70 hover:text-bear-blue font-medium">
              👁️ Ver Contenido
            </Link>
            {userState.hasAccess ? (
              <>
                <Link href="/dashboard" className="text-bear-blue font-bold hover:text-white transition">
                  📊 Mi Panel
                </Link>
                <Link href="/mi-cuenta" className="text-white/70 hover:text-bear-blue font-medium">
                  Mi cuenta
                </Link>
                <span className="bg-bear-blue/20 text-bear-blue px-3 py-1 rounded-full font-bold text-xs">
                  ✓ Acceso Activo
                </span>
              </>
            ) : (
              <>
                <span className="text-bear-blue font-bold">+2,847 DJs ya tienen acceso</span>
                {userState.isLoggedIn ? (
                  <>
                    <Link href="/dashboard" className="text-white/70 hover:text-bear-blue">Mi Panel</Link>
                    <Link href="/mi-cuenta" className="text-white/70 hover:text-bear-blue">Mi cuenta</Link>
                  </>
                ) : (
                  <Link href="/login" className="text-white/70 hover:text-bear-blue">Iniciar Sesión</Link>
                )}
              </>
            )}
          </div>
          
          {/* Menú móvil */}
          <MobileMenu currentPath="/" userHasAccess={userState.hasAccess} isLoggedIn={userState.isLoggedIn} />
        </div>
      </header>

      {/* HERO SECTION - DIFERENTE SEGÚN ESTADO */}
      <section className="py-12 md:py-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-bear-blue/10 rounded-full blur-[150px] pointer-events-none" />
        
        {userState.hasAccess ? (
          // ==========================================
          // HERO PARA USUARIOS CON ACCESO
          // ==========================================
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/50 text-green-400 px-6 py-3 rounded-full text-lg font-bold mb-6"
            >
              ✅ ¡Tu acceso está activo!
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.1 }} 
              className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight mb-6"
            >
              Tienes acceso a{' '}
              <span className="text-bear-blue">{inventory.loading ? '...' : inventory.count.toLocaleString()} Video Remixes</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }} 
              className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto"
            >
              Tus videos están listos para descargar. Elige cómo quieres acceder:
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link href="/contenido">
                <button className="bg-bear-blue text-bear-black font-black text-xl px-10 py-5 rounded-2xl shadow-2xl shadow-bear-blue/30 hover:scale-105 transition-all flex items-center gap-3">
                  <span className="text-2xl">⬇️</span>
                  DESCARGAR VIDEOS
                </button>
              </Link>
              <Link href="/dashboard">
                <button className="bg-white/10 border-2 border-bear-blue text-bear-blue font-bold text-xl px-10 py-5 rounded-2xl hover:bg-bear-blue/20 transition-all flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  MI PANEL
                </button>
              </Link>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.5 }}
              className="mt-8 flex justify-center gap-6 text-sm text-gray-400"
            >
              <span>✓ Descarga por navegador</span>
              <span>✓ Descarga por FTP</span>
              <span>✓ Soporte 24/7</span>
            </motion.div>
          </div>
        ) : (
          // ==========================================
          // HERO PARA NUEVOS USUARIOS
          // ==========================================
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-bear-blue font-bold text-base md:text-lg mb-4">
              ATENCIÓN DJs: Esto es lo que necesitas para dominar 2026
            </motion.p>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-3xl md:text-5xl lg:text-7xl font-black leading-tight mb-6">
              Descarga{' '}
              <span className="text-bear-blue">{inventory.loading ? '...' : inventory.count.toLocaleString()} Video Remixes</span>
              {' '}en HD y Cobra Como Profesional
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg md:text-xl lg:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              El arsenal completo de videos que usan los DJs que cobran{' '}
              <strong className="text-white">$15,000+ por evento</strong>. 
              Organizados en <strong className="text-bear-blue">{inventory.loading ? '...' : inventory.genreCount} géneros</strong>, listos para usar HOY.
            </motion.p>

            {/* PRECIO GIGANTE VISIBLE */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="mb-8">
              <p className="text-6xl md:text-8xl font-black text-bear-blue mb-2">
                $350<span className="text-3xl md:text-4xl">MXN</span>
              </p>
              <p className="text-gray-400 line-through text-xl mb-2">Precio normal: $1,499</p>
              <p className="text-green-400 font-bold text-lg">Ahorro: $1,149 (77% OFF)</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="mb-8">
              <p className="text-red-400 font-bold mb-3 text-sm md:text-base">⏰ OFERTA LIMITADA</p>
              <p className="text-gray-400 text-sm">Últimos {1000 - 847} lugares disponibles</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Link href="/checkout?pack=enero-2026" onClick={() => handleCTAClick('hero')}>
                <button className="bg-bear-blue text-bear-black font-black text-2xl md:text-4xl px-16 py-8 md:py-10 rounded-3xl shadow-2xl shadow-bear-blue/30 hover:scale-105 transition-all">
                  SÍ, QUIERO ACCESO AHORA →
                </button>
              </Link>
              <p className="text-sm md:text-base text-gray-400 mt-6 font-bold">✓ Acceso inmediato · ✓ Pago seguro · ✓ Garantía 30 días</p>
            </motion.div>
          </div>
        )}
      </section>

      {/* ==========================================
          CONTENIDO SOLO PARA USUARIOS SIN ACCESO
          ========================================== */}
      {!userState.hasAccess && (
        <>
      {/* STATS BAR - DATOS REALES */}
      <section className="py-8 px-4 bg-bear-blue/10 border-y border-bear-blue/30">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl md:text-4xl font-black text-bear-blue">
              {inventory.loading ? '...' : inventory.count.toLocaleString()}
            </div>
            <div className="text-xs md:text-sm text-gray-400">Video Remixes</div>
          </div>
          <div>
            <div className="text-2xl md:text-4xl font-black text-bear-blue">
              {inventory.loading ? '...' : inventory.genreCount}
            </div>
            <div className="text-xs md:text-sm text-gray-400">Géneros</div>
          </div>
          <div>
            <div className="text-2xl md:text-4xl font-black text-bear-blue">
              {inventory.loading ? '...' : inventory.totalSizeFormatted}
            </div>
            <div className="text-xs md:text-sm text-gray-400">De Contenido</div>
          </div>
        </div>
      </section>

      {/* ==========================================
          PREVIEW DE VIDEOS - DATOS REALES
          ========================================== */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              👀 Mira lo que vas a recibir
            </h2>
            <p className="text-gray-400 text-lg">
              Videos reales del pack. Haz clic para ver un demo.
            </p>
          </div>

          {/* Tabs de géneros */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {genres.map((genre) => (
              <button
                key={genre.id}
                onClick={() => setActiveGenre(genre.id)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  activeGenre === genre.id
                    ? 'bg-bear-blue text-bear-black'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {GENRE_ICONS[genre.id] || GENRE_ICONS.default} {genre.name}
                <span className="ml-2 text-xs opacity-70">({genre.videoCount})</span>
              </button>
            ))}
          </div>

          {/* Grid de videos del género activo */}
          {activeGenreData && (
            <motion.div 
              key={activeGenre}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {activeGenreData.videos.slice(0, 8).map((video) => (
                <motion.div
                  key={video.id}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => setSelectedVideo(video)}
                  className="bg-white/5 rounded-xl overflow-hidden cursor-pointer group border border-transparent hover:border-bear-blue/50"
                >
                  {/* Thumbnail REAL del video */}
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
                        <span className="text-4xl opacity-50">🎬</span>
                      </div>
                    )}
                    {/* Overlay de play */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-14 h-14 bg-bear-blue rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-2xl ml-1">▶</span>
                      </div>
                    </div>
                    {/* Duración */}
                    {video.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs font-mono">
                        {video.duration}
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <p className="font-bold text-sm truncate">{video.artist}</p>
                    <p className="text-xs text-gray-500 truncate">{video.title}</p>
                    <div className="flex gap-1 mt-2">
                      {video.key && <span className="bg-purple-500/30 px-2 py-0.5 rounded text-[10px]">{video.key}</span>}
                      {video.bpm && <span className="bg-green-500/30 px-2 py-0.5 rounded text-[10px]">{video.bpm}</span>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Ver más */}
          <div className="text-center mt-8">
            <Link href="/contenido">
              <button className="bg-white/10 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/20">
                Ver los {inventory.loading ? '...' : inventory.count.toLocaleString()} videos completos →
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ==========================================
          GÉNEROS DISPONIBLES - DATOS REALES
          ========================================== */}
      <section className="py-16 px-4 bg-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              🎵 Todos los géneros que necesitas
            </h2>
            <p className="text-gray-400 text-lg">
              Contenido real organizado por género
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {genres.map((genre) => (
              <motion.div
                key={genre.id}
                whileHover={{ scale: 1.02 }}
                className="bg-bear-black border border-bear-blue/30 rounded-2xl p-5 text-center hover:border-bear-blue"
              >
                <span className="text-4xl mb-3 block">{GENRE_ICONS[genre.id] || GENRE_ICONS.default}</span>
                <h3 className="font-black text-lg text-bear-blue">{genre.name}</h3>
                <p className="text-3xl font-black my-2">{genre.videoCount}</p>
                <p className="text-xs text-gray-500">videos • {genre.totalSizeFormatted}</p>
              </motion.div>
            ))}
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
              { icon: '⚡', title: 'Descarga instantánea', desc: `${inventory.loading ? '...' : inventory.count.toLocaleString()} videos listos en minutos` },
              { icon: '🎯', title: 'Organizados por género', desc: `${inventory.loading ? '...' : inventory.genreCount} categorías para encontrar rápido` },
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
          
          <div className="space-y-3 mb-8">
            {[
              { item: `${inventory.loading ? '...' : inventory.count.toLocaleString()} videos a $10 c/u`, price: `$${((inventory.loading ? 0 : inventory.count) * 10).toLocaleString()}` },
              { item: 'Suscripción a pools de videos (anual)', price: '$2,400' },
              { item: 'Tiempo buscando y descargando (40hrs)', price: '$4,000' },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center bg-white/5 rounded-lg p-4">
                <span className="text-gray-400">{row.item}</span>
                <span className="font-bold text-red-400 line-through">{row.price}</span>
              </div>
            ))}
          </div>

          <p className="text-xl text-gray-400 mb-4">Valor total: <span className="text-red-400 line-through font-bold">$8,000+ MXN</span></p>
          
          <div className="bg-gradient-to-r from-bear-blue/20 to-cyan-500/20 border-2 border-bear-blue rounded-3xl p-8 mb-8">
            <p className="text-lg text-gray-400 mb-2">Tu precio hoy:</p>
            <div className="text-6xl md:text-8xl font-black text-bear-blue mb-2">$350</div>
            <p className="text-xl text-gray-400">MXN • Pago único • Acceso de por vida</p>
          </div>

          <Link href="/checkout?pack=enero-2026" onClick={() => handleCTAClick('price')}>
            <button className="bg-bear-blue text-bear-black font-black text-xl md:text-2xl px-12 py-6 rounded-2xl shadow-2xl hover:scale-105 transition-all">
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
                <li>• {inventory.loading ? '...' : inventory.count.toLocaleString()} videos descargados hoy</li>
                <li>• Un solo pago de $350</li>
                <li>• Arsenal profesional completo</li>
                <li>• Calidad HD garantizada</li>
              </ul>
            </div>
          </div>
          
          <Link href="/checkout?pack=enero-2026" onClick={() => handleCTAClick('final')}>
            <button className="bg-bear-blue text-bear-black font-black text-xl md:text-3xl px-12 py-8 rounded-2xl shadow-2xl hover:scale-105 transition-all animate-pulse">
              SÍ, QUIERO MIS {inventory.loading ? '...' : inventory.count.toLocaleString()} VIDEOS →
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
          />
        )}
      </AnimatePresence>
    </div>
  )
}
