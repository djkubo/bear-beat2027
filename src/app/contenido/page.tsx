'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { trackCTAClick, trackPageView } from '@/lib/tracking'
import { getDemoCdnUrl } from '@/lib/utils'
import { MobileMenu } from '@/components/ui/MobileMenu'
import { createClient } from '@/lib/supabase/client'
import { useVideoInventory } from '@/lib/hooks/useVideoInventory'

// ==========================================
// PÁGINA DE CONTENIDO - Diseño Persuasivo
// Videos reproducibles + Paywall inteligente
// ==========================================

interface Video {
  id: string
  name: string
  displayName: string
  artist: string
  title: string
  key?: string
  bpm?: string
  size: number
  sizeFormatted: string
  path: string
  genre: string
  canPreview: boolean
  canDownload: boolean
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

export default function ContenidoPage() {
  const [genres, setGenres] = useState<Genre[]>([])
  const [packInfo, setPackInfo] = useState<PackInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedGenre, setExpandedGenre] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [hasAccess, setHasAccess] = useState(false)
  const [posterError, setPosterError] = useState(false)
  const [demoError, setDemoError] = useState(false)
  const [cdnBaseUrl, setCdnBaseUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const inventory = useVideoInventory()

  useEffect(() => {
    setPosterError(false)
    setDemoError(false)
  }, [selectedVideo?.id])

  useEffect(() => {
    trackPageView('contenido')
    verificarAcceso()
    loadVideos()
  }, [])

  // Base URL del CDN Bunny (BUNNY_CDN_URL) — el front no ve esa variable, la pedimos al API
  useEffect(() => {
    fetch('/api/cdn-base')
      .then((res) => res.json())
      .then((data) => typeof data?.baseUrl === 'string' && data.baseUrl && setCdnBaseUrl(data.baseUrl))
      .catch(() => {})
  }, [])

  const verificarAcceso = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: purchases } = await supabase
          .from('purchases')
          .select('*')
          .eq('user_id', user.id)

        const hasUserAccess = Boolean(purchases && purchases.length > 0)
        setHasAccess(hasUserAccess)
        
        console.log('🔍 CONTENIDO - Acceso:', hasUserAccess, 'Compras:', purchases?.length || 0)
      }
    } catch (error) {
      console.error('Error verificando acceso:', error)
    }
  }

  const loadVideos = async () => {
    try {
      const response = await fetch('/api/videos')
      const data = await response.json()
      if (data.success) {
        setGenres(data.genres)
        setPackInfo(data.pack)
        // NO sobrescribir hasAccess - ya lo verificamos directamente
      }
    } catch (err) {
      console.error('Error cargando videos:', err)
      // Inventario sigue viniendo de useVideoInventory (Supabase)
    } finally {
      setLoading(false)
    }
  }

  // Búsqueda en artista, título, género, key y BPM
  const query = searchQuery.toLowerCase().trim()
  const filteredGenres = genres.map(g => ({
    ...g,
    videos: g.videos.filter(v =>
      !query || 
      v.artist.toLowerCase().includes(query) ||
      v.title.toLowerCase().includes(query) ||
      v.displayName.toLowerCase().includes(query) ||
      v.genre.toLowerCase().includes(query) ||
      (v.key && v.key.toLowerCase().includes(query)) ||
      (v.bpm && v.bpm.includes(query))
    )
  })).filter(g => g.videos.length > 0 || !query)
  
  // Total de resultados
  const totalResults = filteredGenres.reduce((sum, g) => sum + g.videos.length, 0)

  const handleDownloadAttempt = (video: Video) => {
    if (hasAccess) {
      window.open(`/api/download?file=${encodeURIComponent(video.path)}`, '_blank')
    } else {
      setSelectedVideo(video)
      setShowPaywall(true)
      trackCTAClick('download_blocked', 'contenido', video.name)
    }
  }

  const handlePreview = (video: Video) => {
    setSelectedVideo(video)
    trackCTAClick('preview', 'contenido', video.name)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bear-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-bear-blue/30 border-t-bear-blue rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bear-black text-white">
      {/* HEADER PERSUASIVO */}
      <header className="py-4 px-4 border-b border-bear-blue/20 sticky top-0 bg-bear-black/95 backdrop-blur z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat" width={40} height={40}
            />
            <span className="font-bold text-bear-blue hidden md:block">BEAR BEAT</span>
          </Link>

          <div className="flex items-center gap-3">
            {hasAccess ? (
              <Link href="/dashboard">
                <span className="text-green-400 font-bold text-sm">✅ Tu acceso está activo</span>
              </Link>
            ) : (
              <>
                <span className="text-bear-blue font-bold text-sm hidden md:block">
                  🔥 OFERTA: $350 MXN
                </span>
                <Link href="/checkout?pack=enero-2026">
                  <button className="bg-bear-blue text-bear-black font-black px-4 py-2 rounded-lg hover:bg-bear-blue/90 animate-pulse">
                    OBTENER ACCESO
                  </button>
                </Link>
              </>
            )}
            
            {/* Menú móvil */}
            <MobileMenu currentPath="/contenido" userHasAccess={hasAccess} isLoggedIn={hasAccess} />
          </div>
        </div>
      </header>

      {/* BANNER DE URGENCIA */}
      {!hasAccess && (
        <div className="bg-gradient-to-r from-red-600 to-orange-500 py-3 px-4 text-center">
          <p className="text-sm md:text-base font-bold">
            ⚠️ SOLO HOY: Acceso a {inventory.loading ? '...' : inventory.count.toLocaleString()} videos por $350 MXN (precio normal $1,499)
            <Link href="/checkout?pack=enero-2026" className="underline ml-2">
              Obtener ahora →
            </Link>
          </p>
        </div>
      )}

      {/* HERO DEL CONTENIDO */}
      <section className="py-8 px-4 bg-gradient-to-b from-bear-blue/10 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-black mb-4">
              📦 Pack Enero 2026
            </h1>
            <p className="text-xl text-gray-400 mb-6">
<span className="text-bear-blue font-bold">{inventory.loading ? '...' : inventory.count.toLocaleString()}</span> Video Remixes •
              <span className="text-bear-blue font-bold"> {inventory.loading ? '...' : inventory.genreCount}</span> Géneros • 
              <span className="text-bear-blue font-bold"> {inventory.loading ? '...' : inventory.totalSizeFormatted}</span>
            </p>

            {/* Búsqueda */}
            <div className="max-w-md mx-auto relative">
              <input
                type="text"
                placeholder="🔍 Buscar artista, canción, género, key o BPM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 border-2 border-bear-blue/50 rounded-xl px-5 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-bear-blue"
              />
              {searchQuery && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-bear-blue font-bold text-sm">{totalResults} resultados</span>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="text-gray-400 hover:text-white text-xl"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Stats rápidos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {[
              { icon: '🎬', label: 'Videos', value: inventory.loading ? '...' : inventory.count },
              { icon: '🎵', label: 'Géneros', value: inventory.loading ? '...' : inventory.genreCount },
              { icon: '📐', label: 'Calidad', value: '1080p' },
              { icon: '⬇️', label: 'Descarga', value: 'Ilimitada' },
            ].map((stat, i) => (
              <div key={i} className="bg-white/5 border border-bear-blue/20 rounded-xl p-4 text-center">
                <span className="text-2xl">{stat.icon}</span>
                <p className="text-2xl font-black text-bear-blue">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTENIDO PRINCIPAL */}
      <main className="py-8 px-4">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-8">
          
          {/* LISTA DE GÉNEROS Y VIDEOS */}
          <div className="lg:col-span-2 space-y-4">
            {filteredGenres.map((genre) => (
              <motion.div
                key={genre.id}
                className="bg-white/5 border border-bear-blue/20 rounded-2xl overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Header género */}
                <button
                  onClick={() => setExpandedGenre(expandedGenre === genre.id ? null : genre.id)}
                  className="w-full p-5 flex items-center justify-between hover:bg-white/5"
                >
                  <div className="text-left min-w-0 flex-1">
                    <h3 className="font-black text-xl text-bear-blue">{genre.name}</h3>
                    <p className="text-sm text-gray-500">{genre.videoCount} videos • {genre.totalSizeFormatted}</p>
                  </div>
                  <motion.span
                    animate={{ rotate: expandedGenre === genre.id ? 90 : 0 }}
                    className="text-2xl text-bear-blue shrink-0"
                  >▶</motion.span>
                </button>

                {/* Lista de videos */}
                <AnimatePresence>
                  {expandedGenre === genre.id && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="border-t border-bear-blue/20 overflow-hidden"
                    >
                      <div className="max-h-[500px] overflow-y-auto">
                        {genre.videos.map((video, i) => (
                          <div
                            key={video.id}
                            className={`p-4 flex items-center gap-4 hover:bg-bear-blue/10 cursor-pointer transition-colors ${
                              selectedVideo?.id === video.id ? 'bg-bear-blue/20' : ''
                            }`}
                            onClick={() => handlePreview(video)}
                          >
                            <span className="text-gray-600 font-mono w-8">{String(i + 1).padStart(2, '0')}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate">{video.artist}</p>
                              <p className="text-sm text-gray-400 truncate">{video.title}</p>
                              {(video.duration || video.sizeFormatted) && (
                                <p className="text-xs text-gray-500 truncate">
                                  {[video.duration, video.sizeFormatted].filter(Boolean).join(' • ')}
                                </p>
                              )}
                            </div>
                            <div className="hidden md:flex gap-2">
                              {video.key && (
                                <span className="bg-purple-500/30 text-purple-300 px-2 py-1 rounded text-xs font-mono">{video.key}</span>
                              )}
                              {video.bpm && (
                                <span className="bg-green-500/30 text-green-300 px-2 py-1 rounded text-xs font-mono">{video.bpm}</span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button className="p-2 bg-bear-blue/20 rounded-lg hover:bg-bear-blue/40">👁️</button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDownloadAttempt(video) }}
                                className={`p-2 rounded-lg ${hasAccess ? 'bg-green-500/20 hover:bg-green-500/40' : 'bg-gray-500/20'}`}
                              >⬇️</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* PANEL LATERAL - PREVIEW + CTA */}
          <div className="space-y-6">
            {/* REPRODUCTOR DE DEMO */}
            <div className="bg-white/5 border border-bear-blue/20 rounded-2xl p-4 sticky top-24">
              {selectedVideo ? (
                <>
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <span>🎬</span> Preview Demo
                  </h3>
                  
                  {/* Demo: no descarga, no clic derecho, no arrastre — espejo de carpetas del servidor */}
                  <div 
                    className="relative aspect-video bg-black rounded-xl overflow-hidden mb-4 select-none"
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (!hasAccess) setShowPaywall(true) }}
                    onDragStart={(e) => e.preventDefault()}
                  >
                    {/* Portada: thumbnail o fondo con icono de play */}
                    <div className="absolute inset-0 z-0">
                      {selectedVideo.thumbnailUrl && !posterError ? (
                        <img
                          src={selectedVideo.thumbnailUrl}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={() => setPosterError(true)}
                        />
                      ) : null}
                      {/* Cuando no hay imagen: gradiente + icono de play */}
                      <div className="absolute inset-0 bg-gradient-to-br from-bear-blue/30 via-gray-900 to-purple-900/40 flex flex-col items-center justify-center">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-bear-blue/90 flex items-center justify-center shadow-2xl">
                          <span className="text-white text-4xl md:text-5xl ml-2 select-none" aria-hidden>▶</span>
                        </div>
                        <span className="text-white/80 text-sm md:text-base mt-3 font-medium">Reproducir video</span>
                      </div>
                    </div>

                    {/* Watermark */}
                    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                      <p className="text-white/30 text-3xl md:text-5xl font-black rotate-[-25deg] select-none whitespace-nowrap">
                        BEAR BEAT
                      </p>
                    </div>

                    {/* Video desde Bunny CDN directo (BUNNY_CDN_URL) o mensaje si no config / error */}
                    {(() => {
                      const demoUrl = getDemoCdnUrl(selectedVideo.path, cdnBaseUrl)
                      if (demoError) {
                        return (
                          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center bg-gray-900/90 text-gray-400 p-6 text-center">
                            <p className="text-lg font-bold text-white/80 mb-2">Demo no disponible</p>
                            <p className="text-sm">Revisa BUNNY_CDN_URL en .env o que el archivo exista en el CDN.</p>
                          </div>
                        )
                      }
                      if (!demoUrl) {
                        return (
                          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center bg-gray-900/90 text-gray-400 p-6 text-center">
                            <p className="text-lg font-bold text-white/80 mb-2">Demo no configurado</p>
                            <p className="text-sm">Añade BUNNY_CDN_URL en .env.local (ej: https://bear-beat.b-cdn.net).</p>
                          </div>
                        )
                      }
                      return (
                    <video
                      ref={videoRef}
                      key={selectedVideo.path}
                      src={demoUrl}
                      className="relative z-10 w-full h-full object-contain"
                      controls
                      controlsList="nodownload nofullscreen noplaybackrate noremoteplayback"
                      disablePictureInPicture
                      disableRemotePlayback
                      playsInline
                      draggable={false}
                      autoPlay
                      muted
                      preload="metadata"
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation() }}
                      onDragStart={(e) => e.preventDefault()}
                      onError={() => setDemoError(true)}
                    />
                      )
                    })()}

                    {/* Badge DEMO */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="bg-red-500 px-3 py-1 rounded-full text-xs font-black animate-pulse">
                        DEMO
                      </span>
                    </div>
                    
                    {/* Resolución */}
                    {selectedVideo.resolution && (
                      <div className="absolute top-3 left-3 z-10">
                        <span className="bg-bear-blue/80 px-2 py-1 rounded text-xs font-bold">
                          {selectedVideo.resolution}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info del video - metadatos en tiempo real */}
                  <div className="space-y-3">
                    <div>
                      <p className="font-black text-lg">{selectedVideo.artist}</p>
                      <p className="text-gray-400">{selectedVideo.title}</p>
                      {(selectedVideo.duration || selectedVideo.sizeFormatted) && (
                        <p className="text-xs text-gray-500 mt-1">
                          {[selectedVideo.duration, selectedVideo.sizeFormatted].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="bg-bear-blue/20 text-bear-blue px-3 py-1 rounded-full">{selectedVideo.genre}</span>
                      {selectedVideo.resolution && <span className="bg-gray-500/20 text-gray-300 px-3 py-1 rounded-full">{selectedVideo.resolution}</span>}
                      {selectedVideo.key && <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full">{selectedVideo.key}</span>}
                      {selectedVideo.bpm && <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full">{selectedVideo.bpm} BPM</span>}
                    </div>

                    {/* CTA */}
                    {hasAccess ? (
                      <button
                        onClick={() => handleDownloadAttempt(selectedVideo)}
                        className="w-full bg-bear-blue text-bear-black font-black py-4 rounded-xl hover:bg-bear-blue/90"
                      >
                        ⬇️ DESCARGAR ESTE VIDEO
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowPaywall(true)}
                        className="w-full bg-bear-blue text-bear-black font-black py-4 rounded-xl hover:bg-bear-blue/90"
                      >
                        🔓 DESBLOQUEAR DESCARGA
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <span className="text-6xl mb-4 block">👈</span>
                  <p className="font-bold">Selecciona un video</p>
                  <p className="text-sm text-gray-500">para ver la preview</p>
                </div>
              )}
            </div>

            {/* CTA PRINCIPAL */}
            {!hasAccess && (
              <div className="bg-gradient-to-br from-bear-blue/30 to-purple-500/30 border-2 border-bear-blue rounded-2xl p-6 text-center">
                <p className="text-sm text-gray-400 mb-2">Acceso completo a todo:</p>
                <p className="text-5xl font-black text-bear-blue mb-2">$350</p>
                <p className="text-sm text-gray-500 mb-4">
                  <span className="line-through text-gray-600">$1,499 MXN</span> • Pago único
                </p>
                
                <Link href="/checkout?pack=enero-2026">
                  <button 
                    className="w-full bg-bear-blue text-bear-black font-black py-4 rounded-xl hover:bg-bear-blue/90 mb-4"
                    onClick={() => trackCTAClick('sidebar_main_cta', 'contenido')}
                  >
                    OBTENER ACCESO AHORA →
                  </button>
                </Link>

                <ul className="text-left text-sm space-y-2">
                  <li className="flex items-center gap-2">✅ {(packInfo?.totalVideos ?? inventory.count ?? 0).toLocaleString()} videos HD</li>
                  <li className="flex items-center gap-2">✅ Descarga ilimitada</li>
                  <li className="flex items-center gap-2">✅ Acceso FTP incluido</li>
                  <li className="flex items-center gap-2">✅ Soporte 24/7</li>
                  <li className="flex items-center gap-2">✅ Garantía 30 días</li>
                </ul>
              </div>
            )}

            {/* TESTIMONIAL */}
            <div className="bg-white/5 border border-bear-blue/20 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-bear-blue/30 rounded-full flex items-center justify-center font-bold">DJ</div>
                <div>
                  <p className="font-bold text-sm">DJ Carlos - CDMX</p>
                  <p className="text-yellow-400 text-xs">⭐⭐⭐⭐⭐</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 italic">
                "Pensé que era muy bueno para ser real. Pero pagué y en 5 minutos ya estaba descargando todo por FTP. ¡Increíble calidad!"
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL PAYWALL PERSUASIVO */}
      <AnimatePresence>
        {showPaywall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur z-50 flex items-center justify-center p-4"
            onClick={() => setShowPaywall(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="bg-bear-black border-2 border-bear-blue rounded-3xl p-8 max-w-lg w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-7xl mb-4">🔒</div>
              <h3 className="text-3xl font-black mb-2">OBTENER ACCESO POR $350</h3>
              <p className="text-gray-400 text-sm mb-4">
                Para descargar este y todos los videos del pack necesitas acceso.
              </p>
              {selectedVideo && (
                <p className="text-gray-400 mb-6">
                  Incluye <span className="text-bear-blue font-bold">"{selectedVideo.artist}"</span> y los otros <span className="text-bear-blue font-bold">{(packInfo?.totalVideos ?? inventory.count ?? 0).toLocaleString()} videos</span>.
                </p>
              )}
              
              <div className="bg-gradient-to-r from-bear-blue/20 to-purple-500/20 rounded-2xl p-6 mb-6">
                <p className="text-sm text-gray-400 mb-1">Oferta especial de hoy:</p>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-2xl text-gray-500 line-through">$1,499</span>
                  <span className="text-5xl font-black text-bear-blue">$350</span>
                </div>
                <p className="text-sm text-green-400 mt-2">¡Ahorras $1,149 MXN!</p>
              </div>

              <Link href="/checkout?pack=enero-2026">
                <button 
                  className="w-full bg-bear-blue text-bear-black font-black text-xl py-5 rounded-xl hover:bg-bear-blue/90 mb-4"
                  onClick={() => trackCTAClick('paywall_cta', 'contenido')}
                >
                  OBTENER ACCESO POR $350 →
                </button>
              </Link>
              
              <button 
                onClick={() => setShowPaywall(false)}
                className="text-gray-600 hover:text-gray-400 text-sm"
              >
                No gracias, prefiero seguir sin descargar
              </button>

              <div className="mt-6 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-500">
                  🔒 Pago seguro • 💳 Múltiples métodos • ✅ Garantía 30 días
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER CON CTA */}
      {!hasAccess && (
        <footer className="py-8 px-4 bg-gradient-to-t from-bear-blue/20 to-transparent">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-2xl font-black mb-4">
              ¿Listo para tener {(packInfo?.totalVideos ?? inventory.count ?? 0).toLocaleString()} videos?
            </p>
            <Link href="/checkout?pack=enero-2026">
              <button className="bg-bear-blue text-bear-black font-black text-xl px-12 py-5 rounded-xl hover:bg-bear-blue/90">
                OBTENER ACCESO POR $350 MXN →
              </button>
            </Link>
            <p className="text-sm text-gray-500 mt-4">
              Pago único • Sin suscripciones • Descarga inmediata
            </p>
          </div>
        </footer>
      )}
    </div>
  )
}
