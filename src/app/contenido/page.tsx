'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { trackCTAClick, trackPageView } from '@/lib/tracking'
import { fbTrackViewContent, fbTrackSearch } from '@/components/analytics/MetaPixel'
// Demo: /api/demo-url redirige a CDN firmado (rápido) o a proxy
import { MobileMenu } from '@/components/ui/MobileMenu'
import { createClient } from '@/lib/supabase/client'
import { useVideoInventory } from '@/lib/hooks/useVideoInventory'
import { Folder, Music2, Search, Lock, ChevronRight, Check, Play, Download, Archive } from 'lucide-react'
import { toast } from 'sonner'

// ==========================================
// CONTENIDO – Vitrina High-End (Dark Mode, estilo Finder/Rekordbox)
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const expandedSectionRef = useRef<HTMLDivElement>(null)
  const inventory = useVideoInventory()

  useEffect(() => {
    setPosterError(false)
    setDemoError(false)
  }, [selectedVideo?.id])

  // Al expandir una carpeta, hacer scroll suave hasta la lista de videos para que se vea que se abrió
  useEffect(() => {
    if (expandedGenre && expandedSectionRef.current) {
      const t = setTimeout(() => {
        expandedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 150)
      return () => clearTimeout(t)
    }
  }, [expandedGenre])

  useEffect(() => {
    trackPageView('contenido')
    verificarAcceso()
    loadVideos()
    fbTrackViewContent(
      { content_name: 'Biblioteca Bear Beat', content_type: 'product', content_ids: ['contenido'] },
      undefined
    )
  }, [])

  const lastSearchRef = useRef('')
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q || q.length < 2 || q === lastSearchRef.current) return
    const t = setTimeout(() => {
      lastSearchRef.current = q
      fbTrackSearch({ search_string: q })
    }, 600)
    return () => clearTimeout(t)
  }, [searchQuery])

  const verificarAcceso = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: purchases } = await supabase.from('purchases').select('*').eq('user_id', user.id)
        setHasAccess(Boolean(purchases && purchases.length > 0))
      }
    } catch {
      // ignore
    }
  }

  const loadVideos = async () => {
    try {
      const res = await fetch('/api/videos')
      const data = await res.json()
      if (data.success) {
        setGenres(data.genres)
        setPackInfo(data.pack)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const query = searchQuery.toLowerCase().trim()
  const filteredGenres = genres
    .filter((g) => g.id !== 'preview')
    .map((g) => ({
      ...g,
      videos: g.videos.filter(
        (v) =>
          !query ||
          v.artist.toLowerCase().includes(query) ||
          v.title.toLowerCase().includes(query) ||
          v.displayName.toLowerCase().includes(query) ||
          v.genre.toLowerCase().includes(query) ||
          (v.key && v.key.toLowerCase().includes(query)) ||
          (v.bpm && v.bpm.includes(query))
      ),
    }))
    .filter((g) => g.videos.length > 0 || !query)

  const totalVideos = packInfo?.totalVideos ?? inventory.count ?? 0
  const totalSizeFormatted = packInfo?.totalSizeFormatted ?? inventory.totalSizeFormatted ?? '0 B'
  const genreCount = packInfo?.genreCount ?? inventory.genreCount ?? 0
  const statsLoading = inventory.loading && !packInfo

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

  const handleDownloadFolderZip = async (genre: Genre) => {
    if (!hasAccess) {
      setShowPaywall(true)
      return
    }
    const zipName = `${genre.name}.zip`
    try {
      const res = await fetch(`/api/download?file=${encodeURIComponent(zipName)}`, { redirect: 'manual' })
      if (res.status === 302) {
        const location = res.headers.get('Location')
        if (location) {
          window.open(location, '_blank')
          trackCTAClick('download_folder_zip', 'contenido', zipName)
        } else {
          toast.error('No se pudo iniciar la descarga.')
        }
      } else if (res.status === 404) {
        await res.json().catch(() => ({}))
        toast.info('Este género aún no tiene paquete ZIP generado. Por favor descarga los videos individuales o usa FTP.')
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error || 'Error al descargar. Intenta de nuevo o usa FTP.')
      }
    } catch {
      toast.info('Este género aún no tiene paquete ZIP generado. Por favor descarga los videos individuales o usa FTP.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-bear-blue/30 border-t-bear-blue rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white antialiased pb-24 md:pb-0">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#050505]/95 backdrop-blur py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat"
              width={40}
              height={40}
            />
            <span className="font-bold text-bear-blue hidden md:inline">BEAR BEAT</span>
          </Link>
          <div className="flex items-center gap-3">
            {hasAccess ? (
              <Link href="/dashboard" className="text-sm font-medium text-bear-blue hover:underline">
                Mi Panel
              </Link>
            ) : (
              <Link href="/checkout?pack=enero-2026">
                <button className="bg-bear-blue text-bear-black font-black text-sm px-4 py-2 rounded-lg hover:brightness-110 transition">
                  OBTENER ACCESO
                </button>
              </Link>
            )}
            <MobileMenu currentPath="/contenido" userHasAccess={hasAccess} isLoggedIn={hasAccess} />
          </div>
        </div>
      </header>

      {/* HEADER DE SECCIÓN – Título, stats, buscador */}
      <section className="px-4 py-8 border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-4xl font-black text-white mb-2">
            Pack Enero 2026
          </h1>
          <div className="flex flex-wrap items-center gap-3 mb-6 text-sm text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <Folder className="h-4 w-4 text-bear-blue" />
              {statsLoading ? '...' : totalVideos.toLocaleString()} Videos
            </span>
            <span className="text-white/40">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-bear-blue font-medium">💾</span>
              {statsLoading ? '...' : totalSizeFormatted}
            </span>
            <span className="text-white/40">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Music2 className="h-4 w-4 text-bear-blue" />
              {statsLoading ? '...' : genreCount} Géneros
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
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {/* CONTENIDO PRINCIPAL – Grid de géneros + sidebar sticky */}
      <main className="px-4 py-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-8">
          {/* GRID DE GÉNEROS (carpetas) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredGenres.map((genre) => (
                <motion.div
                  key={genre.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 transition-all hover:border-bear-blue hover:shadow-[0_0_24px_rgba(8,225,247,0.12)] hover:-translate-y-0.5 cursor-pointer"
                  onClick={() => setExpandedGenre(expandedGenre === genre.id ? null : genre.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-bear-blue/10 text-bear-blue">
                        <Folder className="h-6 w-6" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white truncate">{genre.name}</h3>
                        <p className="text-sm text-gray-500">
                          {genre.videoCount} videos · {genre.totalSizeFormatted}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-bear-blue">
                      <ChevronRight
                        className={`h-5 w-5 transition-transform ${expandedGenre === genre.id ? 'rotate-90' : ''}`}
                      />
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-bear-blue font-medium flex items-center gap-1">
                    Explorar
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Lista de videos del género expandido */}
            <AnimatePresence>
              {expandedGenre && (
                <motion.div
                  ref={expandedSectionRef}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden"
                >
                  {filteredGenres
                    .filter((g) => g.id === expandedGenre)
                    .map((genre) => (
                      <div key={genre.id}>
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-zinc-800/50">
                          <h3 className="font-bold text-white">{genre.name}</h3>
                          {hasAccess && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownloadFolderZip(genre)
                              }}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold text-sm hover:bg-cyan-500/30 transition border border-cyan-500/40"
                            >
                              <Archive className="h-4 w-4" />
                              DESCARGAR CARPETA ZIP
                            </button>
                          )}
                        </div>
                        <div className="max-h-[420px] overflow-y-auto">
                        {genre.videos.map((video) => (
                          <div
                            key={video.id}
                            className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors ${
                              selectedVideo?.id === video.id ? 'bg-bear-blue/10' : ''
                            }`}
                            onClick={() => handlePreview(video)}
                          >
                            <button
                              type="button"
                              className="p-2 rounded-lg bg-bear-blue/20 text-bear-blue hover:bg-bear-blue/30 transition shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePreview(video)
                              }}
                              aria-label="Reproducir demo"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">{video.artist}</p>
                              <p className="text-sm text-gray-500 truncate">{video.title}</p>
                            </div>
                            <div className="hidden sm:flex gap-2 shrink-0">
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
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownloadAttempt(video)
                              }}
                              className={`p-2 rounded-lg transition shrink-0 ${
                                hasAccess
                                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                  : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-600/50'
                              }`}
                              aria-label="Descargar"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        </div>
                      </div>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SIDEBAR: Pro = Panel de Detalles (utilidad); Free = Preview + Oferta + Testimonio (venta) */}
          <aside className="space-y-6">
            <div className="lg:sticky lg:top-24 space-y-6">
              {hasAccess ? (
                /* ---------- USUARIO PRO: Panel de Utilidad / Reproducción ---------- */
                selectedVideo ? (
                  <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                    {/* Reproductor */}
                    <div
                      className="relative aspect-video bg-black rounded-xl overflow-hidden mb-4 select-none"
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                    >
                      {selectedVideo.thumbnailUrl && !posterError ? (
                        <img
                          src={selectedVideo.thumbnailUrl}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={() => setPosterError(true)}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-bear-blue/20 via-zinc-900 to-purple-900/20 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-bear-blue/20 flex items-center justify-center">
                            <Play className="h-8 w-8 text-bear-blue ml-1" />
                          </div>
                        </div>
                      )}
                      {(() => {
                        const demoUrl = `/api/demo-url?path=${encodeURIComponent(selectedVideo.path)}`
                        if (demoError) return null
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
                            preload="auto"
                            onContextMenu={(e) => e.preventDefault()}
                            onError={() => setDemoError(true)}
                            onLoadedMetadata={(e) => {
                              const v = e.currentTarget
                              if (v) v.volume = 1
                            }}
                          />
                        )
                      })()}
                      <div className="absolute top-2 right-2 z-10">
                        <span className="bg-red-500/90 px-2 py-0.5 rounded text-xs font-bold">DEMO</span>
                      </div>
                    </div>
                    {/* Meta datos: título, artista, grid BPM / Key / Peso */}
                    <h3 className="text-lg font-bold text-white mb-1 truncate">{selectedVideo.title}</h3>
                    <p className="text-sm text-gray-400 mb-3 truncate">{selectedVideo.artist}</p>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {selectedVideo.bpm != null && selectedVideo.bpm !== '' && (
                        <div className="rounded-lg bg-zinc-800/80 px-3 py-2 text-center">
                          <p className="text-xs text-zinc-500 uppercase tracking-wide">BPM</p>
                          <p className="text-sm font-mono font-bold text-cyan-400">{selectedVideo.bpm}</p>
                        </div>
                      )}
                      {selectedVideo.key != null && selectedVideo.key !== '' && (
                        <div className="rounded-lg bg-zinc-800/80 px-3 py-2 text-center">
                          <p className="text-xs text-zinc-500 uppercase tracking-wide">Key</p>
                          <p className="text-sm font-mono font-bold text-cyan-400">{selectedVideo.key}</p>
                        </div>
                      )}
                      <div className="rounded-lg bg-zinc-800/80 px-3 py-2 text-center">
                        <p className="text-xs text-zinc-500 uppercase tracking-wide">Peso</p>
                        <p className="text-sm font-mono font-medium text-zinc-400">{selectedVideo.sizeFormatted}</p>
                      </div>
                    </div>
                    {/* Acción principal: descarga directa */}
                    <button
                      type="button"
                      onClick={() => handleDownloadAttempt(selectedVideo)}
                      className="w-full py-4 rounded-xl bg-cyan-500 text-black font-black text-base hover:bg-cyan-400 transition flex items-center justify-center gap-2"
                    >
                      <Download className="h-5 w-5" />
                      DESCARGAR VIDEO
                    </button>
                  </div>
                ) : (
                  /* Estado vacío Pro: icono + texto + tip FTP */
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
                    <Folder className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                    <p className="text-sm text-zinc-400 mb-2">
                      Selecciona un video de la lista para ver la vista previa y descargar.
                    </p>
                    <p className="text-xs text-zinc-500">
                      💡 Puedes descargar carpetas completas desde el Dashboard (FTP).
                    </p>
                  </div>
                )
              ) : (
                /* ---------- USUARIO FREE: Preview + Oferta + Testimonio (venta) ---------- */
                <>
                  {selectedVideo ? (
                    <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                      <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                        <Play className="h-4 w-4 text-bear-blue" />
                        Preview Demo
                      </h3>
                      <div
                        className="relative aspect-video bg-black rounded-xl overflow-hidden mb-4 select-none"
                        onContextMenu={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowPaywall(true)
                        }}
                        onDragStart={(e) => e.preventDefault()}
                      >
                        {selectedVideo.thumbnailUrl && !posterError ? (
                          <img
                            src={selectedVideo.thumbnailUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={() => setPosterError(true)}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-bear-blue/20 via-zinc-900 to-purple-900/20 flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-bear-blue/20 flex items-center justify-center">
                              <Play className="h-8 w-8 text-bear-blue ml-1" />
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <p className="text-white/20 text-2xl font-black rotate-[-25deg]">BEAR BEAT</p>
                        </div>
                        {(() => {
                          const demoUrl = `/api/demo-url?path=${encodeURIComponent(selectedVideo.path)}`
                          if (demoError) return null
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
                              preload="auto"
                              onContextMenu={(e) => e.preventDefault()}
                              onError={() => setDemoError(true)}
                              onLoadedMetadata={(e) => {
                                const v = e.currentTarget
                                if (v) v.volume = 1
                              }}
                            />
                          )
                        })()}
                        <div className="absolute top-2 right-2 z-10">
                          <span className="bg-red-500/90 px-2 py-0.5 rounded text-xs font-bold">DEMO</span>
                        </div>
                      </div>
                      <p className="font-bold text-white truncate">{selectedVideo.artist}</p>
                      <p className="text-sm text-gray-500 truncate">{selectedVideo.title}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {selectedVideo.key && (
                          <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300">
                            {selectedVideo.key}
                          </span>
                        )}
                        {selectedVideo.bpm && (
                          <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-300">
                            {selectedVideo.bpm} BPM
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setShowPaywall(true)}
                        className="w-full mt-3 h-11 rounded-xl bg-bear-blue text-bear-black font-black hover:brightness-110 transition flex items-center justify-center gap-2"
                      >
                        <Lock className="h-4 w-4" />
                        Desbloquear descarga
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
                      <Music2 className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">Selecciona un video</p>
                      <p className="text-xs text-gray-600">para ver la preview</p>
                    </div>
                  )}

                  {/* Caja oferta – solo Free */}
                  <div className="rounded-2xl border-2 border-bear-blue/60 bg-bear-blue/5 p-6 shadow-[0_0_30px_rgba(8,225,247,0.08)]">
                    <h3 className="font-black text-white text-lg mb-1">Acceso Completo</h3>
                    <p className="text-3xl md:text-4xl font-black text-bear-blue mb-4">$350 MXN</p>
                    <ul className="space-y-2 mb-5 text-sm text-gray-300">
                      {[
                        `${totalVideos.toLocaleString()} videos HD`,
                        'Descarga ilimitada',
                        'Acceso FTP incluido',
                        'Soporte 24/7',
                        'Garantía 30 días',
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Link href="/checkout?pack=enero-2026" onClick={() => trackCTAClick('sidebar_main_cta', 'contenido')}>
                      <button className="w-full h-12 rounded-xl bg-bear-blue text-bear-black font-black text-sm hover:brightness-110 transition">
                        DESBLOQUEAR TODO AHORA →
                      </button>
                    </Link>
                  </div>

                  {/* Testimonio DJ Carlos – solo Free */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-9 w-9 rounded-full bg-bear-blue/20 flex items-center justify-center font-bold text-bear-blue text-sm">
                        C
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">DJ Carlos · CDMX</p>
                        <p className="text-yellow-500 text-xs">★★★★★</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 italic leading-relaxed">
                      &quot;Pagué y en 5 minutos ya estaba descargando por FTP. ¡Increíble calidad!&quot;
                    </p>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* MODAL PAYWALL – "Este contenido es exclusivo" */}
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
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="rounded-2xl border-2 border-bear-blue/60 bg-[#0a0a0a] p-8 max-w-md w-full text-center shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center mb-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-bear-blue/20 text-bear-blue">
                  <Lock className="h-7 w-7" />
                </span>
              </div>
              <h3 className="text-xl font-black text-white mb-2">Este contenido es exclusivo</h3>
              <p className="text-gray-400 text-sm mb-6">
                Adquiere el pack para descargar este y otros {totalVideos.toLocaleString()} videos.
              </p>
              <div className="rounded-xl bg-bear-blue/10 border border-bear-blue/30 p-4 mb-6">
                <p className="text-sm text-gray-400 mb-1">Pago único</p>
                <p className="text-3xl font-black text-bear-blue">$350 MXN</p>
              </div>
              <Link href="/checkout?pack=enero-2026" onClick={() => trackCTAClick('paywall_cta', 'contenido')}>
                <button className="w-full h-12 rounded-xl bg-bear-blue text-bear-black font-black hover:brightness-110 transition">
                  OBTENER ACCESO ($350)
                </button>
              </Link>
              <button
                onClick={() => setShowPaywall(false)}
                className="mt-4 text-sm text-gray-500 hover:text-gray-400"
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER FLOTANTE – Solo móvil, sin acceso */}
      {!hasAccess && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-white/10 bg-[#0a0a0a]/95 backdrop-blur p-3 safe-area-pb">
          <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
            <p className="text-sm font-medium text-gray-300">
              <span className="text-white font-bold">{totalVideos.toLocaleString()}</span> videos esperan
            </p>
            <Link href="/checkout?pack=enero-2026" className="shrink-0">
              <button className="h-11 px-5 rounded-xl bg-bear-blue text-bear-black font-black text-sm hover:brightness-110 transition">
                DESBLOQUEAR ($350)
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
