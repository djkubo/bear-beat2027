# Metadata de videos (duration, portadas, key, BPM)

## Qué se rellena automáticamente

### Key y BPM (desde el nombre del archivo)

Al sincronizar desde FTP (admin → «Sincronizar catálogo desde FTP» o `npm run db:sync-videos-ftp`), se extraen **key** y **BPM** del nombre del archivo.

**Formatos soportados:**

- `Artist - Title (10A – 124 BPM).mp4`
- `Artist - Title (10A - 124 BPM).mp4`
- `Artist - Title (124 BPM) (10A).mp4`
- Cualquier combinación de `(XX BPM)` y `(Xa)` / `(12B)` (key 1-2 dígitos + A o B)

**Requisito:** La tabla `videos` debe tener las columnas `key` y `bpm`. Si aún no las tienes, ejecuta la migración:

```bash
# Desde Supabase SQL Editor, o:
psql $DATABASE_URL -f supabase/migrations/20260131000000_add_videos_key_bpm.sql
```

Después de la migración, vuelve a ejecutar el sync desde FTP para que se rellenen key y bpm.

---

## Duration y portadas (thumbnails)

El FTP solo da nombre y tamaño; **no** podemos obtener duration ni generar portadas desde el servidor (Render) sin tener los archivos.

### Opción 1: Script local con ffprobe/ffmpeg

En una máquina donde tengas la carpeta de videos (o acceso a los archivos):

1. **Solo duration** (rápido, solo metadata):

   ```bash
   npm run db:update-videos-metadata
   ```

   Ese script lee la tabla `videos`, busca cada archivo en la carpeta local `Videos Enero 2026` (o la que pongas en `VIDEOS_PATH`), usa **ffprobe** para obtener la duración en segundos y actualiza la columna `duration` en Supabase.

2. **Duration + thumbnails:**  
   Generar portadas con ffmpeg y subirlas a Bunny (o a `public/thumbnails-cache`) y guardar la URL en `thumbnail_url` requiere un flujo propio (script de generación + upload a CDN). Si quieres, se puede añadir un script que genere thumbnails locales y actualice `thumbnail_url` con rutas relativas para servirlas vía `/api/thumbnail/[...path]` cuando el servidor tenga acceso a esos archivos.

### Opción 2: Rellenar manualmente o con CSV

Si tienes un CSV o hoja con `file_path`, `duration`, `thumbnail_url`, puedes hacer un script que haga `UPDATE` por `file_path` en la tabla `videos`.

---

## Resumen

| Campo           | Origen                          | Cómo se rellena                                      |
|----------------|----------------------------------|------------------------------------------------------|
| title, artist  | Nombre del archivo               | Sync FTP (parseo de "Artist - Title ...")           |
| key, bpm       | Nombre del archivo               | Sync FTP (parseo de "(10A – 124 BPM)" etc.) + migración |
| duration       | Archivo de video (ffprobe)       | Script local `db:update-videos-metadata` o manual  |
| thumbnail_url  | Imagen generada (ffmpeg) o externa| Script propio + CDN o manual                        |
| resolution     | Archivo o por defecto            | Sync FTP pone "1080p"; se puede refinar con ffprobe |
