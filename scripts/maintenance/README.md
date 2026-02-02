# Scripts de mantenimiento (ejecución local)

Scripts robustos en TypeScript para administrar la librería de videos en Hetzner Storage Box y sincronizar con Supabase. Diseñados para correrse **en la máquina del desarrollador** (no en el servidor web) para evitar timeouts.

## Requisitos previos

- Node 18+
- Credenciales en `.env.local`:
  - **FTP:** `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` (o `HETZNER_FTP_*`)
  - **Supabase:** `SUPABASE_URL` (o `NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY`
  - **SSH (solo zip-folders):** `SSH_HOST`, `SSH_USER`, `SSH_PASSWORD` (o reutilizar FTP_*)
- Opcional: `FTP_BASE_PATH` o `FTP_VIDEOS_PATH` (ej. `Videos Enero 2026`), `PACK_SLUG` (ej. `enero-2026`)

## Instalación de dependencias

```bash
npm install
# o para los scripts de mantenimiento (ya incluidas en el proyecto):
# ssh2, basic-ftp, fluent-ffmpeg, @supabase/supabase-js
```

Si faltan `ssh2` o `fluent-ffmpeg`:

```bash
npm install ssh2 fluent-ffmpeg
npm install -D @types/fluent-ffmpeg
```

## Scripts

### 1. `zip-folders.ts` – Generador de ZIP por género en el servidor

Crea un `.zip` por cada carpeta de género **dentro** del servidor Hetzner (sin descargar nada). Conecta por **SSH** y ejecuta `zip -r -0 "Genero.zip" "Genero/"` para cada carpeta.

- **Requisito:** El servidor debe tener **SSH** y el comando `zip` instalado.
- **Nota:** Hetzner Storage Box estándar es solo FTP/SFTP; este script requiere un host con SSH (por ejemplo un VPS que monte el Storage o un servidor con acceso a los archivos).

```bash
npx tsx scripts/maintenance/zip-folders.ts
# o
npm run maintenance:zip-folders
```

Variables: `SSH_HOST`, `SSH_USER`, `SSH_PASSWORD`, `SSH_PORT` (opcional, default 22), `FTP_BASE_PATH`.

---

### 2. `generate-thumbs.ts` – Generador de portadas (JPG)

Lista videos por FTP de forma recursiva, compara con la carpeta `thumbnails/` y genera las miniaturas que faltan:

1. Descarga el video por FTP a un archivo temporal.
2. Obtiene la duración con `ffprobe`.
3. Extrae un frame al **20%** de la duración con `ffmpeg`.
4. Redimensiona a **600x600** px.
5. Sube el JPG a `thumbnails/` en el FTP (misma estructura que los videos, extensión `.jpg`).

Requisito: **ffmpeg** y **ffprobe** instalados localmente (ej. `brew install ffmpeg`).

```bash
npx tsx scripts/maintenance/generate-thumbs.ts
# o
npm run maintenance:generate-thumbs
```

Manejo de errores: reintentos por archivo (3 intentos), logs por cada video.

---

### 3. `sync-db.ts` – Sincronizador de metadata con Supabase

1. Lista todos los archivos MP4 del FTP (recursivo).
2. Parsea el nombre con regex: formato `Genero/Artista - Titulo (Clave - BPM).mp4` → extrae género, artista, título, clave, BPM.
3. **Upsert** en la tabla `videos` (clave única: `pack_id` + `file_path`).
4. Marca como `active: false` los videos que están en la DB pero ya no existen en el FTP.

**Requisito en Supabase:** Índice único en `(pack_id, file_path)` y columna opcional `active`. Ejecuta la migración:

```bash
# En Supabase SQL Editor o: npx supabase db push
# Archivo: supabase/migrations/20260203000000_videos_unique_pack_file.sql
```

```bash
npx tsx scripts/maintenance/sync-db.ts
# o
npm run maintenance:sync-db
```

Variables: `FTP_*`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PACK_SLUG` (default `enero-2026`).

---

## Orden recomendado

1. **sync-db** – Poblar/actualizar la base con la lista de archivos del FTP.
2. **generate-thumbs** – Generar portadas para los videos que no tengan.
3. **zip-folders** – (Si tienes SSH en el servidor) Crear ZIP por género en el propio servidor.

## Ejecución con tsx

Todos los scripts están pensados para ejecutarse con `npx tsx` (TypeScript sin compilar). Si no tienes `tsx`:

```bash
npm install -D tsx
```

Luego usa los `npm run maintenance:*` definidos en `package.json`.
