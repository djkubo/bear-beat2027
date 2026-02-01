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

## Descarga desde la web (Bunny.net)

En **producción** la descarga por navegador usa **Bunny.net** (ya integrado):

1. Configura en Render (o .env.local) las variables Bunny: `BUNNY_CDN_URL`, `BUNNY_TOKEN_KEY`, y opcionalmente `BUNNY_PACK_PATH_PREFIX=packs/enero-2026`.
2. Sube los archivos a Bunny Storage con la misma estructura que el catálogo:  
   `packs/enero-2026/Genre/filename.mp4` (ej. `packs/enero-2026/Bachata/Artista - Título.mp4`).
3. Cuando un usuario con compra hace clic en “Descargar”, `/api/download` redirige a una **URL firmada** de Bunny (expira en 1 h). No se usa disco en el servidor.

- **Por archivo:** el botón de descarga en Contenido ya usa `/api/download` → redirección a Bunny.
- **Por carpeta:** el usuario puede descargar género por género (cada video) o usar **FTP** (FileZilla) con las credenciales del Dashboard para bajar carpetas completas.

Ver `CONFIGURAR_STORAGE.md` para crear la Storage Zone, Pull Zone y Token Authentication en Bunny.
