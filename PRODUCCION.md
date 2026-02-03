# 🚀 PRODUCCIÓN – Bear Beat (todo en un solo lugar)

**URL producción:** https://bear-beat2027.onrender.com  
**Hosting:** Render | **DB:** Supabase | **Pagos:** Stripe (+ PayPal, OXXO, SPEI)

**⚠️ Si el login no persiste en producción:** [CHECKLIST Supabase (Site URL + Redirect URLs)](docs/CHECKLIST_SUPABASE_PRODUCCION.md) — obligatorio una vez por proyecto.

**Documentación exhaustiva (secciones, botones, textos, APIs, flujos):** ver [DOCUMENTACION_COMPLETA.md](DOCUMENTACION_COMPLETA.md).

**Regla del proyecto:** Cualquier cambio de código se sube a producción (`git push origin main`) y se documenta (DOCUMENTACION_COMPLETA.md o este archivo) en el mismo flujo. Ver también `.cursor/rules/deploy-and-docs.mdc`.

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
| GET | `/api/download?file=...` | Descarga de video (con acceso); redirect a CDN firmado |
| GET | `/api/demo-url?path=...` | Redirect a demo desde CDN (rápido) o proxy `/api/demo` |
| GET | `/api/thumbnail/[...path]` | Miniatura de video |
| GET | `/api/demo/[...path]` | Demo de video (proxy FTP si no hay CDN) |
| POST | `/api/create-payment-intent` | PaymentIntent para Tarjeta/OXXO/SPEI (body: packSlug, currency, email opcional) |
| POST | `/api/create-checkout` | Crear sesión Stripe (body: packSlug, paymentMethod, currency, email opcional para OXXO/SPEI) |
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

**Crear admin y dar compra de prueba (test@bearbeat.com):**  
Ejecuta en Supabase → SQL Editor el archivo **`supabase/FIX_TEST_USER_ADMIN_AND_PURCHASE.sql`**. Ese script:
1. Sincroniza el usuario de Auth a `public.users` y le pone `role = 'admin'`.
2. Le asigna una compra del pack `enero-2026` para que pueda descargar.
3. (Opcional) Crea un trigger para que futuros usuarios de Auth tengan fila en `public.users`.

Si el usuario no existe en Auth, créalo antes en **Authentication > Users > Add user** (email + contraseña).

**Solo marcar admin (si ya existe en public.users):**
```sql
UPDATE users SET role = 'admin' WHERE email = 'tu@email.com';
```

**Poblar catálogo de videos (para que `/contenido` muestre lista en Render):**

- **Si los videos están en el Storage Box Hetzner** (ej. `u540473.your-storagebox.de`):  
  **Opción A – Desde el servidor (recomendado):** En Render → Environment añade `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` (o `HETZNER_FTP_HOST`, `HETZNER_FTP_USER`, `HETZNER_FTP_PASSWORD`). Luego entra como **admin** a `/admin` y pulsa **«Sincronizar catálogo desde FTP»**. El sync corre en el servidor con esas variables; no hace falta .env.local.  
  **Opción B – Desde tu máquina:** En `.env.local` pon las mismas variables FTP y Supabase; luego ejecuta `npm run db:sync-videos-ftp`.

- **Si los videos están en una carpeta local:**  
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

**Opcionales (evitar errores en consola):**
- `NEXT_PUBLIC_META_PIXEL_DISABLED=true`: desactiva el pixel de Meta hasta que el dominio tenga permisos de tráfico en Meta.
- Si no usas ManyChat, no definas `NEXT_PUBLIC_MANYCHAT_PAGE_ID` (el widget no se carga y no aparece "Page Id is required").
- `NEXT_PUBLIC_APP_URL`: debe ser la URL pública (ej. `https://bear-beat2027.onrender.com`); se usa en redirects y callbacks.

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
| **FTP (listado catálogo)** | `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` (o `HETZNER_FTP_*`) | Para sync de videos desde Storage Box: botón «Sincronizar catálogo desde FTP» en `/admin` o `npm run db:sync-videos-ftp` local. |
| **Render** | `RENDER_API_KEY` (solo local) | Script `deploy:env` para subir env al servicio. |

Ninguna clave debe estar hardcodeada en el código; todas vienen de variables de entorno (o de `.env.example` como plantilla).

---

## 5. Checklist para dejar todo en producción

1. **Base de datos**
   - Ejecutar `npm run db:setup` (o pegar `SETUP_COMPLETO.sql` en Supabase SQL Editor).
   - Crear admin: `UPDATE users SET role = 'admin' WHERE email = '...';`

2. **Catálogo de videos (para que se vean en `/contenido`)**
   - Videos en **Hetzner Storage Box**: en **Render → Environment** pon `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` (o `HETZNER_FTP_*`). Luego entra como admin a **/admin** y pulsa **«Sincronizar catálogo desde FTP»** (el sync corre en el servidor). O desde tu máquina con las mismas vars en `.env.local`: `npm run db:sync-videos-ftp`.
   - Videos en **carpeta local**: `npm run db:sync-videos`.

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
   - https://bear-beat2027.onrender.com/admin (con usuario admin; ejecuta `supabase/FIX_TEST_USER_ADMIN_AND_PURCHASE.sql` si no entras).
   - https://bear-beat2027.onrender.com/dashboard (con usuario logueado).
   - Descarga: requiere sesión + compra; mismo script da compra a test@bearbeat.com.
   - **Demos:** en producción los demos se sirven por proxy FTP; en Render deben estar `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` para que funcionen.

---

## 5.1 Demos en producción: por qué no funcionan y qué hacer

**Por qué los demos no funcionan en Render**

En producción **no hay carpeta local** de videos: el servidor (Render) no tiene los archivos. Los demos se sirven haciendo **proxy desde tu Storage Box (FTP)**. Si las variables FTP no están configuradas en Render, la API `/api/demo/[...path]` devuelve **503** y el reproductor muestra "Demo no disponible".

**Checklist para que funcionen**

1. **En Render → Environment** añade (con los valores reales de tu Hetzner Storage Box):
   - `FTP_HOST` = host FTP (ej. `u540473.your-storagebox.de`)
   - `FTP_USER` = usuario FTP con acceso de **lectura** a la carpeta de videos
   - `FTP_PASSWORD` = contraseña de ese usuario

   Nombres alternativos que también lee la API: `HETZNER_FTP_HOST`, `HETZNER_FTP_USER`, `HETZNER_FTP_PASSWORD`.

2. **Carpeta base en el FTP:** por defecto la API entra en la carpeta `Videos Enero 2026`. Si la tuya es otra, define `FTP_BASE_PATH` o `FTP_VIDEOS_PATH` en Render con el nombre exacto.

3. **Si el puerto 21 está bloqueado** (algún proveedor o firewall): usa FTPS (puerto 990). En Render añade:
   - `FTP_SECURE=true`
   - Opcional: `FTP_PORT=990`

4. **Reinicia el servicio** en Render después de cambiar variables para que las cargue.

5. **Comprueba:** entra en `/contenido`, elige un género y un video; si el demo carga, está bien. Si sigue fallando, en la pestaña Red (DevTools) mira la petición a `/api/demo/...`: si es **503**, el mensaje en el JSON indica si falta configuración FTP o falló la conexión; si es **404**, el path del archivo no coincide con lo que hay en el FTP (revisa `file_path` en la tabla `videos` y la estructura en el Storage Box).

**Resumen:** Los demos **sí pueden funcionar** con la configuración actual del servidor, pero **dependen al 100 % de que Render tenga FTP_HOST, FTP_USER y FTP_PASSWORD** (y, si hace falta, FTP_SECURE=true). Sin esas variables en Render, no hay forma de que el proxy de demos funcione.

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

## 8. Cambios recientes (sesión, consola, landing, CRO, E2E)

- **Sesión (admin, descarga):** Middleware no reemplaza la respuesta al setear cookies; auth callback escribe cookies en la respuesta de redirect; admin redirige a `/login?redirect=/admin` si no hay sesión. Ver DOCUMENTACION_COMPLETA.md §19.
- **Landing:** Hero y stats usan una sola fuente (`packInfo` del mismo fetch que la lista de géneros); los números coinciden con lo mostrado.
- **Consola:** Meta Pixel desactivable con `NEXT_PUBLIC_META_PIXEL_DISABLED=true`; ManyChat solo se carga si hay `NEXT_PUBLIC_MANYCHAT_PAGE_ID`; user_events insert defensivo; thumbnail usa `NEXT_PUBLIC_APP_URL` para redirects.
- **CRO embudo (2026-02):** Landing con H1 "1,000 videos HD...", sección Para quién es/NO es, garantía 30 días; create-checkout con metadata customer_email/customer_name en Stripe; complete-purchase con mensaje "¡Pago confirmado!", credenciales FTP visibles, botones Descargar por Web y Datos FTP. E2E Playwright en `e2e/purchase-flow.spec.ts`. Ver DOCUMENTACION_COMPLETA.md §19.5 y docs/CRO_EMBUDO_COPY.md.
- **Fix build (2026-02):** complete-purchase: `ftp_username` opcional en writeText → uso de `?? ''` para tipo string (build TypeScript en Render). Ver DOCUMENTACION_COMPLETA.md §19.6.
- **Bunny CDN demos (2026-02):** Demos apuntan directo a Bunny (evita 503). Front usa `BUNNY_CDN_URL` vía GET `/api/cdn-base`; `getDemoCdnUrl` en `src/lib/utils.ts`. Añadir `BUNNY_CDN_URL=https://tu-zona.b-cdn.net` en .env.local y `npm run deploy:env`; guía Pull Zone: [docs/BUNNY_PULL_ZONE_SETUP.md](docs/BUNNY_PULL_ZONE_SETUP.md). Script `render-set-env.js` sube vars Bunny desde .env/.env.local.
- **Datos en tiempo real + metadata (2026-02):** Totales (videos, géneros, tamaño) vienen solo de `/api/videos` / `useVideoInventory` (sin 1.000/141 GB estáticos). Sync FTP (admin + script) parsea key/bpm del nombre de archivo, actualiza `packs.total_videos` y `total_size_gb` tras insertar. Migración Supabase ejecutada: columnas `key` y `bpm` en `videos`. Protección demos: clic derecho, arrastre y abrir en nueva ventana bloqueados. Ver [docs/METADATA_VIDEOS.md](docs/METADATA_VIDEOS.md).
- **30 ene 2026:** Scroll vertical (globals + layout overflow-y); chat a la derecha y z-40 para no tapar CTAs; home con datos reales (sin 3.200 inventado), StatsSection con totalPurchases/totalVideos, DemoPlayer con totalVideos real, demos con loading/vacío; componente CompatibleLogos (Serato, Rekordbox, VirtualDJ, Pioneer DJ, DENON DJ) con fallback a texto e instrucciones en `public/logos/README_COMPATIBLES.md`. Ver DOCUMENTACION_COMPLETA.md §19.8.

---

## 9. Render MCP (auto-debug desde Cursor)

Para que el agente pueda depurar Render (logs, deploys, métricas) desde Cursor, configurar el [Render MCP Server](https://render.com/docs/mcp-server). **Guía paso a paso (sin programación):** [docs/CONFIGURAR_RENDER_MCP_EN_CURSOR.md](docs/CONFIGURAR_RENDER_MCP_EN_CURSOR.md).

1. **API key:** Crear en [Render → Account Settings → API Keys](https://dashboard.render.com/settings#api-keys). La key da acceso a todos los workspaces y servicios de la cuenta.
2. **Cursor:** Añadir en `~/.cursor/mcp.json`:
   ```json
   {
     "mcpServers": {
       "render": {
         "url": "https://mcp.render.com/mcp",
         "headers": {
           "Authorization": "Bearer <TU_RENDER_API_KEY>"
         }
       }
     }
   }
   ```
3. **Workspace:** En Cursor, indicar el workspace de Render (ej. "Set my Render workspace to [nombre del workspace]").
4. **Ejemplos de prompts para Bear Beat:** "Pull the most recent error-level logs for my Bear Beat service", "List my Render services", "Why isn't my site at bear-beat2027.onrender.com working?", "What was the last deploy status for my web service?".

El MCP permite: listar servicios y deploys, ver logs (por nivel, filtros), métricas (CPU, memoria, respuestas), consultas SQL read-only a Postgres, y **actualizar env vars** de un servicio. No permite disparar deploys ni borrar recursos. Ver [docs oficiales](https://render.com/docs/mcp-server).

---

## 10. Documentación relacionada

- **README.md** – Resumen, stack, instalación, admin/dashboard.
- **INSTALACION.md** – Pasos detallados de instalación y crear admin.
- **RENDER_DEPLOY.md** – Build, env, listado videos, admin en producción, checklist.
- **docs/HETZNER_FTP_REAL.md** – FTP real con subcuentas (Robot API); ya implementado.
- **REGLAS_PROYECTO.md** – Prohibido hardcode para conteos/precios; prioridad flujo producción.
