/**
 * Abre la URL de descarga en nueva pestaña mediante un clic en un enlace.
 * Así el navegador trata la descarga como acción del usuario y no suele bloquearla.
 */
function openDownloadInNewTab(href: string): void {
  const a = document.createElement('a')
  a.href = href
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

const DOWNLOAD_FETCH_TIMEOUT_MS = 20_000 // 20 s para obtener 302/401/503 (evita colgar si el servidor no responde)

/**
 * Descarga un archivo vía /api/download.
 * Si el servidor redirige (302) a CDN, abre esa URL en nueva pestaña (con enlace para evitar bloqueo de popups).
 * Si el servidor devuelve el archivo (200), lo descarga por blob.
 */
export async function downloadFile(fileParam: string): Promise<void> {
  const url = `/api/download?file=${encodeURIComponent(fileParam)}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_FETCH_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(url, { credentials: 'include', redirect: 'manual', signal: controller.signal })
  } catch (e) {
    clearTimeout(timeoutId)
    if ((e as Error)?.name === 'AbortError') {
      throw new Error('La descarga tardó demasiado en responder. Prueba de nuevo o descarga por FTP desde tu panel.')
    }
    throw e
  }
  clearTimeout(timeoutId)

  if (res.type === 'opaqueredirect' || res.status === 302) {
    const location = res.headers.get('Location')
    const targetUrl = location || url
    openDownloadInNewTab(targetUrl)
    return
  }
  if (!res.ok) {
    const text = await res.text()
    let err: Error
    try {
      const json = JSON.parse(text)
      const msg = [json.error, json.message].filter(Boolean).join(' — ') || res.statusText
      err = new Error(msg || 'Error al descargar')
    } catch {
      err = new Error(res.statusText || text || 'Error al descargar')
    }
    throw err
  }

  // Si la respuesta es JSON (ej. error que devolvió 200 por proxy/cache), mostrar mensaje
  const contentType = res.headers.get('Content-Type') || ''
  if (contentType.includes('application/json')) {
    const json = await res.json().catch(() => ({}))
    throw new Error((json.error || json.message || 'El servidor devolvió un error.').toString())
  }

  let blob: Blob
  try {
    blob = await res.blob()
  } catch (e) {
    throw new Error('La descarga se interrumpió. Prueba de nuevo o descarga por FTP desde tu panel.')
  }
  const disposition = res.headers.get('Content-Disposition')
  let filename = fileParam.split('/').pop() || fileParam.split(/[/\\]/).pop() || 'download'
  if (disposition) {
    const match = disposition.match(/filename="?([^";\n]+)"?/)
    if (match?.[1]) filename = match[1].replace(/\\"/g, '"').trim()
  }
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}
