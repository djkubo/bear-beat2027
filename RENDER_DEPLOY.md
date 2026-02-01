# Deploy en Render – Bear Beat

Si **https://bear-beat2027.onrender.com** da error (502, 503 o página en blanco), revisa esto en [dashboard.render.com](https://dashboard.render.com):

---

## 1. Build y Start

En tu Web Service → **Settings**:

| Campo | Valor |
|-------|--------|
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start` |
| **Node Version** | 18 (o superior) |

El script `scripts/start.js` ya escucha en `0.0.0.0` y usa la variable `PORT` de Render.

---

## 2. Variables de entorno obligatorias

En **Environment** del servicio, asegúrate de tener al menos:

| Variable | Valor (ejemplo) |
|----------|------------------|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_URL` | `https://bear-beat2027.onrender.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | (tu URL de Supabase) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (tu anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | (tu service role key) |
| `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | (pk_test_ o pk_live_) |
| `STRIPE_SECRET_KEY` | (sk_test_ o sk_live_) |

Copia el resto de variables desde tu `.env.local` (Stripe webhook, Resend, ManyChat, etc.).

### Si usas Docker (build falla con "URL and Key are required")

Las variables **NEXT_PUBLIC_*** deben estar disponibles **durante el build**. En Render:

1. Ve a tu servicio → **Environment**
2. Añade o edita **NEXT_PUBLIC_SUPABASE_URL** y **NEXT_PUBLIC_SUPABASE_ANON_KEY**
3. En cada una, activa el scope **Build** (además de Runtime) para que Docker las reciba al hacer `npm run build`
4. Guarda y haz **Manual Deploy** de nuevo

Sin esto, el prerender de `/login` y otras páginas falla porque el cliente Supabase no tiene URL/key en el build.

---

## 3. Si el build falla por memoria

En el plan gratuito a veces el build de Next.js se queda sin memoria. En **Environment** añade:

| Variable | Valor |
|----------|--------|
| `NODE_OPTIONS` | `--max-old-space-size=512` |

Si sigue fallando, sube a un plan de pago con más RAM o reduce dependencias.

---

## 4. Ver el error concreto

1. Dashboard → tu servicio **bear-beat2027**
2. Pestaña **Logs** (runtime) o **Events** → último deploy → **Build logs** / **Deploy logs**
3. Si el **build** falla: el mensaje suele indicar dependencia, TypeScript o memoria
4. Si el build pasa pero la web da 502: el **Start** está fallando (revisa **Logs** en vivo al cargar la URL)

---

## 5. Listado de videos en producción (contenido FTP)

En Render no hay carpeta local de videos; el listado se lee desde Supabase. Para que la página **Contenido** muestre los videos:

1. **Crear la tabla `videos` en Supabase**  
   Ejecuta en Supabase (SQL Editor) el archivo `supabase/SETUP_COMPLETO.sql` (o solo el bloque que crea la tabla `videos` y sus políticas RLS). Si ya lo ejecutaste antes, actualiza con la versión que incluye la tabla `videos`.

2. **Poblar el catálogo una vez** (desde tu máquina, donde tengas la carpeta de videos):  
   ```bash
   npm run db:sync-videos
   ```  
   Opcional: `node scripts/sync-videos-to-supabase.js "./ruta/a/tu/carpeta"`  
   Requiere en `.env.local`: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.

Después de eso, la web en Render mostrará el mismo listado de videos que tienes en la base de datos (los usuarios siguen descargando por FTP o por la web según tengas configurado).

---

## 6. Panel de admin y dashboard de cliente en producción

Para que en producción funcionen **Admin** y **Dashboard**:

1. **Base de datos al día**  
   En Supabase (SQL Editor) ejecuta **todo** `supabase/SETUP_COMPLETO.sql`. Incluye tablas (`users`, `packs`, `genres`, `videos`, `purchases`, `pending_purchases`, `user_events`, `push_*`, `ftp_pool`, `conversations`, `messages`) y políticas RLS para que un usuario con `role = 'admin'` pueda leer todo lo necesario.

2. **Crear un usuario admin**  
   - Crea el usuario en **Authentication → Users** (o regístrate en la app en `/register`).  
   - En **SQL Editor**:
     ```sql
     UPDATE users SET role = 'admin' WHERE email = 'tu@email.com';
     ```

3. **URLs en producción**  
   - **Admin:** https://bear-beat2027.onrender.com/admin (solo si tu usuario tiene `role = 'admin'`).  
   - **Dashboard cliente:** https://bear-beat2027.onrender.com/dashboard (usuario logueado; si tiene compra ve acceso y credenciales FTP).  
   - **Contenido:** https://bear-beat2027.onrender.com/contenido (listado de videos; en producción se lee desde Supabase si no hay carpeta local).

Si no ves el panel de admin, comprueba que tu usuario en la tabla `users` tenga `role = 'admin'` y que hayas hecho login con ese usuario.

---

## 7. Resumen rápido

- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start`
- **NEXT_PUBLIC_APP_URL** = `https://bear-beat2027.onrender.com`
- Todas las env de `.env.local` en Render (sin subir el archivo, solo copiar valores)

Cuando tengas el mensaje exacto del log (build o runtime), se puede afinar el fix.

---

## 8. Checklist para que todo funcione en producción

| Paso | Dónde | Qué hacer |
|------|--------|-----------|
| 1 | Supabase → SQL Editor | Ejecutar **todo** `supabase/SETUP_COMPLETO.sql` (tablas, RLS, `is_admin()`, `get_admin_stats()`, géneros, pack, `videos`, `ftp_pool`, `conversations`, `messages`) |
| 2 | Supabase → Authentication | Crear usuario (o registrarse en la app). Luego en SQL: `UPDATE users SET role = 'admin' WHERE email = 'tu@email.com';` |
| 3 | Tu máquina (carpeta de videos) | `npm run db:sync-videos` para poblar el catálogo y que `/contenido` muestre videos en Render |
| 4 | Render → Environment | Tener todas las variables (Supabase, Stripe, Resend, etc.) y **NEXT_PUBLIC_APP_URL** = `https://bear-beat2027.onrender.com` |
| 5 | Render | Deploy (o redeploy tras push a `main`) |

**URLs en producción:**

- **Sitio:** https://bear-beat2027.onrender.com  
- **Admin:** https://bear-beat2027.onrender.com/admin (solo usuario con `role = 'admin'`)  
- **Dashboard cliente:** https://bear-beat2027.onrender.com/dashboard  
- **Contenido (videos):** https://bear-beat2027.onrender.com/contenido  
- **Admin-panel** redirige a `/admin`.
