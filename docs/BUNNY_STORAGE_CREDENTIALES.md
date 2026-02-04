# Credenciales de Bunny Storage (FTP & API Access)

En Bunny: **Storage** → tu zona → pestaña **"FTP & API Access"**.

Ahí ves:

| Campo en Bunny | Valor típico | Uso en Bear Beat |
|----------------|--------------|-------------------|
| **Username** | Nombre de la zona (ej. `bearbeat`) | → **BUNNY_STORAGE_ZONE** |
| **Hostname** | `storage.bunnycdn.com` | El script usa este por defecto (ver [BUNNY_STORAGE.md](./BUNNY_STORAGE.md)). |
| **Connection type** | **Passive** | FTP en el proyecto usa solo modo pasivo. |
| **Port** | **21** | FTP estándar; configurable con `FTP_PORT` si aplica. |
| **Password** | (revelar con el botón) | → **BUNNY_STORAGE_PASSWORD** (lectura y escritura). |
| **Read-only password** | (revelar con el botón) | Solo lectura; **no** usar para subir. |

---

## Qué usar en Bear Beat

| Variable en `.env.local` | Dónde copiarla |
|--------------------------|----------------|
| **BUNNY_STORAGE_ZONE** | El **Username** de esa pantalla = nombre exacto de la Storage Zone (ej. `bearbeat`). Debe coincidir con lo que ves en la lista de zonas en Bunny. |
| **BUNNY_STORAGE_PASSWORD** | El **Password** (el principal). **No** uses el "Read-only password". |

- **Password** (principal) → para subir archivos con `npm run db:sync-local-to-bunny` y para la Storage API. → **BUNNY_STORAGE_PASSWORD**.
- **Read-only password** → solo lectura; en Bear Beat no se usa para los scripts de sync.

---

## Resumen

- **BUNNY_STORAGE_ZONE** = nombre exacto de la zona (en este proyecto suele ser **`bearbeat`**, sin guion; si en Bunny ves otro nombre, usa ese).
- **BUNNY_STORAGE_PASSWORD** = el **Password** de "FTP & API Access", no el Read-only.

Si al subir te da **401 Unauthorized**, comprueba: (1) que el nombre de zona coincida con Bunny, (2) que estés usando el **Password** y no el Read-only. Si sigue fallando, en Bunny usa "Reset password" y actualiza la variable.

**Referencia técnica completa:** [BUNNY_STORAGE.md](./BUNNY_STORAGE.md) (hostname, puerto, script de sync, variables).

---

## Subir estas variables a Render (producción)

En **.env.local** tienes que tener al menos:

- `BUNNY_STORAGE_ZONE`
- `BUNNY_STORAGE_PASSWORD` (el Password de FTP & API Access)
- `BUNNY_CDN_URL` o `NEXT_PUBLIC_BUNNY_CDN_URL`
- `BUNNY_TOKEN_KEY`
- `BUNNY_PACK_PATH_PREFIX` (ej. `Videos Enero 2026`)

Para que Render use esas claves en producción, súbelas con la API de Render:

1. En .env.local añade también **RENDER_API_KEY** (Render Dashboard → Account → API Keys → Create).
2. En la carpeta del proyecto ejecuta:
   ```bash
   cd "/Users/gustavogarcia/Documents/CURSOR/BEAR BEAT 2027 3.0"
   npm run deploy:env
   ```
   Eso lee .env.local y sube todas las variables de **PROJECT_RENDER_KEYS** (incluidas las de Bunny) al servicio bear-beat2027 y dispara un deploy.

No pongas RENDER_API_KEY en el repo ni la subas a Render; solo en .env.local para poder ejecutar `deploy:env` desde tu máquina.
