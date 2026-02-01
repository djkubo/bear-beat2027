'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ==========================================
// EXPLORADOR DE ARCHIVOS - Para usuarios con acceso
// ==========================================

export interface FileNode {
  id: string
  name: string
  type: 'folder' | 'video' | 'audio' | 'file'
  path: string
  size?: number
  sizeFormatted?: string
  duration?: string
  thumbnail?: string
  downloadUrl?: string
  children?: FileNode[]
}

interface FileExplorerProps {
  files: FileNode[]
  onDownload: (file: FileNode) => void
  onPreview: (file: FileNode) => void
  canDownload: boolean
}

export function FileExplorer({ files, onDownload, onPreview, canDownload }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']))
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [searchQuery, setSearchQuery] = useState('')

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const getIcon = (type: string, isOpen?: boolean) => {
    switch (type) {
      case 'folder': return isOpen ? '📂' : '📁'
      case 'video': return '🎬'
      case 'audio': return '🎵'
      default: return '📄'
    }
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  // Filtrar archivos por búsqueda
  const filterFiles = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query) return nodes
    
    return nodes.reduce((acc: FileNode[], node) => {
      if (node.name.toLowerCase().includes(query.toLowerCase())) {
        acc.push(node)
      } else if (node.children) {
        const filteredChildren = filterFiles(node.children, query)
        if (filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren })
        }
      }
      return acc
    }, [])
  }

  const filteredFiles = filterFiles(files, searchQuery)

  // Renderizar item de archivo
  const renderFileItem = (node: FileNode, depth: number = 0) => {
    const isFolder = node.type === 'folder'
    const isExpanded = expandedFolders.has(node.id)
    const isSelected = selectedFile?.id === node.id

    return (
      <div key={node.id}>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`
            flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
            ${isSelected ? 'bg-bear-blue/20 border border-bear-blue/50' : 'hover:bg-white/5'}
          `}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.id)
            } else {
              setSelectedFile(node)
              onPreview(node)
            }
          }}
        >
          {/* Icono */}
          <span className="text-2xl flex-shrink-0">
            {getIcon(node.type, isExpanded)}
          </span>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className={`font-medium truncate ${isFolder ? 'text-bear-blue' : 'text-white'}`}>
              {node.name}
            </p>
            {!isFolder && (
              <p className="text-xs text-gray-500">
                {node.duration && `${node.duration} • `}
                {node.sizeFormatted || formatSize(node.size)}
              </p>
            )}
          </div>

          {/* Contador de items para carpetas */}
          {isFolder && node.children && (
            <span className="text-sm text-gray-500">
              {node.children.length} items
            </span>
          )}

          {/* Botones de acción para archivos */}
          {!isFolder && canDownload && (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onPreview(node)}
                className="px-3 py-1.5 bg-bear-blue/20 text-bear-blue rounded-lg text-sm font-medium hover:bg-bear-blue/30 transition-colors"
              >
                👁️ Ver
              </button>
              <button
                onClick={() => onDownload(node)}
                className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
              >
                ⬇️ Descargar
              </button>
            </div>
          )}

          {/* Flecha para carpetas */}
          {isFolder && (
            <span className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
          )}
        </motion.div>

        {/* Children */}
        <AnimatePresence>
          {isFolder && isExpanded && node.children && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {node.children.map((child) => renderFileItem(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Contar totales
  const countFiles = (nodes: FileNode[]): { files: number; folders: number; size: number } => {
    return nodes.reduce((acc, node) => {
      if (node.type === 'folder') {
        acc.folders++
        if (node.children) {
          const childCounts = countFiles(node.children)
          acc.files += childCounts.files
          acc.folders += childCounts.folders
          acc.size += childCounts.size
        }
      } else {
        acc.files++
        acc.size += node.size || 0
      }
      return acc
    }, { files: 0, folders: 0, size: 0 })
  }

  const totals = countFiles(files)

  return (
    <div className="bg-white/5 border border-bear-blue/20 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-bear-blue/20 bg-bear-blue/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span>📁</span> Explorador de Archivos
            </h3>
            <p className="text-sm text-gray-500">
              {totals.files} archivos en {totals.folders} carpetas • {formatSize(totals.size)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Búsqueda */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/10 border border-bear-blue/30 rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:border-bear-blue w-48"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                🔍
              </span>
            </div>

            {/* View mode toggle */}
            <div className="flex bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-bear-blue text-bear-black' : 'text-gray-400'}`}
              >
                ≡
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'grid' ? 'bg-bear-blue text-bear-black' : 'text-gray-400'}`}
              >
                ⊞
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* File list */}
      <div className="max-h-[600px] overflow-y-auto p-2">
        {filteredFiles.length > 0 ? (
          filteredFiles.map((node) => renderFileItem(node))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-2">🔍</p>
            <p>No se encontraron archivos</p>
          </div>
        )}
      </div>

      {/* Footer con acciones masivas */}
      {canDownload && (
        <div className="p-4 border-t border-bear-blue/20 bg-bear-blue/5">
          <div className="flex flex-wrap gap-3">
            <button className="flex items-center gap-2 bg-bear-blue/20 text-bear-blue px-4 py-2 rounded-lg text-sm font-medium hover:bg-bear-blue/30">
              ⬇️ Descargar Todo (ZIP)
            </button>
            <button className="flex items-center gap-2 bg-white/10 text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-white/20">
              📋 Copiar datos FTP
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
