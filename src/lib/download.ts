/**
 * Descarga un archivo vía /api/download sin abrir ventana nueva.
 * El contenido se obtiene por fetch (proxy en servidor) y se dispara la descarga
 * con un <a> temporal, así no se expone la URL del CDN.
 */
export async function downloadFile(fileParam: string): Promise<void> {
  const url = `/api/download?file=${encodeURIComponent(fileParam)}`
  const res = await fetch(url, { credentials: 'include' })
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
