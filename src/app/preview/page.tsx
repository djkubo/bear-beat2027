'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { trackCTAClick, trackPageView } from '@/lib/tracking'

// ==========================================
// PÁGINA DE PREVIEW - Explorador de Archivos
// Ver demos sin poder descargar
// ==========================================

// Tipos
interface FileItem {
  id: string
  name: string
  type: 'folder' | 'video' | 'audio'
  size?: string
  duration?: string
  thumbnail?: string
  previewUrl?: string
  children?: FileItem[]
}

// Datos de ejemplo (después vendrán de la base de datos)
const DEMO_STRUCTURE: FileItem[] = [
  {
    id: 'pack-enero-2026',
    name: '📦 Pack Enero 2026',
    type: 'folder',
    children: [
      {
        id: 'reggaeton',
        name: '🎤 Reggaeton',
        type: 'folder',
        children: [
          { id: 'v1', name: 'Bad Bunny - Monaco (Video Remix).mp4', type: 'video', size: '245 MB', duration: '3:42', thumbnail: '/demos/thumb1.jpg', previewUrl: '/demos/preview1.mp4' },
          { id: 'v2', name: 'Karol G - TQG ft. Shakira (Extended).mp4', type: 'video', size: '312 MB', duration: '4:15', thumbnail: '/demos/thumb2.jpg', previewUrl: '/demos/preview2.mp4' },
          { id: 'v3', name: 'Feid - Normal (Club Edit).mp4', type: 'video', size: '198 MB', duration: '3:28', thumbnail: '/demos/thumb3.jpg', previewUrl: '/demos/preview3.mp4' },
          { id: 'v4', name: 'Rauw Alejandro - Baby Hello (Video Mix).mp4', type: 'video', size: '267 MB', duration: '3:55', thumbnail: '/demos/thumb4.jpg', previewUrl: '/demos/preview4.mp4' },
          { id: 'v5', name: 'Peso Pluma - Ella Baila Sola (Remix).mp4', type: 'video', size: '234 MB', duration: '3:33', thumbnail: '/demos/thumb5.jpg', previewUrl: '/demos/preview5.mp4' },
        ]
      },
      {
        id: 'pop',
        name: '🎹 Pop',
        type: 'folder',
        children: [
          { id: 'v6', name: 'Taylor Swift - Anti-Hero (Video Remix).mp4', type: 'video', size: '289 MB', duration: '4:02', thumbnail: '/demos/thumb6.jpg' },
          { id: 'v7', name: 'Dua Lipa - Dance The Night (Extended).mp4', type: 'video', size: '256 MB', duration: '3:48', thumbnail: '/demos/thumb7.jpg' },
          { id: 'v8', name: 'Miley Cyrus - Flowers (Club Mix).mp4', type: 'video', size: '278 MB', duration: '3:52', thumbnail: '/demos/thumb8.jpg' },
        ]
      },
      {
        id: 'rock',
        name: '🎸 Rock en Español',
        type: 'folder',
        children: [
          { id: 'v9', name: 'Maná - Rayando el Sol (Remaster 4K).mp4', type: 'video', size: '345 MB', duration: '4:28', thumbnail: '/demos/thumb9.jpg' },
          { id: 'v10', name: 'Café Tacvba - La Ingrata (Video Mix).mp4', type: 'video', size: '312 MB', duration: '4:15', thumbnail: '/demos/thumb10.jpg' },
        ]
      },
      {
        id: 'cumbia',
        name: '🎺 Cumbia',
        type: 'folder',
        children: [
          { id: 'v11', name: 'Los Ángeles Azules - Nunca Es Suficiente.mp4', type: 'video', size: '298 MB', duration: '4:05', thumbnail: '/demos/thumb11.jpg' },
          { id: 'v12', name: 'Grupo Frontera - Un x100to (Video).mp4', type: 'video', size: '267 MB', duration: '3:45', thumbnail: '/demos/thumb12.jpg' },
        ]
      },
      {
        id: 'electronica',
        name: '💿 Electrónica',
        type: 'folder',
        children: [
          { id: 'v13', name: 'David Guetta - Titanium (4K Remaster).mp4', type: 'video', size: '334 MB', duration: '4:22', thumbnail: '/demos/thumb13.jpg' },
          { id: 'v14', name: 'Calvin Harris - Summer (Extended Mix).mp4', type: 'video', size: '289 MB', duration: '4:08', thumbnail: '/demos/thumb14.jpg' },
        ]
      },
      {
        id: 'clasicos',
        name: '🎵 Clásicos 80s/90s',
        type: 'folder',
        children: [
          { id: 'v15', name: 'Michael Jackson - Billie Jean (4K).mp4', type: 'video', size: '412 MB', duration: '4:54', thumbnail: '/demos/thumb15.jpg' },
          { id: 'v16', name: 'Queen - Bohemian Rhapsody (Remaster).mp4', type: 'video', size: '523 MB', duration: '5:55', thumbnail: '/demos/thumb16.jpg' },
        ]
      },
    ]
  }
]

// Componente del modal de pago
function PaywallModal({ isOpen, onClose, fileName }: { isOpen: boolean; onClose: () => void; fileName: string }) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-bear-black border-2 border-bear-blue rounded-2xl p-8 max-w-md w-full text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-2xl font-black mb-2">¡Este video es premium!</h3>
          <p className="text-gray-400 mb-4">
            Para descargar <span className="text-bear-blue font-bold">"{fileName}"</span> y los otros 3,246 videos, obtén tu acceso ahora.
          </p>
          
          <div className="bg-bear-blue/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-400 mb-1">Precio especial:</p>
            <p className="text-4xl font-black text-bear-blue">$350 MXN</p>
            <p className="text-sm text-gray-400">Pago único • Acceso de por vida</p>
          </div>

          <Link href="/checkout?pack=enero-2026">
            <button 
              className="w-full bg-bear-blue text-bear-black font-black text-lg py-4 rounded-xl hover:bg-bear-blue/90 transition-colors mb-3"
              onClick={() => trackCTAClick('paywall_cta', 'preview', fileName)}
            >
              OBTENER ACCESO AHORA →
            </button>
          </Link>
          
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white text-sm"
          >
            Seguir viendo demos
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Componente del reproductor protegido
function ProtectedVideoPlayer({ 
  previewUrl, 
  thumbnail, 
  name,
  onDownloadAttempt 
}: { 
  previewUrl?: string
  thumbnail?: string
  name: string
  onDownloadAttempt: () => void 
}) {
  const [isPlaying, setIsPlaying] = useState(false)

  // Bloquear click derecho
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onDownloadAttempt()
  }

  return (
    <div 
      className="relative bg-black rounded-xl overflow-hidden aspect-video"
      onContextMenu={handleContextMenu}
    >
      {/* Watermark */}
      <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
        <p className="text-white/20 text-4xl font-black rotate-[-30deg] select-none">
          BEAR BEAT DEMO
        </p>
      </div>

      {/* Video o thumbnail */}
      {isPlaying && previewUrl ? (
        <video
          src={previewUrl}
          className="w-full h-full object-cover"
          autoPlay
          controls={false}
          controlsList="nodownload nofullscreen noremoteplayback"
          disablePictureInPicture
          playsInline
          onEnded={() => setIsPlaying(false)}
        />
      ) : (
        <div 
          className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center cursor-pointer group"
          onClick={() => previewUrl && setIsPlaying(true)}
        >
          {thumbnail ? (
            <img src={thumbnail} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-6xl">🎬</div>
          )}
          
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
            <div className="w-20 h-20 bg-bear-blue/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-bear-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Controles falsos */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="text-white hover:text-bear-blue">
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <span className="text-white text-sm">0:00 / 0:30</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-red-500 px-2 py-0.5 rounded text-xs font-bold">DEMO</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente de item de archivo
function FileItemComponent({ 
  item, 
  onSelect,
  onDownloadAttempt,
  depth = 0 
}: { 
  item: FileItem
  onSelect: (item: FileItem) => void
  onDownloadAttempt: (fileName: string) => void
  depth?: number 
}) {
  const [isOpen, setIsOpen] = useState(depth === 0)

  const handleClick = () => {
    if (item.type === 'folder') {
      setIsOpen(!isOpen)
    } else {
      onSelect(item)
    }
  }

  const getIcon = () => {
    if (item.type === 'folder') return isOpen ? '📂' : '📁'
    if (item.type === 'video') return '🎬'
    if (item.type === 'audio') return '🎵'
    return '📄'
  }

  return (
    <div>
      <div
        className={`
          flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
          ${item.type === 'folder' ? 'hover:bg-bear-blue/10' : 'hover:bg-white/5'}
          ${depth > 0 ? 'ml-6' : ''}
        `}
        onClick={handleClick}
      >
        <span className="text-2xl">{getIcon()}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-medium truncate ${item.type === 'folder' ? 'text-bear-blue' : 'text-white'}`}>
            {item.name}
          </p>
          {item.type === 'video' && (
            <p className="text-xs text-gray-500">
              {item.duration} • {item.size}
            </p>
          )}
        </div>
        
        {/* Botones de acción para videos */}
        {item.type === 'video' && (
          <div className="flex gap-2">
            <button 
              className="px-3 py-1 bg-bear-blue/20 text-bear-blue rounded text-sm font-bold hover:bg-bear-blue/30"
              onClick={(e) => { e.stopPropagation(); onSelect(item) }}
            >
              👁️ Ver
            </button>
            <button 
              className="px-3 py-1 bg-bear-blue/20 text-bear-blue rounded text-sm font-bold hover:bg-bear-blue/30"
              onClick={(e) => { e.stopPropagation(); onDownloadAttempt(item.name) }}
            >
              ⬇️ Descargar
            </button>
          </div>
        )}

        {item.type === 'folder' && (
          <span className="text-gray-500 text-sm">
            {item.children?.length || 0} items
          </span>
        )}
      </div>

      {/* Children */}
      {item.type === 'folder' && isOpen && item.children && (
        <div className="border-l-2 border-bear-blue/20 ml-4">
          {item.children.map((child) => (
            <FileItemComponent
              key={child.id}
              item={child}
              onSelect={onSelect}
              onDownloadAttempt={onDownloadAttempt}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Página principal
export default function PreviewPage() {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallFileName, setPaywallFileName] = useState('')

  useEffect(() => {
    trackPageView('preview_contenido')
    
    // Bloquear atajos de teclado
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloquear Ctrl+S, Ctrl+Shift+I, F12
      if (
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.shiftKey && e.key === 'i') ||
        e.key === 'F12'
      ) {
        e.preventDefault()
        handleDownloadAttempt('contenido protegido')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleDownloadAttempt = (fileName: string) => {
    setPaywallFileName(fileName)
    setShowPaywall(true)
    trackCTAClick('download_attempt', 'preview', fileName)
  }

  // Contar total de videos
  const countVideos = (items: FileItem[]): number => {
    return items.reduce((count, item) => {
      if (item.type === 'video') return count + 1
      if (item.children) return count + countVideos(item.children)
      return count
    }, 0)
  }

  const totalVideos = countVideos(DEMO_STRUCTURE)

  return (
    <div 
      className="min-h-screen bg-bear-black text-white"
      onContextMenu={(e) => { e.preventDefault(); handleDownloadAttempt('contenido') }}
    >
      {/* Header */}
      <header className="py-4 px-4 border-b border-bear-blue/20 sticky top-0 bg-bear-black/95 backdrop-blur z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/logos/BBIMAGOTIPOFONDOTRANSPARENTE_Mesa de trabajo 1_Mesa de trabajo 1.png"
              alt="Bear Beat"
              width={40}
              height={40}
            />
            <span className="font-bold text-bear-blue">BEAR BEAT</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden md:block">
              Viendo {totalVideos} videos de muestra
            </span>
            <Link href="/checkout?pack=enero-2026">
              <button className="bg-bear-blue text-bear-black font-bold px-6 py-2 rounded-lg hover:bg-bear-blue/90">
                Comprar Acceso
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Banner de demo */}
      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-b border-yellow-500/30 py-3 px-4 text-center">
        <p className="text-sm md:text-base">
          <span className="font-bold text-yellow-400">👀 MODO PREVIEW:</span>
          {' '}Estás viendo demos de baja calidad. 
          <Link href="/checkout" className="text-bear-blue font-bold hover:underline ml-2">
            Obtén acceso completo →
          </Link>
        </p>
      </div>

      <main className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Explorador de archivos */}
            <div className="bg-white/5 border border-bear-blue/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>📁</span> Explorador de Archivos
                </h2>
                <span className="text-sm text-gray-500">
                  {totalVideos} videos
                </span>
              </div>

              <div className="space-y-1 max-h-[600px] overflow-y-auto pr-2">
                {DEMO_STRUCTURE.map((item) => (
                  <FileItemComponent
                    key={item.id}
                    item={item}
                    onSelect={setSelectedFile}
                    onDownloadAttempt={handleDownloadAttempt}
                  />
                ))}
              </div>
            </div>

            {/* Preview del video seleccionado */}
            <div className="space-y-6">
              {selectedFile ? (
                <>
                  <div className="bg-white/5 border border-bear-blue/20 rounded-2xl p-6">
                    <h3 className="text-lg font-bold mb-4 truncate">
                      🎬 {selectedFile.name}
                    </h3>
                    
                    <ProtectedVideoPlayer
                      previewUrl={selectedFile.previewUrl}
                      thumbnail={selectedFile.thumbnail}
                      name={selectedFile.name}
                      onDownloadAttempt={() => handleDownloadAttempt(selectedFile.name)}
                    />

                    <div className="mt-4 flex flex-wrap gap-3">
                      <span className="bg-bear-blue/20 text-bear-blue px-3 py-1 rounded-full text-sm">
                        📐 1920x1080
                      </span>
                      <span className="bg-bear-blue/20 text-bear-blue px-3 py-1 rounded-full text-sm">
                        ⏱️ {selectedFile.duration}
                      </span>
                      <span className="bg-bear-blue/20 text-bear-blue px-3 py-1 rounded-full text-sm">
                        💾 {selectedFile.size}
                      </span>
                    </div>
                  </div>

                  {/* CTA de descarga */}
                  <div className="bg-gradient-to-r from-bear-blue/20 to-cyan-500/20 border border-bear-blue/30 rounded-2xl p-6 text-center">
                    <p className="text-lg mb-4">
                      ¿Te gusta este video? <strong>Obtén este y 3,246 más</strong>
                    </p>
                    <Link href="/checkout?pack=enero-2026">
                      <button 
                        className="bg-bear-blue text-bear-black font-black text-lg px-8 py-4 rounded-xl hover:bg-bear-blue/90"
                        onClick={() => trackCTAClick('preview_cta', 'preview', selectedFile.name)}
                      >
                        DESCARGAR TODO POR $350 MXN →
                      </button>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="bg-white/5 border border-bear-blue/20 rounded-2xl p-12 text-center">
                  <div className="text-6xl mb-4">👈</div>
                  <h3 className="text-xl font-bold mb-2">Selecciona un video</h3>
                  <p className="text-gray-400">
                    Haz clic en cualquier video del explorador para ver una preview
                  </p>
                </div>
              )}

              {/* Info del pack */}
              <div className="bg-white/5 border border-bear-blue/20 rounded-2xl p-6">
                <h3 className="font-bold mb-4">📦 Contenido del Pack Enero 2026</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-bear-blue/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-black text-bear-blue">3,247</p>
                    <p className="text-gray-400">Videos</p>
                  </div>
                  <div className="bg-bear-blue/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-black text-bear-blue">15+</p>
                    <p className="text-gray-400">Géneros</p>
                  </div>
                  <div className="bg-bear-blue/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-black text-bear-blue">4K</p>
                    <p className="text-gray-400">Calidad</p>
                  </div>
                  <div className="bg-bear-blue/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-black text-bear-blue">∞</p>
                    <p className="text-gray-400">Acceso</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Paywall Modal */}
      <PaywallModal 
        isOpen={showPaywall} 
        onClose={() => setShowPaywall(false)}
        fileName={paywallFileName}
      />

      {/* Footer simple */}
      <footer className="py-8 px-4 border-t border-bear-blue/20 text-center">
        <p className="text-gray-500 text-sm">
          Estás viendo demos de muestra. Para acceso completo,{' '}
          <Link href="/checkout" className="text-bear-blue hover:underline">
            obtén tu acceso aquí
          </Link>
        </p>
      </footer>
    </div>
  )
}
