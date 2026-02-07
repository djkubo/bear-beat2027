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

/** Abre un tab "preparando descarga" para que el popup no sea bloqueado (debe ejecutarse dentro del gesto del usuario). */
function openPreparingTab(): Window | null {
  try {
    const tab = window.open('', '_blank')
    if (!tab) return null
    try {
      tab.opener = null
    } catch {
      // ignore
    }
    try {
      // about:blank es same-origin; se puede escribir para feedback inmediato.
      tab.document.title = 'Preparando descarga...'
      tab.document.body.style.margin = '0'
      tab.document.body.style.background = '#000'
      tab.document.body.style.color = '#fff'
      tab.document.body.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
      tab.document.body.innerHTML = `
        <div style="display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;text-align:center;">
          <div style="max-width:520px">
            <div style="font-weight:800;font-size:18px;margin-bottom:8px;">Preparando tu descarga...</div>
            <div style="opacity:.75;font-size:14px;line-height:1.4">
              Si esta pestaña se queda aquí más de 20 segundos, vuelve e intenta de nuevo.
            </div>
          </div>
        </div>
      `
    } catch {
      // ignore
    }
    return tab
  } catch {
    return null
  }
}

/**
 * Descarga un archivo vía /api/download.
 * Si el servidor redirige (302) a CDN, abre esa URL en nueva pestaña (con enlace para evitar bloqueo de popups).
 * Si el servidor devuelve el archivo (200), navega esa pestaña a /api/download para que el navegador haga stream a disco
 * (evita descargar por blob y reventar memoria en videos grandes).
 */
export async function downloadFile(fileParam: string): Promise<void> {
  const url = `/api/download?file=${encodeURIComponent(fileParam)}`
  const tab = openPreparingTab()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_FETCH_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(url, { credentials: 'include', redirect: 'manual', signal: controller.signal })
  } catch (e) {
    clearTimeout(timeoutId)
    try {
      tab?.close()
    } catch {
      // ignore
    }
    if ((e as Error)?.name === 'AbortError') {
      throw new Error('La descarga tardó demasiado en responder. Prueba de nuevo o descarga por FTP desde tu panel.')
    }
    throw e
  }
  clearTimeout(timeoutId)

  if (res.type === 'opaqueredirect' || res.status === 302) {
    const location = res.headers.get('Location')
    const targetUrl = location || url
    if (tab && !tab.closed) {
      try {
        tab.location.href = targetUrl
      } catch {
        openDownloadInNewTab(targetUrl)
      }
    } else {
      openDownloadInNewTab(targetUrl)
    }
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
    try {
      tab?.close()
    } catch {
      // ignore
    }
    throw err
  }

  // Si la respuesta es JSON (ej. error que devolvió 200 por proxy/cache), mostrar mensaje
  const contentType = res.headers.get('Content-Type') || ''
  if (contentType.includes('application/json')) {
    const json = await res.json().catch(() => ({}))
    try {
      tab?.close()
    } catch {
      // ignore
    }
    throw new Error((json.error || json.message || 'El servidor devolvió un error.').toString())
  }

  // Evitar descargar por blob. Mejor navegar la pestaña a la URL para stream directo (mejor UX y menos memoria).
  try {
    controller.abort()
  } catch {
    // ignore
  }
  if (tab && !tab.closed) {
    try {
      tab.location.href = url
    } catch {
      openDownloadInNewTab(url)
    }
  } else {
    openDownloadInNewTab(url)
  }
}
