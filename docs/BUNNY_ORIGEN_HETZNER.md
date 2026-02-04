# Bunny CDN con origen en Hetzner

**En Bear Beat todos los archivos están en Hetzner.** El CDN (Bunny) debe jalar el contenido desde Hetzner; no hace falta subir nada a Bunny Storage.

## Configuración en Bunny

1. **Pull Zone** → **Origin** → **Origin type**: **Custom** / **Origin URL**.
2. **Origin URL:** URL base de tu **Hetzner Storage Box por WebDAV**:
   - Ejemplo: `https://u540473.your-storagebox.de`
   - Sin barra final. La obtienes en Hetzner Robot → Storage Box → acceso WebDAV.
3. Bunny hará peticiones a rutas como:
   - `https://uXXX.your-storagebox.de/Videos%20Enero%202026/Bachata/video.mp4` (demos/descargas)
   - `https://uXXX.your-storagebox.de/Bachata/portada.jpg` (portadas en raíz)

## Variables en Render

- **BUNNY_CDN_URL**: URL de la Pull Zone (ej. `https://bearbeat.b-cdn.net`), sin barra final.
- **BUNNY_TOKEN_KEY**: Token Authentication Key de la Pull Zone (Security).
- **BUNNY_PACK_PATH_PREFIX**: `Videos Enero 2026` (misma carpeta que en Hetzner para los videos).

Las portadas en Hetzner están en la **raíz** del Storage Box (`Género/archivo.jpg`). La app ya pide esas rutas sin prefijo para thumbnails.

## Resumen

Todo está en Hetzner. Bunny solo hace pull desde la URL de origen (Hetzner WebDAV) y cachea. No hay que duplicar archivos en Bunny Storage.

Ver también: [BUNNY_PULL_ZONE_SETUP.md](./BUNNY_PULL_ZONE_SETUP.md), [ESTRUCTURA_HETZNER_ZIPS_RUTAS_PORTADAS.md](./ESTRUCTURA_HETZNER_ZIPS_RUTAS_PORTADAS.md).
