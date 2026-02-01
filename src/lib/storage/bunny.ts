// ==========================================
// BUNNY.NET - Storage y Streaming Protegido
// ==========================================

import crypto from 'crypto'

// Configuración
const BUNNY_API_KEY = process.env.BUNNY_API_KEY || ''
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || 'bear-beat'
const BUNNY_STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD || ''
const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL || 'https://bear-beat.b-cdn.net'
const BUNNY_STREAM_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID || ''
const BUNNY_STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY || ''

// Token de seguridad para URLs firmadas
const BUNNY_TOKEN_KEY = process.env.BUNNY_TOKEN_KEY || ''

/**
 * Indica si Bunny CDN está configurado para entrega (URLs firmadas).
 * Si es true, /api/download puede redirigir al CDN en vez de hacer stream desde Hetzner.
 */
export function isBunnyCDNConfigured(): boolean {
  return !!(BUNNY_CDN_URL && BUNNY_TOKEN_KEY && BUNNY_STORAGE_ZONE)
}

/**
 * Indica si Bunny Storage está configurado para listar/leer (ZIP desde Bunny).
 */
export function isBunnyStorageConfigured(): boolean {
  return !!(BUNNY_STORAGE_ZONE && BUNNY_STORAGE_PASSWORD)
}

/**
 * Genera URL firmada que expira
 * Solo funciona por X tiempo y desde tu dominio
 */
export function generateSignedUrl(
  filePath: string, 
  expiresInSeconds: number = 3600,
  allowedReferrer?: string
): string {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds
  const pathForToken = `/${filePath}`
  
  // Crear hash de seguridad
  const hashableBase = BUNNY_TOKEN_KEY + pathForToken + expires.toString()
  const token = crypto
    .createHash('sha256')
    .update(hashableBase)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  // URL con token y expiración
  let url = `${BUNNY_CDN_URL}${pathForToken}?token=${token}&expires=${expires}`
  
  // Si hay referrer permitido, agregarlo
  if (allowedReferrer) {
    const refHash = crypto
      .createHash('sha256')
      .update(allowedReferrer)
      .digest('base64')
      .substring(0, 8)
    url += `&token_countries=MX,US&token_referrer=${refHash}`
  }

  return url
}

/**
 * Genera URL de streaming para demos (HLS)
 * El video se puede ver pero no descargar fácilmente
 */
export function generateStreamUrl(
  videoId: string,
  expiresInSeconds: number = 1800 // 30 min para demos
): string {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds
  
  // Token para Bunny Stream
  const hashableBase = BUNNY_STREAM_API_KEY + videoId + expires.toString()
  const token = crypto
    .createHash('sha256')
    .update(hashableBase)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  return `https://iframe.mediadelivery.net/embed/${BUNNY_STREAM_LIBRARY_ID}/${videoId}?token=${token}&expires=${expires}&autoplay=false&preload=true`
}

/**
 * Subir archivo a Bunny Storage
 */
export async function uploadFile(
  filePath: string,
  fileBuffer: Buffer
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${filePath}`,
      {
        method: 'PUT',
        headers: {
          'AccessKey': BUNNY_STORAGE_PASSWORD,
          'Content-Type': 'application/octet-stream',
        },
        body: fileBuffer,
      }
    )

    if (response.ok) {
      return { 
        success: true, 
        url: `${BUNNY_CDN_URL}/${filePath}` 
      }
    }

    return { 
      success: false, 
      error: `Upload failed: ${response.status}` 
    }
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message 
    }
  }
}

/**
 * Listar archivos de una carpeta (Bunny Storage).
 * Para root usar folderPath ''.
 */
export async function listFiles(
  folderPath: string = ''
): Promise<BunnyFile[]> {
  try {
    const pathPart = folderPath ? `${folderPath}/` : ''
    const response = await fetch(
      `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${pathPart}`,
      {
        headers: {
          'AccessKey': BUNNY_STORAGE_PASSWORD,
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`List failed: ${response.status}`)
    }

    const files = await response.json()
    return Array.isArray(files) ? files : []
  } catch (error) {
    console.error('Error listing files:', error)
    return []
  }
}

/**
 * Obtener stream de un archivo desde Bunny Storage (para ZIP).
 * Devuelve Node Readable para usar con archiver.
 */
export async function getBunnyFileStream(
  filePath: string
): Promise<NodeJS.ReadableStream | null> {
  if (!isBunnyStorageConfigured()) return null
  try {
    const response = await fetch(
      `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${filePath}`,
      { headers: { 'AccessKey': BUNNY_STORAGE_PASSWORD } }
    )
    if (!response.ok || !response.body) return null
    const { Readable } = await import('stream')
    return Readable.fromWeb(response.body as import('stream').web.ReadableStream)
  } catch (e) {
    console.error('Bunny getBunnyFileStream error:', filePath, e)
    return null
  }
}

/**
 * Eliminar archivo
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${filePath}`,
      {
        method: 'DELETE',
        headers: {
          'AccessKey': BUNNY_STORAGE_PASSWORD,
        },
      }
    )
    return response.ok
  } catch (error) {
    return false
  }
}

/**
 * Subir video a Bunny Stream (para demos con streaming protegido)
 */
export async function uploadToStream(
  title: string,
  videoUrl: string // URL del video a procesar
): Promise<{ success: boolean; videoId?: string; error?: string }> {
  try {
    // Crear video en la biblioteca
    const createResponse = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos`,
      {
        method: 'POST',
        headers: {
          'AccessKey': BUNNY_STREAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      }
    )

    if (!createResponse.ok) {
      return { success: false, error: 'Failed to create video' }
    }

    const video = await createResponse.json()

    // Subir desde URL
    const uploadResponse = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${video.guid}/fetch`,
      {
        method: 'POST',
        headers: {
          'AccessKey': BUNNY_STREAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl }),
      }
    )

    if (uploadResponse.ok) {
      return { success: true, videoId: video.guid }
    }

    return { success: false, error: 'Failed to upload video' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Obtener info de video en Stream
 */
export async function getStreamVideoInfo(videoId: string): Promise<StreamVideo | null> {
  try {
    const response = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
      {
        headers: {
          'AccessKey': BUNNY_STREAM_API_KEY,
        },
      }
    )

    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

// Tipos
export interface BunnyFile {
  Guid: string
  StorageZoneName: string
  Path: string
  ObjectName: string
  Length: number
  LastChanged: string
  IsDirectory: boolean
  ServerId: number
  ArrayNumber: number
  DateCreated: string
  UserId: string
  ContentType: string
  StorageZoneId: number
  Checksum: string
  ReplicatedZones: string
}

export interface StreamVideo {
  videoLibraryId: number
  guid: string
  title: string
  dateUploaded: string
  views: number
  isPublic: boolean
  length: number
  status: number
  framerate: number
  width: number
  height: number
  availableResolutions: string
  thumbnailCount: number
  encodeProgress: number
  storageSize: number
  hasMP4Fallback: boolean
  collectionId: string
  thumbnailFileName: string
  averageWatchTime: number
  totalWatchTime: number
  category: string
  chapters: any[]
  moments: any[]
  metaTags: any[]
  transcodingMessages: any[]
}
