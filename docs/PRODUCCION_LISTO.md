# Producción – Estado y comprobaciones

## ✅ Hecho en esta sesión

1. **Variables en Render**  
   Todas las claves de `.env.local` (Supabase, Stripe, PayPal, FTP, Bunny, Resend, Twilio, ManyChat, Meta, VAPID, OpenAI, etc.) están subidas a Render vía API y se ha **disparado un deploy**.

2. **Build local**  
   `npm run build` y `npm run type-check` pasan correctamente.

3. **Código**  
   - Portadas, demos, descargas y descargas por carpeta usan el mismo prefijo (`getBunnyPackPrefix()`).
   - Listado de archivos en `/api/files` es **recursivo** (muestra todos los archivos en subcarpetas).
   - Documentación en `docs/VERIFICACION_PORTADAS_DEMOS_DESCARGAS.md`.

---

## ⚠️ Para que el código nuevo esté en producción

Render construye desde tu **repositorio Git**. Si tienes cambios sin subir (listFilesRecursive, ajustes en `/api/files`, etc.):

```bash
git add .
git commit -m "Portadas, demos, descargas unificados; listado recursivo; env en producción"
git push origin main
```

(Usa la rama que tenga configurada Render, por ejemplo `main` o `master`.)  
Tras el push, Render hará un nuevo deploy con el código actual.

---

## Comprobar en producción

1. **Config**  
   https://bear-beat2027.onrender.com/api/debug-config  
   Debe mostrar Bunny, Stripe, etc. correctos.

2. **Supabase Auth (login)**  
   Si no lo has hecho: en [Supabase](https://supabase.com/dashboard) → tu proyecto → **Authentication** → **URL Configuration**:
   - **Site URL:** `https://bear-beat2027.onrender.com`
   - **Redirect URLs:** `https://bear-beat2027.onrender.com/**` y `http://localhost:3000/**`  
   Ver `docs/SUPABASE_AUTH_URLS_PASOS.md`.

3. **Portadas y demos**  
   Entra en **Contenido** y comprueba que se ven las carátulas y que los demos reproducen.

4. **Descargas**  
   Con un usuario con compra: descarga un video y, si usas la vista por carpeta, que el listado y la descarga funcionen.

5. **Bunny**  
   Que los archivos estén en Bunny Storage bajo `BUNNY_PACK_PATH_PREFIX` (ej. `Videos Enero 2026/`). Si no: `npm run db:sync-videos-to-bunny` y/o `node scripts/generate-thumbnails-from-videos.js --all` en local.

---

## Resumen

| Qué | Estado |
|-----|--------|
| Env en Render | ✅ Subido y deploy disparado |
| Build | ✅ Pasa en local |
| Código en Render | ⚠️ Haz `git push` si hay cambios sin subir |
| Supabase Auth URLs | ⚠️ Configurar a mano si no está hecho |
| Archivos en Bunny | ⚠️ Sincronizar videos/thumbnails si hace falta |

Cuando el deploy de Render termine, la app en https://bear-beat2027.onrender.com usará las variables actuales. Con el push del código y las comprobaciones anteriores, todo queda listo en producción.
