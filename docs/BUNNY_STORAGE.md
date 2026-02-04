# Bunny Storage – Referencia completa

Documentación técnica de **Bunny Storage** en Bear Beat: credenciales, hostname, puerto, tipo de conexión, script de sincronización y variables de entorno.

---

## 1. Dónde ver los datos en Bunny

En **Bunny.net** → **Storage** → tu zona (ej. `bearbeat`) → pestaña **"FTP & API Access"** verás:

| Campo en Bunny | Valor típico | Uso en Bear Beat |
|----------------|--------------|-------------------|
| **Username** | Nombre de la zona (ej. `bearbeat`) | → `BUNNY_STORAGE_ZONE` |
| **Hostname** | `storage.bunnycdn.com` | El script y la API usan este por defecto |
| **Connection type** | **Passive** | FTP en el proyecto usa solo modo pasivo |
| **Port** | **21** | FTP estándar; configurable con `FTP_PORT` si usas FTP a Bunny |
| **Password** | (revelar con el botón) | → `BUNNY_STORAGE_PASSWORD` (lectura y escritura) |
| **Read-only password** | (revelar con el botón) | Solo lectura; **no** usar para subir archivos |

---

## 2. Credenciales: Password vs Read-only

- **Password** (principal): permite **leer y escribir**. Es el que debe ir en **`BUNNY_STORAGE_PASSWORD`**. Lo usan:
  - El script `npm run db:sync-local-to-bunny` (subir desde tu disco a Bunny).
  - La app (Storage API) si necesita listar o verificar archivos.
- **Read-only password**: solo **lectura**. No sirve para subir. Si la pones en `BUNNY_STORAGE_PASSWORD`, el sync dará **401 Unauthorized**.

Ver también: [BUNNY_STORAGE_CREDENTIALES.md](./BUNNY_STORAGE_CREDENTIALES.md).

---

## 3. Nombre de la zona (BUNNY_STORAGE_ZONE)

El valor debe ser **exactamente** el nombre que muestra Bunny en la lista de Storage Zones (y en "FTP & API Access" como Username).

- En este proyecto la zona se llama **`bearbeat`** (sin guion). Si en el panel ves `bearbeat`, usa `BUNNY_STORAGE_ZONE=bearbeat`.
- Si en el panel aparece con guion (ej. `bear-beat`), usa ese mismo valor.
- Si pones un nombre que no coincide (ej. `bear-beat` cuando la zona es `bearbeat`), la API devuelve **401**.

---

## 4. Hostname y API Storage

- **Hostname por defecto:** `storage.bunnycdn.com`.
- El script `sync-local-to-bunny.js` usa ese host para las peticiones **HTTP (Storage API)**, no FTP.
- Opcional: puedes forzar otro host con `BUNNY_STORAGE_HOST`, por ejemplo si Bunny te asigna una región concreta (`ny.storage.bunnycdn.com`, `uk.storage.bunnycdn.com`). Por defecto no hace falta.

---

## 5. FTP (Hetzner / Bunny u otro)

Si en algún momento usas **FTP** (p. ej. hacia Hetzner Storage Box o FTP de Bunny):

- **Puerto:** 21 por defecto. Variable opcional: `FTP_PORT` (ver `src/lib/ftp-stream.ts`).
- **Connection type:** **Passive (PASV)**. La librería `basic-ftp` usa solo modo pasivo; no hace falta configurar nada más.

Variables típicas: `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`, `FTP_BASE_PATH`, `FTP_PORT`.

---

## 6. Script: subir desde tu disco a Bunny

**Comando:**

```bash
npm run db:sync-local-to-bunny
```

O con ruta explícita:

```bash
npm run db:sync-local-to-bunny -- "/ruta/a/tu/carpeta/Videos Enero 2026"
```

**Qué hace:**

- Lee la carpeta local (por defecto: `/Volumes/Extreme Pro/Videos Enero 2026`).
- Sube a Bunny Storage (vía API `storage.bunnycdn.com`) todos los `.mp4`, `.jpg`/`.jpeg` y `.zip` con la estructura `BUNNY_PACK_PATH_PREFIX/Género/archivo`.
- Usa credenciales de **.env.local** (recomendado) o del archivo **bunny-storage-credenciales.txt**.

**Credenciales (prioridad):**

1. **.env.local**: `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_PASSWORD`.
2. Si faltan, el script lee **bunny-storage-credenciales.txt** (línea 1 = zona, línea 2 = Password; línea 3 opcional = `ny` o `uk` si tu zona está en esa región).
3. Valores por defecto: zona `bear-beat` (normalizada a minúsculas), prefijo `Videos Enero 2026`.

**Requisitos:**

- Disco/carpeta con los videos conectado y accesible.
- `BUNNY_STORAGE_PASSWORD` = **Password** de "FTP & API Access", no Read-only.
- `BUNNY_STORAGE_ZONE` = nombre exacto de la zona en Bunny (ej. `bearbeat`).

**Opciones:**

- `--dry-run`: solo lista lo que subiría, no sube.
- `--limit N`: sube solo los primeros N archivos (útil para pruebas).

Ver también: [COMO_SUBIR_VIDEOS_A_BUNNY.txt](../COMO_SUBIR_VIDEOS_A_BUNNY.txt).

---

## 7. Variables de entorno (resumen)

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| **BUNNY_STORAGE_ZONE** | Sí (para sync y Storage API) | Nombre exacto de la Storage Zone (ej. `bearbeat`). |
| **BUNNY_STORAGE_PASSWORD** | Sí | Password de "FTP & API Access" (no Read-only). |
| **BUNNY_STORAGE_HOST** | No | Hostname API (default: `storage.bunnycdn.com`). |
| **BUNNY_PACK_PATH_PREFIX** | Recomendada | Prefijo de rutas en Storage (ej. `Videos Enero 2026`). |
| **BUNNY_CDN_URL** / **NEXT_PUBLIC_BUNNY_CDN_URL** | Para demos/descargas | URL del Pull Zone (ej. `https://bearbeat.b-cdn.net`). |
| **BUNNY_TOKEN_KEY** | Para URLs firmadas | Token Authentication de la Pull Zone. |

---

## 8. Errores frecuentes

- **401 Unauthorized:** Comprueba que `BUNNY_STORAGE_ZONE` coincida con el nombre en Bunny y que `BUNNY_STORAGE_PASSWORD` sea el **Password** (no Read-only). Si sigue fallando, en Bunny usa "Reset password" y actualiza la variable.
- **Carpeta no encontrada:** Conecta el disco o pasa la ruta como argumento al script.
- **404 en demos/descargas:** Los archivos tienen que estar en Bunny Storage en la ruta que usa la app (`BUNNY_PACK_PATH_PREFIX` + ruta relativa). Ejecuta el sync hasta que termine.

---

## 9. Subir variables a Render (producción)

Para que la app en Render use Bunny, las variables deben estar en el servicio de Render. Desde tu máquina (con `RENDER_API_KEY` en .env.local):

```bash
npm run deploy:env
```

Eso envía las variables definidas en el script (incluidas las de Bunny) a Render. No subas `RENDER_API_KEY` al repositorio.
