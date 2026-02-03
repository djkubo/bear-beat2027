# Configuración: Demos, Descargas y Thumbnails

Para que **demos**, **descargas** y **portadas (thumbnails)** funcionen en producción (Render), configura **Bunny CDN** o **FTP** (o ambos; FTP sirve de fallback).

---

## Variables en Render → Environment

### Bunny CDN (recomendado: demos sin timeout, thumbnails y descargas)

| Variable | Obligatorio | Ejemplo | Uso |
|----------|-------------|---------|-----|
| `NEXT_PUBLIC_BUNNY_CDN_URL` | Sí | `https://bear-beat.b-cdn.net` | URL de la Pull Zone (sin barra final). |
| `BUNNY_TOKEN_KEY` | Sí | *(Security Key de la Pull Zone)* | Token Authentication en Bunny → Pull Zone → Security. |
| `BUNNY_PACK_PATH_PREFIX` o `BUNNY_PACK_PREFIX` | Opcional | `packs/enero-2026` | Si los archivos en Bunny están dentro de una carpeta; si están en la raíz, déjalo vacío. |

- **Demos:** redirect (302) a la URL firmada de Bunny; el navegador carga el video desde el CDN (no hay timeout 502).
- **Thumbnails:** redirect a URL firmada.
- **Descargas (video y ZIP):** redirect (302) a la URL firmada; el navegador descarga desde el CDN. Si Bunny falla, se usa FTP (stream).

### FTP (fallback o único origen)

| Variable | Obligatorio | Uso |
|----------|-------------|-----|
| `FTP_HOST` (o `HETZNER_FTP_HOST`) | Sí | Host FTP. |
| `FTP_USER` (o `HETZNER_FTP_USER`) | Sí | Usuario. |
| `FTP_PASSWORD` (o `HETZNER_FTP_PASSWORD`) | Sí | Contraseña. |
| `FTP_BASE_PATH` (opcional) | No | Ej. `Videos Enero 2026`; por defecto se usa ese valor. |

Si **no** configuras Bunny pero sí FTP, demos, descargas y thumbnails se sirven por stream desde el FTP (puede haber timeout en archivos muy grandes).

---

## Comprobación

1. **Demos:** en la web, abre un género y reproduce un video de demo → debe cargar (o redirect a Bunny).
2. **Thumbnails:** las portadas de los videos deben verse en la lista.
3. **Descargas:** con usuario logueado y compra activa, descargar un video o ZIP debe funcionar.

Si ves **502** o **503**: revisa que las variables estén en Render → Environment y que hayas hecho **Manual Deploy** después de añadirlas.

Más detalles: [BUNNY_HETZNER_INTEGRACION.md](./BUNNY_HETZNER_INTEGRACION.md), [BUNNY_PULL_ZONE_SETUP.md](./BUNNY_PULL_ZONE_SETUP.md).
