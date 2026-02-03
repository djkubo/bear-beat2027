# Pasos para que todo funcione (sin desesperarse)

Checklist en orden. Cuando termines todos, **demos**, **portadas** y **descargas por CDN** deberían ir bien.

---

## 1. Poner la contraseña de Bunny Storage

Sin esto no se puede subir nada a Bunny (ni thumbnails ni videos).

1. Entra en [Bunny.net](https://bunny.net) → **Storage** → tu Storage Zone (ej. **bear-beat**).
2. Abre **FTP & API Access**.
3. Copia la **Password** (API key / Access Key).
4. En tu proyecto, abre **`.env.local`** y descomenta/rellena:
   ```bash
   BUNNY_STORAGE_PASSWORD=tu_password_aqui
   ```
5. (Opcional) Sube también esta variable a Render para que la app en producción pueda usar listado y thumbnails:
   ```bash
   npm run deploy:env
   ```

---

## 2. Subir los videos a Bunny (para que el CDN los sirva)

Los videos están en **Hetzner FTP**. Para que las descargas vayan por **CDN** (rápidas y sin timeout), tienen que estar también en **Bunny Storage**.

1. Desde la raíz del proyecto:
   ```bash
   node scripts/sync-videos-ftp-to-bunny.js --dry-run
   ```
   Verás la lista de archivos que se subirían. Si no hay errores de conexión, sigue.

2. Primera vez, prueba con pocos archivos:
   ```bash
   node scripts/sync-videos-ftp-to-bunny.js --limit 2
   ```
   Comprueba que en Bunny (Storage → tu zona → archivos) aparezcan esos 2.

3. Subir todo:
   ```bash
   npm run db:sync-videos-to-bunny
   ```
   (o `node scripts/sync-videos-ftp-to-bunny.js`). Puede tardar según cantidad y tamaño.

---

## 3. Generar y subir portadas (thumbnails)

Para que el listado de videos muestre carátulas desde el CDN:

```bash
node scripts/generate-thumbnails-from-videos.js --all
```

Requisitos: **BUNNY_STORAGE_PASSWORD** en `.env.local`, **ffmpeg** instalado (`brew install ffmpeg`). El script lee los videos desde FTP, extrae un frame, sube el .jpg a Bunny y actualiza `thumbnail_url` en Supabase.

---

## 4. (Opcional) ZIPs por género

Si quieres que `/api/download?file=Reggaeton.zip` funcione por CDN:

```bash
node scripts/create-genre-zips-hetzner.js
```

Crea un ZIP por carpeta (género) en FTP y lo sube a Bunny.

---

## 5. Comprobar en producción (Render)

- Variables en Render: `BUNNY_CDN_URL`, `BUNNY_TOKEN_KEY`, `BUNNY_PACK_PATH_PREFIX`, y si quieres listado/thumbnails desde la API, también `BUNNY_STORAGE_ZONE` y `BUNNY_STORAGE_PASSWORD`.
- Pull Zone en Bunny: **Token Authentication** activada y la misma clave en `BUNNY_TOKEN_KEY`.
- Descarga: entra en tu app → inicia sesión → compra (o usuario de prueba con compra) → **Contenido** → descargar un video. Debe abrir una URL de Bunny y descargar sin 404.

---

## Resumen rápido

| Paso | Comando / acción |
|------|-------------------|
| 1 | Añadir `BUNNY_STORAGE_PASSWORD` en `.env.local` (y en Render si aplica) |
| 2 | `npm run db:sync-videos-to-bunny` (videos FTP → Bunny) |
| 3 | `node scripts/generate-thumbnails-from-videos.js --all` (portadas) |
| 4 | (Opcional) `node scripts/create-genre-zips-hetzner.js` (ZIPs por género) |
| 5 | Revisar variables en Render y probar una descarga en la app |

Cuando 1–3 (y 4 si lo usas) estén hechos, el flujo **ver → pagar → descargar por CDN** debería funcionar.
