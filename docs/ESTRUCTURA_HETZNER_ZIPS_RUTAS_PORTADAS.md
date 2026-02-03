# Estructura en Hetzner (FTP / Storage Box) – ZIPs, rutas y portadas

Resumen de cómo están organizados los **ZIPs**, las **rutas de videos** y las **portadas** en el FTP de Hetzner según el código y la documentación del proyecto.

---

## 1. Variables que definen la estructura

| Variable | Valor por defecto | Uso |
|----------|-------------------|-----|
| **FTP_BASE_PATH** / **FTP_VIDEOS_PATH** | `Videos Enero 2026` | Carpeta donde están los **videos** (géneros como subcarpetas). |
| **FTP_HOST** | (ej. `u540473.your-storagebox.de`) | Servidor FTP Hetzner. |
| **FTP_USER** / **FTP_PASSWORD** | Credenciales del Storage Box | Acceso FTP. |

La **raíz del FTP** es `/` (lo que ves al conectar con FileZilla). Todo lo que no esté bajo `FTP_BASE_PATH` se considera en la “raíz” del FTP.

---

## 2. Árbol en Hetzner (FTP)

```
/                                    ← Raíz del FTP
│
├── Videos Enero 2026/               ← FTP_BASE_PATH (solo VIDEOS)
│   ├── Bachata/
│   │   ├── Artista - Título.mp4
│   │   └── ...
│   ├── Cumbia/
│   │   └── ...
│   ├── Reggaeton/
│   │   └── ...
│   └── ...
│
├── Bachata/                         ← PORTADAS (en la raíz, por género)
│   ├── Artista - Título.jpg
│   └── ...
├── Cumbia/
│   └── ...
├── Reggaeton/
│   └── ...
│
├── Bachata.zip                      ← ZIPs en la RAÍZ
├── Cumbia.zip
├── Reggaeton.zip
└── Pack_Completo_Enero_2026.zip     ← (u otro nombre de pack completo)
```

---

## 3. Resumen por tipo

### 3.1 Videos

| Dónde | Ruta en el FTP |
|-------|-----------------|
| Base | `Videos Enero 2026/` (o el valor de `FTP_BASE_PATH`) |
| Por archivo | `Videos Enero 2026/{Género}/{Archivo}.mp4` |
| Ejemplo | `Videos Enero 2026/Bachata/Benny Montero - Quien Dijo (6B - 130).mp4` |

- La app hace `cd(FTP_BASE_PATH)` y luego descarga `{Género}/{archivo}.mp4`.
- El listado de videos en Supabase se rellena con `npm run db:sync-videos-ftp` leyendo desde esa carpeta.

### 3.2 Portadas (thumbnails / .jpg)

| Dónde | Ruta en el FTP |
|-------|-----------------|
| Base | **Raíz del FTP** (no dentro de `Videos Enero 2026`) |
| Por archivo | `{Género}/{Mismo nombre que el video}.jpg` |
| Ejemplo | `Bachata/Benny Montero - Quien Dijo (6B - 130).jpg` |

- Se sirven desde la **raíz**: path relativo `Genre/archivo.jpg`.
- El script `upload-assets.ts` sube desde tu disco: crea carpeta `{genre}` en la raíz y sube los `.jpg` ahí.
- En el código (`ftp-stream.ts`): tipo `'thumb'` → se hace `RETR path` **sin** hacer `cd(FTP_BASE)`; es decir, path relativo a la raíz.

### 3.3 ZIPs

| Dónde | Ruta en el FTP |
|-------|-----------------|
| Base | **Raíz del FTP** |
| Por archivo | `{NombreDelZip}.zip` |
| Ejemplos | `Bachata.zip`, `Cumbia.zip`, `Pack_Completo_Enero_2026.zip` |

- En el código: tipo `'zip'` → **sin** `cd(FTP_BASE)`; se hace `RETR` del nombre del zip en la raíz.
- El script `create-genre-zips-hetzner.js` crea los ZIP por género desde las carpetas de `FTP_BASE_PATH` y los **sube a Bunny**, no al FTP (los ZIPs en Hetzner los subes con `upload-assets.ts` desde tu SSD/local).

---

## 4. Cómo se usa en la app (rutas lógicas)

- **Demos:** path relativo tipo `Bachata/Video.mp4` → la app quita `Videos Enero 2026/` si viene en el path y pide al FTP: `cd(Videos Enero 2026)` + `RETR Bachata/Video.mp4`.
- **Portadas:** path relativo `Bachata/Video.jpg` → la app pide al FTP (raíz): `RETR Bachata/Video.jpg`.
- **Descarga ZIP:** path `Bachata.zip` → la app pide al FTP (raíz): `RETR Bachata.zip`.

---

## 5. Scripts que generan / suben

| Script | Qué hace |
|--------|-----------|
| **upload-assets.ts** | Lee desde un disco local (ej. `/Volumes/Extreme Pro/Videos Enero 2026`): sube **ZIPs** a la raíz del FTP y **portadas** a `{Género}/{archivo}.jpg` en la raíz. |
| **create-genre-zips-hetzner.js** | Conecta por FTP a Hetzner, lee carpetas en `FTP_BASE_PATH`, comprime cada género y **sube los ZIP a Bunny Storage** (no al FTP). |
| **generate-thumbnails-from-videos.js** | Usa videos (FTP/Supabase), extrae frame con ffmpeg, **sube los .jpg a Bunny** y actualiza `thumbnail_url` en Supabase. No escribe en el FTP. |
| **sync-videos-from-ftp.js** | Lista `FTP_BASE_PATH` en el FTP y sincroniza el catálogo (metadata) a la tabla `videos` en Supabase. |

---

## 6. Tabla resumen

| Tipo    | Ruta en Hetzner FTP                    | Variable / nota |
|---------|----------------------------------------|------------------|
| Videos  | `Videos Enero 2026/{Género}/{archivo}.mp4` | `FTP_BASE_PATH`  |
| Portadas| `{Género}/{archivo}.jpg` (en raíz)     | Raíz del FTP     |
| ZIPs    | `{Nombre}.zip` (en raíz)               | Raíz del FTP     |

Si algo no coincide (por ejemplo 404 en demo o portada), revisa que las carpetas y nombres en el FTP sigan exactamente esta estructura.
