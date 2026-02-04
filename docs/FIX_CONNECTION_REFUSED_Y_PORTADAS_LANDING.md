# Fix: Connection Refused 0.0.0.0 y portadas dinámicas en landing

**Fecha:** 2027  
**Objetivo:** Eliminar `net::ERR_CONNECTION_REFUSED` en producción (Render) y reactivar portadas dinámicas por video en la home.

---

## 1. Problema: URLs absolutas a 0.0.0.0

En producción el sitio intentaba cargar imágenes y demos con la URL absoluta `http://0.0.0.0:10000/...`. El navegador del usuario no puede conectar a esa dirección (es interna del servidor), lo que generaba **Connection Refused**.

---

## 2. Cambios en código

### 2.1 `src/lib/utils.ts`

- **`getPublicAppOrigin(request?)`**  
  - Antes: en algunos casos devolvía `origin` del request (p. ej. `http://0.0.0.0:10000`) cuando no había `NEXT_PUBLIC_APP_URL`.  
  - Ahora: el return final es siempre `''` cuando el origen es local/interno. Así los redirects de las APIs (thumbnail-cdn, placeholder, etc.) usan rutas relativas y el navegador resuelve contra el dominio real (p. ej. `bear-beat2027.onrender.com`).

- **Nueva función `getBaseUrl(request?)`**  
  - En el cliente (`typeof window !== 'undefined'`) devuelve siempre `''`.  
  - En el servidor devuelve `getPublicAppOrigin(request)` si se pasa `request`.  
  - Uso: cualquier construcción de URLs en el front debe usar rutas relativas; en cliente no se debe anteponer dominio.

- **Helpers existentes**  
  - `toRelativeApiUrl(url)`: convierte URLs absolutas a localhost/0.0.0.0 en solo path + query (ruta relativa).  
  - `LOCAL_ORIGIN_REGEX`: detecta orígenes no públicos para no devolverlos.

### 2.2 `src/components/landing/HomeLanding.tsx`

- **`getThumbnailUrl(video)`**  
  - Antes: lógica con `thumbnailUrl`, `toRelativeApiUrl`, y path `.jpg`.  
  - Ahora (portadas dinámicas):  
    - Si existe `video.path` → devuelve **solo** la ruta relativa:  
      `/api/thumbnail-cdn?path=${encodeURIComponent(video.path)}`  
    - Si no hay path → fallback:  
      `/logos/BBIMAGOTIPO_Mesa de trabajo 1.png`  
  - No se usa ninguna variable de dominio base (`baseUrl`); todo empieza por `/`.

- **Demos (reproductor y lista)**  
  - Siguen usando rutas relativas:  
    - `/api/demo-url?path=...`  
    - `/api/download?file=...&stream=true`  
  - El navegador los resuelve contra el mismo dominio.

---

## 3. Resultado esperado

- Imágenes: peticiones del tipo `/api/thumbnail-cdn?path=...` (relativas).  
- Demos: `/api/demo-url?path=...` (relativas).  
- Redirects del servidor (p. ej. placeholder): sin host; el navegador usa el dominio actual.  
- Cada video en la landing puede mostrar su portada vía la API (Bunny/FTP o placeholder), con fallback al logo si no hay path.

---

## 4. Variable en Render (manual)

Si el enlace del demo (`/api/demo-url?path=...`) falla o no reproduce, suele deberse a **comillas** en la variable de entorno.

1. Ir a **Render → tu servicio → Environment**.  
2. Buscar **`BUNNY_PACK_PATH_PREFIX`**.  
3. Debe estar **sin comillas**:  
   - Mal: `"Videos Enero 2026"`  
   - Bien: `Videos Enero 2026`  
4. Guardar y redeployar si aplica.

Esto no se arregla en código; solo en el panel de Render.

---

## 5. Archivos tocados en este fix

| Archivo | Cambio |
|--------|--------|
| `src/lib/utils.ts` | `getPublicAppOrigin` nunca devuelve 0.0.0.0/localhost; nueva `getBaseUrl`. |
| `src/components/landing/HomeLanding.tsx` | `getThumbnailUrl` dinámica por `video.path`, rutas relativas, fallback logo. |

---

## 6. Cómo subir a producción

```bash
git add src/lib/utils.ts src/components/landing/HomeLanding.tsx
git commit -m "fix: URLs relativas y portadas dinámicas (Connection Refused + thumbnails)"
git push origin main
```

Si el despliegue en Render está ligado a `main`, se desplegará automáticamente tras el push.
