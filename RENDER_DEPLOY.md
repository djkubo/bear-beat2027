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

## 5. Resumen rápido

- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start`
- **NEXT_PUBLIC_APP_URL** = `https://bear-beat2027.onrender.com`
- Todas las env de `.env.local` en Render (sin subir el archivo, solo copiar valores)

Cuando tengas el mensaje exacto del log (build o runtime), se puede afinar el fix.
