# Checklist: Demos, portadas y descargas (Bunny)

Cuando **no se reproducen demos**, **no se ven portadas** o **no descargan** archivos, revisa en este orden.

---

## 1. Variables en Render (Environment)

| Variable | Valor ejemplo | Dónde sacarla |
|----------|----------------|---------------|
| `BUNNY_CDN_URL` o `NEXT_PUBLIC_BUNNY_CDN_URL` | `https://bearbeat.b-cdn.net` | Bunny → Pull Zone → Hostname (sin barra final) |
| `BUNNY_TOKEN_KEY` | (clave larga) | Bunny → Pull Zone → **Security** → **Token Authentication** → Security Key |
| `BUNNY_PACK_PATH_PREFIX` | `Videos Enero 2026` | Nombre de la carpeta donde están los archivos en Bunny Storage. Si están en la **raíz**, déjalo **vacío**. |

Sin estas dos primeras, demos y descargas devuelven 503.

---

## 2. Bunny Pull Zone

- **Origin:** Debe ser tu **Storage Zone** (Bunny Storage), no "Origin URL" a Render, para que los archivos se sirvan desde Bunny.
- **Token Authentication:** Activado, y la **misma clave** que pusiste en `BUNNY_TOKEN_KEY`.

Si la clave no coincide o Token Auth no está activado → **403 Forbidden** al abrir la URL firmada.

---

## 3. Dónde están los archivos en Bunny Storage

La ruta que usa la app es siempre:

```
[BUNNY_PACK_PATH_PREFIX]/[path del video o ZIP]
```

Ejemplos:

- Si `BUNNY_PACK_PATH_PREFIX` = `Videos Enero 2026` y el path es `Bachata/Artista - Título.mp4`  
  → En Storage debe existir: `Videos Enero 2026/Bachata/Artista - Título.mp4`

- Si `BUNNY_PACK_PATH_PREFIX` está **vacío**  
  → En Storage debe existir: `Bachata/Artista - Título.mp4` (en la raíz)

Si la ruta no existe en Storage → **404 Not Found** al abrir la URL firmada.

---

## 4. Probar sin salir de la app

1. **Estado de la config:**  
   `https://tu-sitio.onrender.com/api/debug-config`  
   Debe devolver `ok: true` y sin `missing` ni `invalid`.

2. **Diagnóstico de Bunny y una ruta de prueba:**  
   `https://tu-sitio.onrender.com/api/debug-bunny?path=Bachata/cualquier-video.mp4&token=TU_DEBUG_BUNNY_SECRET`  
   Ahí ves:
   - Si la config está bien
   - Qué path se está construyendo (`bunnyPathBuilt`)
   - Una URL de prueba (`testSignedUrl`)

3. **Abrir la URL de prueba en el navegador:**
   - **200 / se reproduce o descarga:** Bunny y rutas OK.
   - **403:** Token Authentication mal (clave distinta o no activada).
   - **404:** Esa ruta no existe en Storage; revisa prefijo y nombres de carpetas/archivos.

---

## 5. Resumen rápido

| Síntoma | Revisar |
|--------|---------|
| 503 "Demos no disponibles" / "Bunny no configurado" | Variables en Render y `/api/debug-config`. |
| 403 al abrir la URL del demo/descarga | Pull Zone → Token Authentication = misma clave que `BUNNY_TOKEN_KEY`. |
| 404 al abrir la URL | Ruta en Storage = `BUNNY_PACK_PATH_PREFIX` + path (o path en raíz si prefijo vacío). |
| Video no carga en el reproductor | Que la URL sea la firmada (no 0.0.0.0). Probar la misma URL en una pestaña nueva. |

Después de cambiar variables en Render, hace falta un **redeploy** para que el servidor use los nuevos valores.
