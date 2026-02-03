/**
 * Descarga un archivo vía /api/download.
 * Si el servidor redirige (302) a CDN, abre esa URL en nueva pestaña para que el navegador descargue desde el CDN.
 * Si el servidor devuelve el archivo (200), lo descarga por blob.
 */
export async function downloadFile(fileParam: string): Promise<void> {
  const url = `/api/download?file=${encodeURIComponent(fileParam)}`
  const res = await fetch(url, { credentials: 'include', redirect: 'manual' })
  if (res.type === 'opaqueredirect' || res.status === 302) {
    const location = res.headers.get('Location')
    if (location) {
      window.open(location, '_blank', 'noopener,noreferrer')
      return
    }
    // Algunos navegadores no exponen Location con redirect: 'manual'; abrir la misma URL y el servidor redirigirá
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  if (!res.ok) {
    const text = await res.text()
    let err: Error
    try {
      const json = JSON.parse(text)
      err = new Error(json.error || res.statusText)
    } catch {
      err = new Error(res.statusText || 'Error al descargar')
    }
    throw err
  }
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition')
  let filename = fileParam.split('/').pop() || 'download'
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
