# Integración Bunny.net + Hetzner – Sin fallos

Documento de referencia para que **demos**, **portadas**, **descargas**, **descargas por carpeta** y **FTP** funcionen sin fallos. El usuario debe poder: entrar → ver → pagar → descargar.

---

## 1. Resumen por funcionalidad

| Funcionalidad | Dónde se usa | Depende de | Sin config → |
|---------------|--------------|------------|--------------|
| **Demos** (preview de videos) | Landing, /contenido, /preview | `/api/demo-url` → CDN firmado (BUNNY_PULL_ZONE + SECURITY_KEY) o proxy /api/demo | Demos cargan más rápido desde CDN; sin Bunny → proxy FTP |
| **Portadas** (thumbnails/carátulas) | Listado de videos | Bunny CDN, o /api/thumbnail-from-video (frame del video), o script `db:generate-thumbnails` | Placeholder SVG con artista/título |
| **Descargas** (archivo suelto) | /contenido, /api/download | Bunny CDN + BUNNY_TOKEN_KEY, o disco local | 403/404 con mensaje |
| **Descargas por carpeta** | /api/files (listado + POST URL firmada) | Bunny Storage (listFiles) + mismo path que download | Lista vacía si Storage no configurado; descarga usa mismo prefijo |
| **FTP** (credenciales por compra) | /complete-purchase, /dashboard | Hetzner Robot API (subcuentas) | Credenciales generadas dj_xxx como fallback |

---

## 1.1 Cómo funciona la lógica del CDN (videos “aquí” vs CDN)

Los videos pueden estar **solo en Hetzner FTP** (o en tu disco). Para que **se usen por CDN** tiene que cumplirse esto:

1. **La app no sirve el archivo.** Cuando el usuario pide una descarga, `/api/download` comprueba sesión y compra y luego **redirige (302)** al navegador a una **URL firmada de Bunny CDN** (ej. `https://bearbeat.b-cdn.net/Videos%20Enero%202026/Genre/video.mp4?token=...&expires=...`).
2. **El navegador descarga desde Bunny.** Esa URL apunta a la **Pull Zone** de Bunny, que a su vez sirve archivos desde la **Storage Zone**. Si el archivo **no está en Bunny Storage**, Bunny devuelve **404** al usuario (la app ya no puede “cambiar” la respuesta).
3. **Conclusión:** Para que el CDN se use, **los archivos (videos, ZIPs, etc.) tienen que existir en Bunny Storage**, en la ruta que usa la app: `BUNNY_PACK_PATH_PREFIX` + ruta relativa (ej. `Videos Enero 2026/Genre/video.mp4`).

**Si los videos están solo “aquí” (Hetzner FTP):**

- **Opción A – Usar CDN:** Tienes que **copiar/sincronizar** los videos (y ZIPs si aplica) desde FTP (o desde tu disco) **a Bunny Storage**. Los scripts actuales ya suben a Bunny:
  - **Portadas:** `node scripts/generate-thumbnails-from-videos.js --all` (lee FTP, genera .jpg y los sube a Bunny).
  - **ZIPs por género:** `node scripts/create-genre-zips-hetzner.js` (crea ZIPs desde FTP y los sube a Bunny).
  - **Videos:** No hay script que suba videos de FTP → Bunny; si quieres descargas por CDN, hay que subirlos a Bunny (por panel de Bunny, por API, o con un script que lea FTP y suba a Storage).
- **Opción B – Sin CDN para ese archivo:** Si Bunny está configurado pero el archivo no está en Storage, la app igual redirige a la URL firmada y el usuario recibe 404 de Bunny. Solo si **Bunny no está configurado** (o falla la firma), la app hace **fallback a streaming desde FTP** (Hetzner); en ese caso el archivo sí se sirve desde “aquí” (FTP), pero sin CDN y con riesgo de timeout en Render en archivos grandes.

**Resumen:** CDN = archivos en Bunny Storage. Videos “aquí” (FTP) → para usar CDN hay que **subirlos/sincronizarlos a Bunny Storage**; si no, la descarga por CDN dará 404 o tendrás que depender del fallback FTP.

---

## 2. Bunny.net – Variables y estructura

### 2.1 Variables de entorno (producción)

| Variable | Obligatoria para | Descripción |
|----------|------------------|-------------|
| **BUNNY_CDN_URL** | Demos, portadas, descargas | URL del Pull Zone (ej. `https://bearbeat.b-cdn.net`). Sin barra final. El front la obtiene vía `/api/cdn-base`. |
| **BUNNY_TOKEN_KEY** | Descargas firmadas, thumbnail-from-video | Clave de Token Authentication en Pull Zone → Security. Misma clave para firmar URLs. |
| **BUNNY_STORAGE_ZONE** | Listado /api/files, demos en Storage | Nombre de la Storage Zone (ej. `bear-beat`). |
| **BUNNY_STORAGE_PASSWORD** | Listado, uploads | Password/API key de la Storage Zone (AccessKey en Storage API). |
| **BUNNY_PACK_PATH_PREFIX** | Listado y descarga del pack | Carpeta del pack en Storage (ej. `packs/enero-2026`). Debe coincidir en GET /api/files y GET /api/download. |

Opcionales: BUNNY_STREAM_LIBRARY_ID, BUNNY_STREAM_API_KEY (solo si usas Bunny Stream para demos con iframe).

### 2.2 Estructura en Bunny Storage (recomendada)

Para que demos, listado y descargas coincidan:

```
Storage Zone (ej. bear-beat)/
├── Bachata/              ← Demos en raíz o en carpeta demos/
│   └── Video Demo.mp4
├── demos/                ← Opcional: si prefieres demos en /demos
│   └── ...
└── packs/
    └── enero-2026/       ← BUNNY_PACK_PATH_PREFIX = packs/enero-2026
        ├── Bachata/
        │   └── video1.mp4
        └── Reggaeton/
            └── video2.mp4
```

- **Demos:** El front construye la URL como `BUNNY_CDN_URL + "/" + path` (ej. `path = "Bachata/Video Demo.mp4"`). Los archivos deben estar en la raíz de la Storage (o en la ruta que use el Pull Zone).
- **Descargas:** `/api/download?file=Genre/video.mp4` genera URL firmada a `BUNNY_PACK_PATH_PREFIX + "/" + file` = `packs/enero-2026/Genre/video.mp4`.
- **Listado por carpeta:** GET `/api/files?pack=1` lista la carpeta `BUNNY_PACK_PATH_PREFIX` (packs/enero-2026) y devuelve rutas relativas (Genre/video.mp4) para que el cliente pueda llamar a `/api/download?file=Genre/video.mp4`.

### 2.3 Pull Zone – Token Authentication

1. En Bunny: Pull Zone → **Security** → **Token Authentication**.
2. Activa y define una **Token Authentication Key** (string secreto).
3. Pon esa misma clave en **BUNNY_TOKEN_KEY** en Render/.env.
4. El código firma con: `SHA256(BUNNY_TOKEN_KEY + path + expires)`; path = ruta del archivo en el CDN (ej. `/packs/enero-2026/Genre/video.mp4`).

Si Token Authentication no está activada o la clave no coincide, las descargas devolverán 403.

### 2.4 Qué usa cada ruta

- **Demos:** El front usa `src="/api/demo-url?path=Genre/Video.mp4"`. Esa ruta redirige (302) a URL firmada de Bunny CDN. Soporta: (1) BUNNY_PULL_ZONE + BUNNY_SECURITY_KEY, (2) legacy BUNNY_CDN_URL + BUNNY_TOKEN_KEY. Si Bunny no está configurado, redirige a `/api/demo/...` (proxy FTP).
- **Portadas (carátulas):** `/api/videos` devuelve `thumbnailUrl` (CDN o `/api/thumbnail-from-video?path=...`). Para generar carátulas en masa desde un frame de cada video: `npm run db:generate-thumbnails` (requiere FTP Hetzner + Bunny Storage + ffmpeg; sube .jpg a Bunny y actualiza `thumbnail_url` en Supabase).
- **Descarga:** GET `/api/download?file=Genre/video.mp4` → comprueba sesión y compra → redirige a URL firmada Bunny. Soporta (1) BUNNY_PULL_ZONE + BUNNY_SECURITY_KEY, (2) legacy BUNNY_CDN_URL + BUNNY_TOKEN_KEY. Prefijo: BUNNY_PACK_PATH_PREFIX si está definido, si no se usa la ruta tal cual.
- **Listado:** GET `/api/files?pack=1` → comprueba sesión y compra → listFiles(BUNNY_PACK_PATH_PREFIX) → devuelve árbol con rutas relativas. POST `/api/files` con filePath relativo (ej. Genre/video.mp4) genera URL firmada con prefijo BUNNY_PACK_PATH_PREFIX.

---

## 3. Hetzner – FTP por compra

### 3.1 Variables de entorno

| Variable | Uso |
|----------|-----|
| **HETZNER_ROBOT_USER** | Usuario webservice (ej. `#ws+wxFb2r2d`). |
| **HETZNER_ROBOT_PASSWORD** | Contraseña del webservice. |
| **HETZNER_STORAGEBOX_ID** | ID del Storage Box (ej. `540473`). |
| **NEXT_PUBLIC_FTP_HOST** | Opcional; host para fallback (ej. `u540473.your-storagebox.de`). |

Si no están configuradas, al activar la compra se guardan credenciales generadas (`dj_xxx`) y el host por defecto; el usuario no tendrá subcuenta real hasta que configures la Robot API.

### 3.2 Flujo

1. Usuario paga → webhook crea `pending_purchase` → llega a `/complete-purchase` → se llama `POST /api/complete-purchase/activate`.
2. Si están configurados HETZNER_*, el backend crea una subcuenta en el Storage Box (solo lectura) vía Robot API y guarda `ftp_username` y `ftp_password` en `purchases`.
3. El host mostrado en el dashboard es `{ftp_username}.your-storagebox.de` cuando el username contiene `-sub`.

Ver [HETZNER_FTP_REAL.md](./HETZNER_FTP_REAL.md) para detalles de la API y opciones.

---

## 4. Comprobaciones para que no haya fallos

### 4.1 Demos

- [ ] **BUNNY_CDN_URL** en Render (sin barra final).
- [ ] Pull Zone creada y apuntando a la Storage Zone (o al origen donde estén los demos).
- [ ] Archivos de demo en la Storage (o en el origen) en la ruta que usa el front (ej. `Bachata/Video Demo.mp4`).
- [ ] Si no usas CDN: **FTP_HOST**, **FTP_USER**, **FTP_PASSWORD** (o HETZNER_FTP_*) para que `/api/demo` haga proxy desde FTP; si no, en prod verás 503 con mensaje “Demos no disponibles”.

### 4.2 Portadas (thumbnails)

- [ ] **BUNNY_CDN_URL** y **BUNNY_TOKEN_KEY** para que thumbnail-from-video pueda descargar el trozo de video desde Bunny.
- [ ] **Render debe usar Docker** (runtime: docker en render.yaml) para que ffmpeg esté instalado y se puedan generar thumbnails desde el video. Si el servicio se creó con runtime: node, en Dashboard → Settings se puede cambiar a Docker o crear un nuevo servicio desde el repo con Docker.
- [ ] Opción sin ffmpeg: sube en Bunny Storage archivos .jpg con el mismo path que cada video (ej. `packs/enero-2026/Genre/Video.jpg`). La API comprueba primero si existe ese .jpg y lo usa.
- [ ] Si falla (timeout, sin ffmpeg, etc.), la API redirige al placeholder; no debe haber pantalla rota.

### 4.3 Descargas

- [ ] **BUNNY_CDN_URL**, **BUNNY_TOKEN_KEY** y **BUNNY_PACK_PATH_PREFIX**.
- [ ] Token Authentication activada en la Pull Zone con la misma clave.
- [ ] Archivos del pack en Storage bajo `BUNNY_PACK_PATH_PREFIX` (ej. `packs/enero-2026/Genre/video.mp4`).

### 4.4 Descargas por carpeta (/api/files)

- [ ] **BUNNY_STORAGE_ZONE** y **BUNNY_STORAGE_PASSWORD** para que listFiles funcione.
- [ ] **BUNNY_PACK_PATH_PREFIX** igual que en descargas; el listado usa la misma carpeta y devuelve rutas relativas para que `/api/download?file=...` funcione.
- [ ] Si Storage no está configurado, el listado devuelve lista vacía (no error 500).

### 4.5 FTP

- [ ] **HETZNER_ROBOT_USER**, **HETZNER_ROBOT_PASSWORD**, **HETZNER_STORAGEBOX_ID** para subcuentas reales.
- [ ] Si no: el usuario sigue teniendo acceso; solo verá credenciales de fallback hasta que configures la Robot API.

---

## 5. Resumen mínimo para producción

1. **Bunny:** BUNNY_CDN_URL, BUNNY_TOKEN_KEY, BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD, BUNNY_PACK_PATH_PREFIX (`packs/enero-2026` o tu carpeta real).
2. **Estructura en Storage:** demos en raíz (o en `demos/`); pack en `packs/enero-2026/` con la misma estructura que usa el listado y la descarga.
3. **Hetzner (opcional pero recomendado):** HETZNER_ROBOT_* y HETZNER_STORAGEBOX_ID para FTP real por compra.
4. Con esto, el flujo entrar → ver (demos, portadas) → pagar → descargar (suelto o por carpeta) y FTP queda listo sin fallos.

Ver también: [BUNNY_PULL_ZONE_SETUP.md](./BUNNY_PULL_ZONE_SETUP.md), [HETZNER_FTP_REAL.md](./HETZNER_FTP_REAL.md).
