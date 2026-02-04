# Bunny CDN con origen en Hetzner

**En Bear Beat todos los archivos están en Hetzner.** El CDN (Bunny) debe jalar el contenido desde Hetzner; no hace falta subir nada a Bunny Storage.

## ¿Está todo documentado? ¿Va a funcionar?

Sí. Para que todo funcione solo necesitas:

1. **En Bunny:** Pull Zone → Origin → **Origin URL** = URL WebDAV de tu Hetzner Storage Box (ej. `https://u540473.your-storagebox.de`).
2. **En Render:** `BUNNY_CDN_URL`, `BUNNY_TOKEN_KEY`, `BUNNY_PACK_PATH_PREFIX` (ej. `Videos Enero 2026`).

No es necesario copiar archivos a Bunny Storage; Bunny los jala de Hetzner. Si quieres una copia “por si acaso”, más abajo se explica el script que ya tienes.

---

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

## ¿Hace falta subir/copiar archivos a Bunny?

**No.** Si configuras la Pull Zone con **Origin URL = Hetzner WebDAV**, Bunny jala todo de Hetzner en la primera petición y lo cachea. No necesitas subir nada a Bunny Storage.

## Copia Hetzner → Bunny (opcional, “por si acaso”)

Si quieres tener una **copia en Bunny Storage** (respaldo o por si algún día usas Storage como origen en vez de Hetzner), ya tienes un script:

- **`npm run db:sync-videos-to-bunny`** (o `node scripts/sync-videos-ftp-to-bunny.js`)
  - Sube **videos** (y .jpg/.zip en la carpeta de videos) y **portadas** (Género/archivo.jpg en la raíz del FTP) a Bunny Storage.
  - Requiere en `.env.local`: `FTP_*`, `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_PASSWORD`, `BUNNY_PACK_PATH_PREFIX`.
  - Opciones: `--videos-only`, `--thumbs-only`, `--dry-run`, `--limit N`. Por defecto sube videos y portadas (raíz FTP).

Las portadas (raíz FTP) se suben a la raíz de Bunny.

**Resumen:** Con origen = Hetzner no hace falta copia. Si quieres copia en Bunny: `npm run db:sync-videos-to-bunny` sube todo (videos + portadas).

---

## Resumen

Todo está en Hetzner. Bunny solo hace pull desde la URL de origen (Hetzner WebDAV) y cachea. No hay que duplicar archivos en Bunny Storage.

Ver también: [BUNNY_PULL_ZONE_SETUP.md](./BUNNY_PULL_ZONE_SETUP.md), [ESTRUCTURA_HETZNER_ZIPS_RUTAS_PORTADAS.md](./ESTRUCTURA_HETZNER_ZIPS_RUTAS_PORTADAS.md).
