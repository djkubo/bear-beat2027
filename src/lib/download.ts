/**
 * Descarga sin abrir nuevas pestañas/ventanas.
 *
 * Estrategia:
 * - Iniciamos la descarga con un iframe oculto (navegación real del navegador).
 * - Si la respuesta es un JSON de error (401/403/503), intentamos leerlo (same-origin)
 *   y lanzamos una excepción para que la UI muestre el mensaje.
 *
 * Ventajas:
 * - No abre tabs (mejor UX).
 * - Mantiene la descarga como "download" nativo del navegador (continúa aunque cambies de página).
 */

let downloadIframe: HTMLIFrameElement | null = null

function getOrCreateDownloadIframe(): HTMLIFrameElement {
  if (downloadIframe && document.body.contains(downloadIframe)) return downloadIframe
  const iframe = document.createElement('iframe')
  iframe.title = 'Bear Beat Download'
  iframe.setAttribute('aria-hidden', 'true')
  iframe.tabIndex = -1
  // No usar display:none: algunos navegadores bloquean descargas desde iframes no "renderizados".
  iframe.style.position = 'fixed'
  iframe.style.left = '-9999px'
  iframe.style.top = '-9999px'
  iframe.style.width = '1px'
  iframe.style.height = '1px'
  iframe.style.border = '0'
  iframe.style.opacity = '0'
  document.body.appendChild(iframe)
  downloadIframe = iframe
  return iframe
}

/**
 * Inicia una descarga nativa del navegador usando un iframe oculto.
 * Resuelve cuando la descarga se "dispara" (no cuando termina).
 */
export async function downloadFile(fileParam: string): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const baseUrl = `/api/download?file=${encodeURIComponent(fileParam)}`
  const url = `${baseUrl}&_dl=${Date.now()}`

  const iframe = getOrCreateDownloadIframe()

  // Usamos una promesa para poder surfacear errores JSON de auth/not-found.
  await new Promise<void>((resolve, reject) => {
    let settled = false
    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      iframe.removeEventListener('load', onLoad)
      clearTimeout(timer)
      fn()
    }

    const timer = window.setTimeout(() => {
      // Si no hubo load, asumimos que el navegador disparó la descarga (o siguió un redirect cross-origin).
      settle(resolve)
    }, 1500)

    const onLoad = () => {
      // Si es same-origin y devolvió JSON, podemos leerlo.
      try {
        const doc = iframe.contentDocument
        const text = doc?.body?.innerText?.trim()
        if (text && text.startsWith('{')) {
          const json = JSON.parse(text)
          const msg = [json.error, json.message].filter(Boolean).join(' — ')
          if (msg) {
            settle(() => reject(new Error(msg)))
            return
          }
        }
      } catch {
        // Cross-origin (Bunny) u otra restricción: no podemos inspeccionar, pero la descarga ya debió iniciar.
      }
      settle(resolve)
    }

    iframe.addEventListener('load', onLoad)

    // Disparar descarga
    iframe.src = url
  })
}
