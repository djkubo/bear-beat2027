# Por qué no se ven los videos (Hetzner) y cómo arreglarlo

## Qué pasa

La web **no lee la lista de videos desde Hetzner en tiempo real**. El listado sale de:

1. **Producción (Render):** tabla `videos` en **Supabase**.
2. **Local (dev):** carpeta en disco `VIDEOS_PATH` o `Videos Enero 2026`.

Si la tabla `videos` está vacía → en la web aparecen los géneros pero **0 videos**. Los archivos pueden estar en el FTP de Hetzner, pero el catálogo tiene que estar en Supabase.

## Cómo hacer que se vean

### Opción A: Videos en Hetzner FTP (recomendado)

1. En `.env.local` pon las credenciales de un usuario FTP que pueda **listar** carpetas (solo lectura basta):

   ```env
   FTP_HOST=tu-servidor-ftp.hetzner.com
   FTP_USER=usuario
   FTP_PASSWORD=contraseña
   ```

2. En la raíz del FTP debe haber **carpetas por género** (ej. `Bachata`, `Cumbia`) y dentro los `.mp4` (nombre tipo `Artista - Título.mp4`).

3. Sincroniza el catálogo a Supabase (solo metadata, no baja archivos):

   ```bash
   npm run db:sync-videos-ftp
   ```

4. Recarga la página de Contenido: deberías ver todos los videos listados.

### Opción B: Videos en una carpeta local

Si ya tienes la misma estructura en tu PC (por ejemplo descargada del FTP):

```bash
npm run db:sync-videos
# o con ruta:
node scripts/sync-videos-to-supabase.js "./Videos Enero 2026"
```

## Demos, portadas y descargas: Bunny o FTP

La web puede servir **demos** (preview de video), **portadas** (thumbnails) y **descargas** (videos y ZIPs) de dos formas:

### Opción 1: Bunny CDN (recomendado si ya lo usas)

1. Configura en Render (o .env.local): `NEXT_PUBLIC_BUNNY_CDN_URL`, `BUNNY_TOKEN_KEY`, y opcionalmente `BUNNY_PACK_PATH_PREFIX=packs/enero-2026`.
2. Sube los archivos a Bunny Storage con la misma estructura que el catálogo.
3. `/api/demo-url`, `/api/thumbnail-cdn` y `/api/download` redirigen a URLs firmadas de Bunny.

### Opción 2: Todo desde Hetzner FTP (sin Bunny)

Si **no** configuras Bunny pero sí FTP (Hetzner Storage Box), la app hace **stream por proxy** desde el FTP:

- **Demos:** stream del video desde `{FTP_BASE_PATH}/{Genre}/{video.mp4}` (ej. `Videos Enero 2026/Bachata/Artista - Título.mp4`).
- **Portadas:** stream de la imagen desde la **raíz** del FTP: `{Genre}/{file.jpg}` (ej. `Bachata/Artista - Título.jpg`). Estas son las que subes con `scripts/upload-assets.ts`.
- **Descargas (usuario con compra):** stream de video o ZIP; los ZIPs se buscan en la raíz del FTP (ej. `Bachata.zip`, `Pack_Completo_Enero_2026.zip`).

**Variables en Render (o .env.local):**

```env
FTP_HOST=u540473.your-storagebox.de
FTP_USER=u540473
FTP_PASSWORD=tu_contraseña
FTP_BASE_PATH=Videos Enero 2026
```

O con prefijo Hetzner: `HETZNER_FTP_HOST`, `HETZNER_FTP_USER`, `HETZNER_FTP_PASSWORD`. Si `upload-assets.ts` te conectó con TLS, en Render pon `FTP_SECURE=true` para que demos/descargas/portadas también usen FTPS.

**Estructura esperada en el FTP:**

| Qué        | Ruta en el FTP                                      |
|-----------|------------------------------------------------------|
| Videos    | `Videos Enero 2026/Bachata/Artista - Título.mp4`     |
| Portadas  | `Bachata/Artista - Título.jpg` (en la raíz)          |
| ZIPs      | `Bachata.zip`, `Pack_Completo_Enero_2026.zip` (raíz) |

Los scripts `generate-local-assets.ts` (ZIPs + portadas en el SSD) y `upload-assets.ts` (sube a la raíz del FTP) ya generan esta estructura. El sync `sync-videos-from-ftp.js` lista videos desde `FTP_BASE_PATH` y llena la tabla `videos`; las portadas en la DB son `Genre/file.jpg` y se sirven desde la raíz del FTP.

- **Por archivo:** el botón de descarga en Contenido usa `/api/download` → si hay Bunny, redirección; si solo FTP, stream desde el servidor.
- **Por carpeta:** el usuario puede descargar el ZIP del género (cuando exista en el FTP) o usar **FTP** (FileZilla) con las credenciales del Dashboard.
