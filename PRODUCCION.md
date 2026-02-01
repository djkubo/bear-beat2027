# 🚀 PRODUCCIÓN – Bear Beat (todo en un solo lugar)

**URL producción:** https://bear-beat2027.onrender.com  
**Hosting:** Render | **DB:** Supabase | **Pagos:** Stripe (+ PayPal, OXXO, SPEI)

---

## 1. Páginas que existen (rutas)

| Ruta | Descripción | Público / Protegido |
|------|-------------|---------------------|
| `/` | Landing | Público |
| `/checkout` | Pago (pack) | Público |
| `/contenido` | Listado de videos | Público (descarga según compra) |
| `/preview` | Preview de contenido | Público |
| `/login` | Inicio de sesión | Público |
| `/register` | Registro | Público |
| `/forgot-password` | Recuperar contraseña | Público |
| `/reset-password` | Cambiar contraseña | Público |
| `/verify-email` | Confirmación email | Público |
| `/dashboard` | Panel cliente (packs, FTP, historial) | Logueado |
| `/mi-cuenta` | Editar perfil (nombre, teléfono) | Logueado |
| `/portal` | Hub cliente (enlaces a contenido, FTP, comunidad, mi cuenta) | Logueado |
| `/comunidad` | Bonos VIP (WhatsApp, packs, guías) | Logueado |
| `/complete-purchase` | Post-pago (activar acceso) | Público / Logueado |
| `/pago-pendiente` | Pago pendiente OXXO/SPEI | Público |
| `/terminos` | Términos y condiciones | Público |
| `/privacidad` | Política de privacidad | Público |
| `/reembolsos` | Política de reembolsos | Público |
| `/cookies` | Uso de cookies | Público |
| `/diagnostico` | Diagnóstico técnico | Público |
| `/admin` | Panel admin (KPIs, enlaces) | Solo `role = admin` |
| `/admin/users` | Lista usuarios | Admin |
| `/admin/users/[id]` | Detalle usuario | Admin |
| `/admin/purchases` | Compras | Admin |
| `/admin/packs` | Packs | Admin |
| `/admin/pending` | Compras pendientes | Admin |
| `/admin/tracking` | Eventos / tracking | Admin |
| `/admin/attribution` | Atribución | Admin |
| `/admin/chatbot` | Conversaciones chatbot | Admin |
| `/admin/mensajes` | Enviar mensajes a usuarios | Admin |
| `/admin/manychat` | ManyChat | Admin |
| `/admin/push` | Push notifications | Admin |
| `/admin/settings` | Config (texto; config real = env) | Admin |
| `/admin-panel` | Redirige a `/admin` | Admin |

---

## 2. APIs que existen

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/api/videos` | Listado de videos (disco o Supabase) |
| GET | `/api/download?file=...` | Descarga de video (con acceso) |
| GET | `/api/thumbnail/[...path]` | Miniatura de video |
| GET | `/api/demo/[...path]` | Demo de video |
| POST | `/api/create-checkout` | Crear sesión Stripe |
| GET | `/api/verify-payment?session_id=...` | Verificar pago Stripe |
| POST | `/api/complete-purchase/activate` | Activar compra (Stripe + crear FTP Hetzner si aplica) |
| POST | `/api/webhooks/stripe` | Webhook Stripe |
| POST | `/api/track-event` | Tracking de eventos |
| GET | `/api/facebook` | Facebook CAPI |
| POST | `/api/push/subscribe` | Suscripción push |
| POST | `/api/push/send` | Enviar push (admin) |
| POST | `/api/chat` | Chat widget |
| POST | `/api/admin/ftp-pool` | Añadir credencial FTP (admin, service role) |
| POST | `/api/send-sms` | SMS (Twilio) |
| POST | `/api/send-whatsapp` | WhatsApp (Twilio) |
| POST | `/api/verify-phone` | Verificación teléfono |
| GET/POST | `/api/manychat/*` | ManyChat init/webhook |
| GET | `/api/files` | Listado archivos (con acceso) |
| POST | `/api/setup-database` | Setup DB (si se usa) |
| GET | `/auth/callback` | Callback OAuth (Google, etc.) |

---

## 3. Base de datos (Supabase)

**Un solo archivo:** `supabase/SETUP_COMPLETO.sql`  
Incluye: tablas, RLS, políticas, `is_admin()`, `get_admin_stats()`, géneros, pack Enero 2026.

**Tablas:**  
`users`, `packs`, `genres`, `videos`, `purchases`, `pending_purchases`, `user_events`, `push_subscriptions`, `push_notifications_history`, `ftp_pool`, `conversations`, `messages`.

**Ejecutar (local, con `DATABASE_URL` en `.env.local`):**
```bash
npm run db:setup
```

**Crear admin (en Supabase SQL Editor o tras registro):**
```sql
UPDATE users SET role = 'admin' WHERE email = 'tu@email.com';
```

**Poblar catálogo de videos (para que `/contenido` muestre lista en Render):**
```bash
npm run db:sync-videos
```
(Opcional: `node scripts/sync-videos-to-supabase.js "./ruta/carpeta/videos"`)

---

## 4. Variables de entorno

**Obligatorias (Render y local):**

| Variable | Uso |
|----------|-----|
| `NODE_ENV` | `production` en Render |
| `NEXT_PUBLIC_APP_URL` | `https://bear-beat2027.onrender.com` en producción |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend / admin / ftp-pool |
| `STRIPE_SECRET_KEY` | Pagos |
| `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | Checkout cliente |
| `STRIPE_WEBHOOK_SECRET` | Webhook Stripe |

**Recomendadas:**  
`DATABASE_URL` (para `db:setup` y scripts), `NEXT_PUBLIC_META_PIXEL_ID`, `FACEBOOK_CAPI_ACCESS_TOKEN`, `NEXT_PUBLIC_MANYCHAT_PAGE_ID`, `MANYCHAT_API_KEY`, `TWILIO_*` (SMS/WhatsApp), `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`, `BUNNY_*` (storage), **Hetzner Robot** (`HETZNER_ROBOT_USER`, `HETZNER_ROBOT_PASSWORD`, `HETZNER_STORAGEBOX_ID`) para FTP real por compra, `RESEND_API_KEY`, etc.

**Subir env a Render desde `.env.local`:**
```bash
npm run deploy:env
```
(Requiere `RENDER_API_KEY` en `.env.local`.)

**Listado completo de variables:** ver `.env.example` (todas las claves del proyecto por servicio).

---

### 4b. Claves API y servicios conectados

| Servicio | Variables | Uso en la app |
|----------|-----------|----------------|
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` | Auth, DB, listado videos, admin, ftp-pool. `DATABASE_URL` para scripts `db:setup` y `db:sync-videos`. |
| **Stripe** | `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Checkout, pagos, webhook `POST /api/webhooks/stripe`. |
| **Meta / Facebook** | `NEXT_PUBLIC_META_PIXEL_ID`, `FACEBOOK_CAPI_ACCESS_TOKEN` | Pixel en cliente, CAPI en servidor (tracking, conversiones). |
| **ManyChat** | `NEXT_PUBLIC_MANYCHAT_PAGE_ID`, `MANYCHAT_API_KEY` | Widget Messenger, APIs `/api/manychat/*`, enlaces m.me (desde `config/contact`). |
| **Push (web-push)** | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` | Suscripción push, `/api/push/send` (admin). Sin clave pública no se registran push. |
| **Twilio** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_NUMBER` | SMS (`/api/send-sms`), WhatsApp (`/api/send-whatsapp`), verificación teléfono. |
| **Resend** | `RESEND_API_KEY` | Emails (referenciado; integración en desarrollo). |
| **Bunny** | `BUNNY_*` (API key, storage zone, CDN, stream) | Storage/CDN; si están configurados, `/api/download` redirige a URL firmada. |
| **Hetzner Robot** | `HETZNER_ROBOT_USER`, `HETZNER_ROBOT_PASSWORD`, `HETZNER_STORAGEBOX_ID` | Crear subcuenta FTP real por compra (solo lectura). Ver `docs/HETZNER_FTP_REAL.md`. |
| **Render** | `RENDER_API_KEY` (solo local) | Script `deploy:env` para subir env al servicio. |

Ninguna clave debe estar hardcodeada en el código; todas vienen de variables de entorno (o de `.env.example` como plantilla).

---

## 5. Checklist para dejar todo en producción

1. **Base de datos**
   - Ejecutar `npm run db:setup` (o pegar `SETUP_COMPLETO.sql` en Supabase SQL Editor).
   - Crear admin: `UPDATE users SET role = 'admin' WHERE email = '...';`

2. **Catálogo de videos (opcional pero recomendado)**
   - En tu máquina (con carpeta de videos): `npm run db:sync-videos`.

3. **Variables en Render**
   - En Render → Service → Environment: tener todas las de la sección 4.
   - O ejecutar `npm run deploy:env` (con `RENDER_API_KEY` en `.env.local`).
   - En Render, marcar **Build** para `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` si usas Docker.

4. **Deploy**
   - Push a `main` (si hay auto-deploy) o Manual Deploy en Render.
   - Build: `npm install && npm run build` | Start: `npm run start`.

5. **Comprobar**
   - https://bear-beat2027.onrender.com
   - https://bear-beat2027.onrender.com/contenido (listado de videos si hiciste sync).
   - https://bear-beat2027.onrender.com/admin (con usuario admin).
   - https://bear-beat2027.onrender.com/dashboard (con usuario logueado).

---

## 6. Scripts npm

| Script | Qué hace |
|--------|----------|
| `npm run dev` | Desarrollo local |
| `npm run build` | Build para producción |
| `npm run start` | Servidor producción (usa `scripts/start.js`) |
| `npm run db:setup` | Ejecuta `SETUP_COMPLETO.sql` contra Supabase |
| `npm run db:sync-videos` | Sincroniza carpeta local → tabla `videos` |
| `npm run db:sync-videos-ftp` | Sincroniza listado desde FTP Hetzner → tabla `videos` |
| `npm run deploy:env` | Sube variables de `.env.local` a Render |

---

## 7. Todo lo implementado (referencia única)

- **Landing:** contador de videos dinámico (Supabase `videos`), precio $350 MXN, sticky CTA móvil, lenguaje humano.
- **Checkout:** Stripe (tarjeta, OXXO, SPEI), detección país, garantías, resumen con conteo real de videos.
- **Complete-purchase:** verificación Stripe, creación de subcuenta FTP en Hetzner (Robot API) si están configuradas las vars, guardado en `purchases`, mensajes de error amables.
- **Dashboard:** datos reales (usuario, compras con pack, credenciales FTP reales), host FTP = subcuenta o `NEXT_PUBLIC_FTP_HOST`, historial de descargas (placeholder).
- **Contenido:** listado desde Supabase en producción; paywall "OBTENER ACCESO POR $350"; descarga por web (Bunny si configurado, si no stream desde servidor).
- **Admin:** KPIs (`get_admin_stats`), usuarios, compras, packs, pendientes, tracking, attribution, chatbot, manychat, push, ftp-pool, settings.
- **Mi cuenta, Portal, Comunidad:** páginas creadas; navegación con sesión (Mi Panel, Mi cuenta, Portal, Comunidad VIP).
- **Pixel:** evento Purchase con valor dinámico (monto y moneda real).
- **Base de datos:** SETUP_COMPLETO.sql idempotente; tablas users, packs, genres, videos, purchases, pending_purchases, user_events, push_*, ftp_pool, conversations, messages; RLS y políticas; is_admin(), get_admin_stats().
- **Scripts:** db:setup, db:sync-videos, db:sync-videos-ftp (catálogo desde FTP Hetzner), deploy:env (subir env a Render).

Nada de conteos ni precios hardcodeados; todo desde Supabase o APIs. Ver REGLAS_PROYECTO.md.

---

## 8. Documentación relacionada

- **README.md** – Resumen, stack, instalación, admin/dashboard.
- **INSTALACION.md** – Pasos detallados de instalación y crear admin.
- **RENDER_DEPLOY.md** – Build, env, listado videos, admin en producción, checklist.
- **docs/HETZNER_FTP_REAL.md** – FTP real con subcuentas (Robot API); ya implementado.
- **REGLAS_PROYECTO.md** – Prohibido hardcode para conteos/precios; prioridad flujo producción.
