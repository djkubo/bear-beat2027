/**
 * Origen de los videos: carpeta local en el servidor o Hetzner Storage Box.
 * Si VIDEOS_BASE_PATH está definido y la carpeta existe, se usa disco local.
 * Si no, se usa Hetzner (con opcional HETZNER_VIDEOS_BASE_PATH, ej. "Videos Enero 2026").
 */

import fs from 'fs'
import path from 'path'

const VIDEOS_BASE_PATH = process.env.VIDEOS_BASE_PATH
  ? path.resolve(process.env.VIDEOS_BASE_PATH)
  : ''

/** Base path para listar en Hetzner (ej. "Videos Enero 2026"). Vacío = raíz. */
export function getHetznerVideosBasePath(): string {
  const base = (process.env.HETZNER_VIDEOS_BASE_PATH || '').trim()
  return base ? base.replace(/^\/+|\/+$/g, '') : ''
}

/** Ruta absoluta de la carpeta local de videos, o '' si no se usa local. */
export function getVideosBasePath(): string {
  return VIDEOS_BASE_PATH
}

/** true si los videos se sirven desde una carpeta local en el servidor. */
export function isLocalVideos(): boolean {
  if (!VIDEOS_BASE_PATH) return false
  try {
    return fs.existsSync(VIDEOS_BASE_PATH) && fs.statSync(VIDEOS_BASE_PATH).isDirectory()
  } catch {
    return false
  }
}

/**
 * Resuelve la ruta relativa del video al sistema de archivos local.
 * Solo válido si isLocalVideos() es true.
 */
export function resolveLocalVideoPath(relativePath: string): string {
  const sanitized = relativePath.replace(/\.\./g, '').replace(/^\/+/, '')
  return path.join(VIDEOS_BASE_PATH, sanitized)
}
