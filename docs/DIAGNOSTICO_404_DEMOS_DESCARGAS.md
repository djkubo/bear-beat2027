# Diagnóstico: 404 en demos, portadas y descargas

**Prioridad actual:** La app sirve primero desde **FTP (Hetzner)** y solo usa Bunny como fallback. Con FTP configurado (`FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` o `HETZNER_FTP_*` en Render), demos, portadas y descargas se leen de Hetzner; no hace falta que los archivos estén en Bunny.

Cuando **demos no reproducen**, **portadas no cargan** o **descargas dan 404**, puede ser: (1) el archivo no está en Hetzner en la ruta esperada, o (2) FTP no está configurado y Bunny devuelve 404.

**Para que la app sirva desde Hetzner:** en Render → Environment configura **FTP_HOST**, **FTP_USER** y **FTP_PASSWORD** (o **HETZNER_FTP_HOST**, **HETZNER_FTP_USER**, **HETZNER_FTP_PASSWORD**) con las credenciales del Storage Box donde están los videos (ej. host `u540473.your-storagebox.de`, usuario `u540473`). La app hace `cd` a la carpeta `FTP_BASE_PATH` (por defecto "Videos Enero 2026") y lee desde ahí.

---

## 1. Prueba rápida en producción

Abre en el navegador (con la app ya desplegada):

```
https://bear-beat2027.onrender.com/api/debug-bunny?path=Bachata/Akai Rojas - Es Akai Baby (3A – 130 BPM).mp4
```

(O el path de cualquier video que falle.)

La respuesta incluye:

- **configOk**: si las variables de Bunny en Render están bien.
- **bunnyPathBuilt**: ruta exacta que la app pide a Bunny (ej. `Videos Enero 2026/Bachata/Akai Rojas - Es Akai Baby (3A – 130 BPM).mp4`).
- **bunnyResponseStatus**: resultado de hacer HEAD a esa URL en Bunny:
  - **200** → Bunny tiene el archivo; si en la web no se ve, revisa reproductor o CORS.
  - **403** → Token/key incorrecta o Token Authentication mal configurada en la Pull Zone.
  - **404** → **El archivo no está en Bunny Storage** (o en el origen de la Pull Zone) en esa ruta.

Si ves **404**, el problema no son las APIs: **los archivos no están en Bunny** en la estructura que usa la app.

---

## 2. Qué rutas usa la app

La app construye siempre:

```
BUNNY_PACK_PATH_PREFIX + "/" + género + "/" + archivo
```

Ejemplo con `BUNNY_PACK_PATH_PREFIX = Videos Enero 2026`:

- Demo: `Videos Enero 2026/Bachata/Akai Rojas - Es Akai Baby (3A – 130 BPM).mp4`
- Descarga: `Videos Enero 2026/Cubaton/Anubix - Mi Descaro (5B – 112 BPM).mp4`
- ZIP: `Videos Enero 2026/Bachata.zip`

La URL que ves (ej. `https://bearbeat.b-cdn.net/Videos%20Enero%202026/...`) es correcta. Si Bunny devuelve 404, esa ruta **no existe** en el Storage (o en el origen de la Pull Zone).

---

## 3. Cómo comprobarlo en Bunny

1. **Bunny Dashboard** → **Storage** (o el origen que use tu Pull Zone).
2. Mira la estructura de carpetas:
   - ¿Existe la carpeta **Videos Enero 2026** (o el valor de `BUNNY_PACK_PATH_PREFIX`)?
   - ¿Dentro están las carpetas por género (Bachata, Cubaton, etc.)?
   - ¿Dentro de cada género están los `.mp4` y/o `.zip`?
3. Si la estructura es otra (ej. todo en raíz, o con otro nombre de carpeta), tienes dos opciones:
   - **Opción A:** Subir/reorganizar los archivos en Bunny para que coincidan con `Videos Enero 2026/Genre/archivo.mp4`.
   - **Opción B:** Cambiar en Render la variable **BUNNY_PACK_PATH_PREFIX** al nombre de la carpeta real (o dejarla vacía si los archivos están en la raíz).

---

## 4. Pull Zone y origen

- **Pull Zone** → **Origin**: puede ser una **Storage Zone** de Bunny o una URL externa (ej. Hetzner).
- La ruta de la URL (ej. `/Videos%20Enero%202026/Genre/file.mp4`) es la ruta que Bunny pide a ese origen.
- Si el origen es Storage Zone: la ruta debe existir dentro del Storage.
- Si el origen es externo: la ruta en ese servidor debe coincidir (misma estructura).

---

## 5. Resumen

| Síntoma | Causa habitual | Qué hacer |
|--------|----------------|-----------|
| 404 al abrir URL de demo/descarga | Archivo no existe en Bunny en esa ruta | Revisar Storage/origen; subir archivos o ajustar BUNNY_PACK_PATH_PREFIX |
| 403 al abrir URL firmada | Token/key distinta a la de la Pull Zone | Bunny → Pull Zone → Security → Token Authentication; copiar la clave a BUNNY_TOKEN_KEY en Render |
| Demo URL correcta pero no reproduce | CORS, tipo MIME o reproductor | Revisar cabeceras de la Pull Zone y que el archivo sea .mp4 servido como video |

Usa siempre **/api/debug-bunny?path=...** con un path real que falle para ver en vivo `bunnyResponseStatus` y `bunnyPathBuilt`.
