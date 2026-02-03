# Verificación: portadas, demos, videos y descargas

Todo usa el **mismo prefijo** (`BUNNY_PACK_PATH_PREFIX`, ej. `Videos Enero 2026`) y las mismas rutas relativas para que portadas, demos, descargas y descargas por carpeta funcionen igual.

---

## 1. Portadas (thumbnails)

| Origen | Ruta / API | Comportamiento |
|--------|------------|----------------|
| **Listado** | `/api/videos` devuelve `thumbnailUrl` o path relativo (ej. `Genre/file.jpg`) | El front pide `/api/thumbnail-cdn?path=Genre/file.jpg` |
| **thumbnail-cdn** | `GET /api/thumbnail-cdn?path=Genre/file.jpg` | Normaliza path (quita prefijo si viene), arma `prefix/path` → redirige (302) a URL firmada de Bunny. Si Bunny no configurado → stream desde FTP o placeholder. |
| **thumbnail-from-video** | `GET /api/thumbnail-from-video?path=Genre/Video.mp4` | Si no hay thumb en DB: descarga trozo del video desde Bunny, extrae frame con ffmpeg, sube .jpg a Bunny, guarda en DB, redirige a thumbnail-cdn. |

**Requisitos:** `BUNNY_CDN_URL`, `BUNNY_TOKEN_KEY`, `BUNNY_PACK_PATH_PREFIX`. Para generar on-demand: `BUNNY_STORAGE_PASSWORD` y ffmpeg en el servidor (o thumbnails ya subidos a Bunny).

---

## 2. Demos (preview de videos)

| Origen | Ruta / API | Comportamiento |
|--------|------------|----------------|
| **Front** | `<video src="/api/demo-url?path=Genre/Video.mp4" />` | Pide URL de demo |
| **demo-url** | `GET /api/demo-url?path=Genre/Video.mp4` | Normaliza path, arma `prefix/path` → redirige (302) a URL firmada de Bunny (30 min). Si Bunny no configurado → stream desde FTP. |

**Requisitos:** Mismo prefijo y archivos en Bunny Storage en `BUNNY_PACK_PATH_PREFIX/Genre/Video.mp4`. Si no están en Bunny, fallback FTP (stream desde Hetzner).

---

## 3. Descargas (archivo suelto)

| Origen | Ruta / API | Comportamiento |
|--------|------------|----------------|
| **Front** | `/api/download?file=Genre/video.mp4` o `...?file=Reggaeton.zip` | Solo con sesión y compra activa |
| **download** | `GET /api/download?file=...` | Comprueba auth y compra → arma `prefix/sanitizedPath` → redirige (302) a URL firmada Bunny. Si Bunny falla y hay FTP → stream desde FTP. |

**Requisitos:** Archivos en Bunny Storage en `BUNNY_PACK_PATH_PREFIX/Genre/video.mp4` (o ZIP en la misma jerarquía). Token Authentication en la Pull Zone con `BUNNY_TOKEN_KEY`.

---

## 4. Descargas por carpeta (/api/files)

| Origen | Ruta / API | Comportamiento |
|--------|------------|----------------|
| **GET /api/files** | Lista archivos del pack (requiere compra) | Llama a `listFilesRecursive(prefix)` en Bunny Storage → devuelve árbol con rutas relativas (ej. `Genre/video.mp4`) para usar en `/api/download?file=...`. |
| **POST /api/files** | Pide URL firmada para un archivo | Recibe `filePath` relativo (ej. `Genre/video.mp4`) → arma `prefix/filePath` → devuelve URL firmada (misma lógica que download). |

**Requisitos:** `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_PASSWORD` para listar; mismo `BUNNY_PACK_PATH_PREFIX` que download. Listado es **recursivo** para mostrar todos los archivos en subcarpetas.

---

## 5. Resumen de rutas y prefijo

- **Prefijo único:** `getBunnyPackPrefix()` (lee `BUNNY_PACK_PATH_PREFIX` o `BUNNY_PACK_PREFIX`). Se usa en:
  - `thumbnail-cdn`, `thumbnail-from-video`, `demo-url`, `download`, `files` (GET y POST).
- **Ruta en Bunny:** siempre `prefix + "/" + pathRelativo` (ej. `Videos Enero 2026/Genre/video.mp4`).
- **Path relativo:** sin prefijo ni barra inicial (ej. `Genre/video.mp4`, `Genre/file.jpg`). Todas las APIs normalizan quitando `Videos Enero 2026/` si viene en el query.

---

## 6. Checklist rápido

- [ ] **Bunny:** `BUNNY_CDN_URL`, `BUNNY_TOKEN_KEY`, `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_PASSWORD`, `BUNNY_PACK_PATH_PREFIX` en Render y en `.env.local`.
- [ ] **Archivos en Bunny:** Videos y/o ZIPs (y opcionalmente .jpg) bajo `BUNNY_PACK_PATH_PREFIX` (misma estructura que en FTP). Si no: ejecutar `npm run db:sync-videos-to-bunny` y/o subir thumbnails con `node scripts/generate-thumbnails-from-videos.js --all`.
- [ ] **Pull Zone:** Token Authentication activada con la clave que está en `BUNNY_TOKEN_KEY`.
- [ ] **Probar:** Portadas en /contenido, demo de un video, descarga de un archivo, listado en GET /api/files (con usuario con compra).

Si algo falla: revisar `/api/debug-config` (Bunny y variables) y logs del servidor (errores de thumbnail-cdn, demo-url, download, files).
