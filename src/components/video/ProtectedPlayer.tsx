'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

// ==========================================
// REPRODUCTOR PROTEGIDO - Anti-descarga
// ==========================================

interface ProtectedPlayerProps {
  // Para demos (streaming protegido)
  videoId?: string
  // Para preview simple (thumbnail + play falso)
  previewUrl?: string
  thumbnail?: string
  // Info
  title: string
  duration?: string
  // Callbacks
  onDownloadAttempt?: () => void
  // Modo
  mode: 'demo' | 'preview' | 'full'
  // Para modo full (usuarios con acceso)
  downloadUrl?: string
}

export function ProtectedPlayer({
  videoId,
  previewUrl,
  thumbnail,
  title,
  duration,
  onDownloadAttempt,
  mode = 'preview',
  downloadUrl
}: ProtectedPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Bloquear click derecho
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onDownloadAttempt?.()
  }

  // Cargar URL de streaming cuando se da play
  const handlePlay = async () => {
    if (mode === 'full' && previewUrl) {
      // Modo full: reproducir directamente
      setIsPlaying(true)
      return
    }

    if (mode === 'demo' && videoId) {
      // Modo demo: obtener URL de streaming firmada
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'demo_stream',
            videoId
          })
        })

        const data = await response.json()

        if (data.success) {
          setStreamUrl(data.url)
          setIsPlaying(true)
        } else {
          setError(data.error || 'Error cargando video')
        }
      } catch (err: any) {
        setError('Error de conexión')
      } finally {
        setLoading(false)
      }
    } else if (mode === 'preview') {
      // Modo preview: mostrar paywall
      onDownloadAttempt?.()
    }
  }

  // Bloquear teclas de descarga
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.shiftKey && e.key === 'i') ||
        e.key === 'F12'
      ) {
        e.preventDefault()
        onDownloadAttempt?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onDownloadAttempt])

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden aspect-video select-none"
      onContextMenu={handleContextMenu}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Watermark (solo en demo/preview) */}
      {mode !== 'full' && (
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
          <p className="text-white/10 text-4xl md:text-6xl font-black rotate-[-30deg] select-none whitespace-nowrap">
            BEAR BEAT DEMO
          </p>
        </div>
      )}

      {/* Contenido del player */}
      {isPlaying ? (
        // Video reproduciéndose
        mode === 'demo' && streamUrl ? (
          // Streaming via iframe (Bunny Stream)
          <iframe
            src={streamUrl}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          // Video directo (modo full o preview simple)
          <video
            src={previewUrl}
            className="w-full h-full object-cover"
            autoPlay
            controls={mode === 'full'}
            controlsList="nodownload"
            disablePictureInPicture
            playsInline
            onEnded={() => setIsPlaying(false)}
            onContextMenu={handleContextMenu}
          />
        )
      ) : (
        // Estado inicial: thumbnail + botón de play
        <div
          className="w-full h-full cursor-pointer group relative"
          onClick={handlePlay}
        >
          {/* Thumbnail o placeholder con icono de play */}
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-bear-blue/25 via-gray-900 to-purple-900/30 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-bear-blue/90 flex items-center justify-center shadow-xl">
                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-white/70 text-xs mt-2 font-medium">Reproducir</span>
            </div>
          )}

          {/* Overlay oscuro */}
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />

          {/* Botón de play */}
          <div className="absolute inset-0 flex items-center justify-center">
            {loading ? (
              <div className="w-20 h-20 border-4 border-bear-blue/30 border-t-bear-blue rounded-full animate-spin" />
            ) : (
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-20 h-20 bg-bear-blue/90 rounded-full flex items-center justify-center shadow-2xl shadow-bear-blue/30"
              >
                <svg className="w-8 h-8 text-bear-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </motion.div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="absolute bottom-4 left-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Barra inferior con info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 pointer-events-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isPlaying && (
              <button
                className="text-white hover:text-bear-blue pointer-events-auto"
                onClick={() => setIsPlaying(false)}
              >
                ⏸️
              </button>
            )}
            <span className="text-white text-sm truncate max-w-[200px]">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {duration && (
              <span className="text-white/70 text-xs">{duration}</span>
            )}
            {mode !== 'full' && (
              <span className="bg-red-500 px-2 py-0.5 rounded text-xs font-bold text-white">
                DEMO
              </span>
            )}
            {mode === 'full' && downloadUrl && (
              <a
                href={downloadUrl}
                className="bg-green-500 px-3 py-1 rounded text-xs font-bold text-white pointer-events-auto hover:bg-green-600"
                download
              >
                ⬇️ Descargar
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Capa anti-inspect element */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      />
    </div>
  )
}

// Exportar variantes preconfiguradas
export function DemoPlayer(props: Omit<ProtectedPlayerProps, 'mode'>) {
  return <ProtectedPlayer {...props} mode="demo" />
}

export function PreviewPlayer(props: Omit<ProtectedPlayerProps, 'mode'>) {
  return <ProtectedPlayer {...props} mode="preview" />
}

export function FullPlayer(props: Omit<ProtectedPlayerProps, 'mode'>) {
  return <ProtectedPlayer {...props} mode="full" />
}
