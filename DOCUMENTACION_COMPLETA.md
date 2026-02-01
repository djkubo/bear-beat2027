# 📚 DOCUMENTACIÓN COMPLETA – Bear Beat 2027

Documentación nivel detallado de todas las secciones, botones, textos, APIs y flujos del proyecto.

---

## ÍNDICE

1. [Home (Landing)](#1-home-landing)
2. [Login](#2-login)
3. [Registro](#3-registro)
4. [Contenido (Explorador de videos)](#4-contenido-explorador-de-videos)
5. [Checkout](#5-checkout)
6. [Complete Purchase](#6-complete-purchase)
7. [Dashboard](#7-dashboard)
8. [Mi cuenta](#8-mi-cuenta)
9. [Portal](#9-portal)
10. [Comunidad](#10-comunidad)
11. [Admin](#11-admin)
12. [Páginas legales y auxiliares](#12-páginas-legales-y-auxiliares)
13. [Navbar y menú móvil](#13-navbar-y-menú-móvil)
14. [APIs](#14-apis)
15. [Base de datos](#15-base-de-datos)
16. [Variables de entorno](#16-variables-de-entorno)
17. [Scripts npm](#17-scripts-npm)
18. [Flujos principales](#18-flujos-principales)

---

## 1. HOME (Landing)

**Ruta:** `/`  
**Archivo:** `src/app/page.tsx`  
**Público:** Sí. Contenido y CTAs cambian según si el usuario está logueado y si tiene compra.

### 1.1 Banner superior (solo si NO tiene acceso)
- **Texto:** `🔥 OFERTA DE LANZAMIENTO 2026 - PRECIO ESPECIAL POR TIEMPO LIMITADO 🔥`
- **Estilo:** Fondo rojo gradiente, texto centrado, animación pulse.

### 1.2 Navbar (header)
- **Logo:** Imagen `BBIMAGOTIPOFONDOTRANSPARENTE...`, alt "Bear Beat".
- **Marca:** `BEAR BEAT` (texto bear-blue, font-black).
- **Enlaces desktop (con acceso):**
  - `📊 Mi Panel` → `/dashboard`
  - `Mi cuenta` → `/mi-cuenta`
  - `👁️ Ver Contenido` → `/contenido`
  - Badge: `✓ Acceso Activo`
- **Enlaces desktop (sin acceso, no logueado):**
  - Texto: `+2,847 DJs ya tienen acceso`
  - `Iniciar Sesión` → `/login`
  - `👁️ Ver Contenido` → `/contenido`
- **Enlaces desktop (sin acceso, logueado):**
  - `+2,847 DJs ya tienen acceso`
  - `Mi Panel` → `/dashboard`
  - `Mi cuenta` → `/mi-cuenta`
  - `👁️ Ver Contenido` → `/contenido`
- **Móvil:** Menú hamburger (`MobileMenu`).

### 1.3 Hero – Usuario CON acceso
- **Badge:** `✅ ¡Tu acceso está activo!`
- **Título:** `Tienes acceso a [N] Video Remixes` (N = inventario real).
- **Subtítulo:** `Tus videos están listos para descargar. Elige cómo quieres acceder:`
- **Botones:**
  - `⬇️ DESCARGAR VIDEOS` → `/contenido`
  - `📊 MI PANEL` → `/dashboard`
- **Texto inferior:** `✓ Descarga por navegador` `✓ Descarga por FTP` `✓ Soporte 24/7`

### 1.4 Hero – Usuario SIN acceso
- **Línea superior:** `ATENCIÓN DJs: Esto es lo que necesitas para dominar 2026`
- **Título:** `Descarga [N] Video Remixes en HD y Cobra Como Profesional`
- **Párrafo:** `El arsenal completo de videos que usan los DJs que cobran $15,000+ por evento. Organizados en [X] géneros, listos para usar HOY.`
- **Precio:** `$350` `MXN`, `Precio normal: $1,499`, `Ahorro: $1,149 (77% OFF)`
- **Urgencia:** `⏰ OFERTA LIMITADA`, `Últimos 153 lugares disponibles`
- **CTA principal:** `SÍ, QUIERO ACCESO AHORA →` → `/checkout?pack=enero-2026`
- **Garantías:** `✓ Acceso inmediato · ✓ Pago seguro · ✓ Garantía 30 días`

### 1.5 Sección stats (solo sin acceso)
- **Tres columnas:** Video Remixes (número), Géneros (número), De Contenido (tamaño).
- Datos desde `/api/videos` (inventario real).

### 1.6 Sección “Mira lo que vas a recibir”
- **Título:** `👀 Mira lo que vas a recibir`
- **Subtítulo:** `Videos reales del pack. Haz clic para ver un demo.`
- **Tabs:** Géneros con iconos (Reggaeton, Cumbia, etc.) y conteo de videos.
- **Grid:** Hasta 8 videos del género activo; cada card: thumbnail, artista, título, key/BPM; clic abre modal demo.
- **Botón:** `Ver los [N] videos completos →` → `/contenido`

### 1.7 Sección “Todos los géneros que necesitas”
- **Título:** `🎵 Todos los géneros que necesitas`
- **Subtítulo:** `Contenido real organizado por género`
- **Cards:** Por género: icono, nombre, número de videos, tamaño.

### 1.8 Sección “¿Te identificas con esto?” (pain points)
- **Título:** `😤 ¿Te identificas con esto?`
- **Items:** 5 bullets con icono + texto (horas buscando, suscripciones caras, video no carga, competencia, no tienes tiempo).

### 1.9 Sección “Con Bear Beat todo eso se acaba”
- **Título:** `✅ Con Bear Beat todo eso se acaba`
- **4 beneficios:** Descarga instantánea, Organizados por género, Calidad profesional, Descarga ilimitada.

### 1.10 Sección “¿Cuánto cuesta normalmente?”
- **Título:** `💰 ¿Cuánto cuesta normalmente esto?`
- **Tabla:** 3 filas (videos a $10 c/u, suscripción anual, 40hrs tiempo) con precios tachados.
- **Valor total:** `$8,000+ MXN` tachado.
- **Precio hoy:** `$350` MXN, pago único, acceso de por vida.
- **CTA:** `QUIERO MI ACCESO AHORA →` → `/checkout?pack=enero-2026`

### 1.11 Barra de escasez
- **Texto:** `⚠️ [N] lugares disponibles`, `847/1000 vendidos`
- Barra de progreso visual.

### 1.12 Garantía
- **Icono:** 🛡️
- **Título:** `Garantía de 30 Días`
- **Texto:** `Si no estás 100% satisfecho, te devolvemos tu dinero. Sin preguntas, sin complicaciones.`

### 1.13 Testimonios
- **Título:** `⭐ Lo que dicen los DJs`
- **3 cards:** DJ Carlos (CDMX), DJ María (Monterrey), DJ Roberto (Guadalajara) con texto y estrellas.

### 1.14 CTA final “Decisión Simple”
- **Título:** `🎯 Decisión Simple`
- **Dos columnas:** “❌ Sin Bear Beat” (4 bullets negativos) y “✅ Con Bear Beat” (4 bullets positivos).
- **CTA:** `SÍ, QUIERO MIS [N] VIDEOS →` → `/checkout?pack=enero-2026`
- **Nota:** `🔒 Pago seguro · ⚡ Acceso inmediato · 🛡️ Garantía 30 días`

### 1.15 Footer
- **Logo + BEAR BEAT**
- **Enlaces:** Términos → `/terminos`, Privacidad → `/privacidad`, Reembolsos → `/reembolsos`
- **Copyright:** `© 2026 Bear Beat. Todos los derechos reservados.`

### 1.16 Sticky CTA móvil (solo sin acceso)
- **Texto botón:** `Comprar ahora · $350 MXN`
- **Destino:** `/checkout?pack=enero-2026`

### 1.17 Modal demo (al hacer clic en un video)
- Reproductor con `/api/demo/[path]` o descarga si tiene acceso.
- Botón cerrar; CTA a checkout si no tiene acceso.

---

## 2. LOGIN

**Ruta:** `/login`  
**Archivo:** `src/app/login/page.tsx`

### 2.1 Banner
- **Texto:** `🎉 DJs ya tienen acceso • ¿Qué esperas tú?`

### 2.2 Sidebar (desktop)
- **Logo + BEAR BEAT** → `/`
- **Título:** `Tu biblioteca de videos te espera`
- **Lista beneficios:** Descarga ilimitada Web/FTP, géneros, actualizaciones, cualquier dispositivo, soporte 24/7.

### 2.3 Formulario
- **Título:** `Entra a tu cuenta`
- **Subtítulo:** `Accede a tus videos y descargas`
- **Campos:** Email (placeholder `tu@email.com`), Contraseña (placeholder `Tu contraseña`).
- **Mostrar/ocultar contraseña:** toggle.
- **Botón:** `Iniciar Sesión`
- **Enlace:** `¿Olvidaste tu contraseña?` → `/forgot-password`
- **Botón Google:** `Continuar con Google`
- **Registro:** `¿No tienes cuenta? Regístrate` → `/register`
- **Redirect post-login:** `redirect` query o `/dashboard`.

---

## 3. REGISTRO

**Ruta:** `/register`  
**Archivo:** `src/app/register/page.tsx`

### 3.1 Pasos
- **Paso 1 (info):** nombre, email, contraseña, repetir contraseña, teléfono (con selector de país). Validación: contraseña ≥ 6 caracteres, contraseñas coinciden, teléfono válido.
- **Paso 2 (verify-phone):** envío de código por SMS/WhatsApp (`/api/verify-phone`), campo para código, countdown para reenviar.
- Placeholders: "Tu nombre", "tu@email.com", "Mínimo 6 caracteres", "Repite tu contraseña", "55 1234 5678", "000000".
- **Botón:** Registrarse / Verificar según paso.
- **Enlace:** "¿Ya tienes cuenta? Inicia sesión" → `/login`.
- Beneficios listados (acceso demos, descarga, FTP, etc.).

---

## 4. CONTENIDO (Explorador de videos)

**Ruta:** `/contenido`  
**Archivo:** `src/app/contenido/page.tsx`

### 4.1 Header
- **Logo + BEAR BEAT** → `/`
- **Con acceso:** `✅ Tu acceso está activo` → `/dashboard`
- **Sin acceso:** `🔥 OFERTA: $350 MXN`, botón `OBTENER ACCESO` → `/checkout?pack=enero-2026`
- **Menú móvil:** `MobileMenu`

### 4.2 Banner urgencia (sin acceso)
- **Texto:** `⚠️ SOLO HOY: Acceso a [N] videos por $350 MXN (precio normal $1,499)`
- **Enlace:** `Obtener ahora →` → `/checkout?pack=enero-2026`

### 4.3 Hero contenido
- **Título:** `📦 Pack Enero 2026`
- **Stats:** [N] Video Remixes • [X] Géneros • [tamaño]
- **Búsqueda:** placeholder `🔍 Buscar artista, canción, género, key o BPM...`
- **Stats rápidos:** Videos, Géneros, Calidad 1080p, Descarga Ilimitada.

### 4.4 Lista de géneros
- Acordeón por género (nombre, cantidad de videos, tamaño).
- Al expandir: lista de videos (número, artista, título, key, BPM).
- **Botones por video:** 👁️ (preview), ⬇️ (descarga; si no hay acceso abre paywall).

### 4.5 Panel lateral (video seleccionado)
- **Reproductor:** `src` = `/api/demo/[path]`, poster = thumbnail, `autoPlay` `muted`.
- **Badge:** `DEMO`, resolución (ej. 1080p).
- **Info:** artista, título, género, key, BPM.
- **Botón:** `⬇️ DESCARGAR ESTE VIDEO` (con acceso) o `🔓 DESBLOQUEAR DESCARGA` (paywall).
- **Sin selección:** texto `Selecciona un video`, `para ver la preview`.

### 4.6 CTA principal (sin acceso)
- **Precio:** `$350`, `$1,499 MXN` tachado, `Pago único`
- **Botón:** `OBTENER ACCESO AHORA →` → `/checkout?pack=enero-2026`
- **Lista:** 5 beneficios (videos HD, descarga ilimitada, FTP, soporte, garantía).

### 4.7 Modal paywall
- Al intentar descargar sin acceso: mensaje + CTA a checkout.

---

## 5. CHECKOUT

**Ruta:** `/checkout`  
**Archivo:** `src/app/checkout/page.tsx`

- **Query:** `pack` (ej. `enero-2026`).
- **Resumen:** [N] videos HD, descarga ilimitada, pago único.
- **Métodos de pago:** OXXO, SPEI, Tarjeta, PayPal (según configuración).
- **Precio:** 350 MXN o 19 USD (según país/detección).
- **Flujo:** POST `/api/create-checkout` → redirect a Stripe.
- **Textos:** “Comprar ahora”, “Procesando…”, “Redirigiendo a pago…”.

---

## 6. COMPLETE PURCHASE

**Ruta:** `/complete-purchase`  
**Archivo:** `src/app/complete-purchase/page.tsx`

- Página post-pago: completar datos (email, nombre, teléfono) si hace falta.
- **Botón:** Activar acceso → POST `/api/complete-purchase/activate` (sessionId, userId, email, name, phone).
- Mensajes de éxito/error; redirect a dashboard o contenido.
- **Texto éxito:** “Ya puedes descargar tus videos”, etc.

---

## 7. DASHBOARD

**Ruta:** `/dashboard`  
**Archivo:** `src/app/dashboard/page.tsx`

- **Solo logueado.** Redirect a `/login?redirect=/dashboard` si no hay sesión.
- **Datos:** perfil de `users` (o datos de auth), compras con `pack` y credenciales FTP.
- **Tabs:** "Web" y "FTP" para alternar instrucciones.
- **Credenciales FTP:** host = `{ftp_username}.your-storagebox.de` si username contiene `-sub`, si no `NEXT_PUBLIC_FTP_HOST` o fallback; usuario y contraseña de la compra. Botones "Copiar" por campo.
- **Texto:** "Descarga por navegador", "Ve las previews", "FTP para descarga masiva", etc.
- **Enlaces:** "⬇️ Descargar Videos" → `/contenido`, "Mi cuenta" → `/mi-cuenta`.
- **Historial de descargas:** placeholder (sin tabla de descargas por ahora).
- **Lista de beneficios/pasos** con iconos (Descargar, Ver previews, FTP, Soporte).

---

## 8. MI CUENTA

**Ruta:** `/mi-cuenta`  
**Archivo:** `src/app/mi-cuenta/page.tsx`

- **Solo logueado.** Editar nombre, teléfono.
- Placeholders: “Tu nombre”, “+52 55 1234 5678”.
- Guardar cambios contra Supabase.

---

## 9. PORTAL

**Ruta:** `/portal`  
**Archivo:** `src/app/portal/page.tsx`

- Hub de enlaces: Descargar Videos → `/contenido`, Mi cuenta, Comunidad VIP, etc.
- Lista de acciones con iconos y descripciones.
- **Texto ejemplo:** “Descarga por navegador: ve a Contenido y descarga los videos que necesites.”

---

## 10. COMUNIDAD

**Ruta:** `/comunidad`  
**Archivo:** `src/app/comunidad/page.tsx`

- Página de bonos VIP: enlaces WhatsApp, packs, guías.
- Contenido estático o dinámico según configuración.

---

## 11. ADMIN

**Ruta base:** `/admin`  
**Layout:** `src/app/admin/layout.tsx` (verifica sesión con `getSession()` y `role === 'admin'`).

### 11.1 Panel principal `/admin`
**Archivo:** `src/app/admin/page.tsx`

- **Header:** Logo, “Panel de Admin”, email del admin, botón “Ver como Cliente” → `/dashboard`.
- **KPIs (4 cards):**
  - Usuarios Totales (+ N hoy)
  - Ingresos Totales (MXN)
  - Packs Vendidos (+ N hoy)
  - Tasa de Conversión (%)
- **Menú de 9 secciones:**
  - 👥 Usuarios → `/admin/users`
  - 💳 Compras → `/admin/purchases`
  - 📦 Packs → `/admin/packs`
  - 📊 Tracking → `/admin/tracking`
  - 🎯 Atribución → `/admin/attribution`
  - 💬 Chatbot → `/admin/chatbot`
  - 🤖 ManyChat → `/admin/manychat`
  - ⏳ Pendientes → `/admin/pending`
  - ⚙️ Config → `/admin/settings`
- **Bloque “Sincronizar catálogo desde FTP”:**
  - **Título:** `📂 Sincronizar catálogo desde FTP`
  - **Descripción:** `Llena la tabla videos desde el Storage Box (u540473). Requiere FTP_* en Render.`
  - **Botón:** `Ejecutar sync` → POST `/api/admin/sync-videos-ftp`
  - **Mensaje éxito:** “✅ [mensaje]” con total de videos.
  - **Mensaje error:** “❌ [error]”
- **Tabla “Últimas Compras (10)”:** Fecha, Usuario, Pack, Monto, Método.

### 11.2 Subpáginas admin
- **Usuarios:** lista y detalle por id (compras, datos).
- **Compras:** listado de compras.
- **Packs:** listado de packs.
- **Tracking:** eventos / analytics.
- **Atribución:** datos de atribución.
- **Chatbot:** conversaciones del chat.
- **Mensajes:** enviar mensajes a usuarios.
- **ManyChat:** integración ManyChat.
- **Pendientes:** compras pendientes (pending_purchases).
- **Push:** enviar notificaciones push.
- **Settings:** texto de configuración (config real vía env).

---

## 12. PÁGINAS LEGALES Y AUXILIARES

| Ruta | Contenido principal |
|------|----------------------|
| `/terminos` | Términos y condiciones (texto largo). |
| `/privacidad` | Política de privacidad. |
| `/reembolsos` | Política de reembolsos. |
| `/cookies` | Uso de cookies. |
| `/forgot-password` | Recuperar contraseña (email). |
| `/reset-password` | Nueva contraseña (token en URL). |
| `/verify-email` | Confirmación de email. |
| `/pago-pendiente` | Mensaje pago pendiente OXXO/SPEI. |
| `/preview` | Página de preview de contenido (demos estáticos). |
| `/diagnostico` | Diagnóstico técnico (env, auth, etc.). |
| `/not-found` | 404 con enlace a inicio. |

---

## 13. NAVBAR Y MENÚ MÓVIL

### 13.1 Navbar (home y otras páginas)
- Logo + “BEAR BEAT” a la izquierda.
- Enlaces a la derecha según estado (ver sección Home).
- **Orden deseado:** Iniciar Sesión → Ver Contenido (a la derecha de Iniciar sesión).

### 13.2 MobileMenu (`src/components/ui/MobileMenu.tsx`)
- **Botón:** hamburger (3 líneas), solo visible en móvil.
- **Panel:** desde la derecha, fondo oscuro, logo + BEAR BEAT arriba.
- **Items según estado:**
  - **Con acceso:** Mi Panel, Portal, Descargar Videos, Comunidad VIP, Mi cuenta, Inicio.
  - **Logueado sin acceso:** Inicio, Ver Contenido, Comprar Acceso (destacado), Mi Panel, Portal, Comunidad VIP, Mi cuenta.
  - **No logueado:** Inicio, Ver Contenido, Comprar Acceso (destacado), Iniciar Sesión.
- **Footer del menú:** “¿Necesitas ayuda?” + botones “💬 Chat” (Messenger) y “📱 WhatsApp”.

---

## 14. APIs

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/videos` | Opcional (cookie) | Listado de géneros y videos. En producción solo desde Supabase (tabla `videos`). Params: `pack`, `genre`, `metadata`. |
| GET | `/api/download?file=...&stream=true` | Sesión + compra | Descarga o streaming. Usa `getSession()`. Con Bunny redirige a URL firmada; sin Bunny sirve desde disco. |
| GET | `/api/thumbnail/[...path]` | No | Miniatura del video. Si el archivo no existe (ej. producción), redirige a `/favicon.png`. |
| GET | `/api/demo/[...path]` | No | Streaming de demo desde disco. En producción sin disco devuelve 404. |
| POST | `/api/create-checkout` | Opcional | Crea sesión Stripe. Body: `packSlug`, `paymentMethod`, `currency`. |
| GET | `/api/verify-payment?session_id=...` | No | Verifica pago Stripe. |
| POST | `/api/complete-purchase/activate` | No | Activa compra: actualiza `pending_purchases`, inserta en `purchases`, crea subcuenta FTP Hetzner si hay env. Body: `sessionId`, `userId`, `email`, `name`, `phone`. |
| POST | `/api/webhooks/stripe` | Firma Stripe | Webhook: `checkout.session.completed` → crea `pending_purchases`. |
| POST | `/api/track-event` | No | Registra evento de tracking. |
| POST | `/api/admin/sync-videos-ftp` | Admin | Sincroniza catálogo desde FTP (Hetzner) a tabla `videos`. Usa `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` del servidor. Carpeta base: `Videos Enero 2026` (o `FTP_BASE_PATH`). |
| POST | `/api/push/subscribe` | Sesión | Suscripción push. |
| POST | `/api/push/send` | Admin | Enviar notificación push. |
| POST | `/api/chat` | No | Chat widget. |
| GET | `/auth/callback` | No | Callback OAuth (Google); `exchangeCodeForSession`, redirect a `next` o `/dashboard`. |

(Otras rutas listadas en PRODUCCION.md: facebook, manychat, send-sms, send-whatsapp, verify-phone, files, setup-database, admin/ftp-pool.)

---

## 15. BASE DE DATOS

**Archivo:** `supabase/SETUP_COMPLETO.sql`

### Tablas principales
- **users:** id, email, name, phone, country_code, role, created_at, updated_at, campos UTM y dispositivo.
- **packs:** id, slug, name, description, price_mxn, price_usd, release_month, total_videos, total_size_gb, status, featured, etc.
- **genres:** id, name, slug, video_count.
- **videos:** id, pack_id, genre_id, title, artist, duration, resolution, file_size, file_path, thumbnail_url, preview_url.
- **purchases:** id, user_id, pack_id, amount_paid, currency, payment_provider, payment_id, ftp_username, ftp_password, purchased_at.
- **pending_purchases:** id, stripe_session_id, user_id, pack_id, status, customer_email, customer_name, customer_phone, completed_at, expires_at, etc.

### Funciones
- **is_admin():** comprueba si el usuario tiene `role = 'admin'`.
- **get_admin_stats():** devuelve total_users, total_revenue, total_purchases, conversion_rate, users_today, purchases_today.

### Catálogo de videos
- En producción el listado sale de la tabla **videos** (poblada con sync FTP o script local).
- **Género mostrado:** si `genre_id` es null, se usa el primer segmento de `file_path` (carpeta del FTP), así no aparece “Otros” y se muestran todas las carpetas del servidor.

---

## 16. VARIABLES DE ENTORNO

### Obligatorias (producción)
- `NODE_ENV`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`, `STRIPE_WEBHOOK_SECRET`.

### FTP (sync y listado)
- `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` (o `HETZNER_FTP_*`). Opcional: `FTP_BASE_PATH` o `FTP_VIDEOS_PATH` (default `Videos Enero 2026`).

### Hetzner Robot (subcuentas por compra)
- `HETZNER_ROBOT_USER`, `HETZNER_ROBOT_PASSWORD`, `HETZNER_STORAGEBOX_ID`.

### Bunny (descargas en producción)
- `BUNNY_CDN_URL`, `BUNNY_TOKEN_KEY`, `BUNNY_PACK_PATH_PREFIX` (ej. `packs/enero-2026`).

### Otras
- Meta Pixel, ManyChat, Twilio, Resend, Push (VAPID), Render API key, etc. (ver `.env.example` y PRODUCCION.md).

---

## 17. SCRIPTS NPM

| Script | Uso |
|--------|-----|
| `npm run dev` | Desarrollo local. |
| `npm run build` | Build producción. |
| `npm run start` | Servidor producción. |
| `npm run db:setup` | Ejecuta SETUP_COMPLETO.sql contra Supabase. |
| `npm run db:sync-videos` | Sincroniza carpeta local → tabla `videos`. |
| `npm run db:sync-videos-ftp` | Sincroniza desde FTP Hetzner → tabla `videos`. Lee `.env` y `.env.local`. Carpeta base: `Videos Enero 2026` o `FTP_BASE_PATH`. |
| `npm run deploy:env` | Sube variables de `.env.local` a Render (requiere `RENDER_API_KEY`). |

---

## 18. FLUJOS PRINCIPALES

### 18.1 Autenticación
- **Login:** email/contraseña o Google → Supabase Auth → redirect (query `redirect` o `/dashboard`).
- **Admin:** layout usa `getSession()` (no `getUser()`) para leer cookie y evitar “no autenticado” en Server Components.
- **Download:** `/api/download` usa `getSession()` para comprobar usuario y compra.

### 18.2 Compra y activación
1. Usuario en checkout → POST `/api/create-checkout` → Stripe Checkout.
2. Tras pago, Stripe llama a `/api/webhooks/stripe` → se crea fila en `pending_purchases` (estado `awaiting_completion`).
3. Usuario llega a `/complete-purchase` (o redirect desde Stripe), rellena datos si faltan, pulsa “Activar” → POST `/api/complete-purchase/activate`.
4. Backend: verifica sesión Stripe, crea subcuenta FTP en Hetzner (si env configurado), actualiza `pending_purchases` a `completed`, inserta en `purchases` con `ftp_username` y `ftp_password`.

### 18.3 Catálogo de videos
- **Origen:** Tabla `videos` en Supabase.
- **Poblado por:** (A) Admin en `/admin` → “Sincronizar catálogo desde FTP” (POST `/api/admin/sync-videos-ftp`), o (B) local: `npm run db:sync-videos-ftp` con FTP_* en `.env.local`.
- **Estructura FTP esperada:** `Videos Enero 2026/[Género]/[archivos].mp4`. Géneros mostrados = carpetas dentro de esa base; si un video no tiene género en DB, se usa la carpeta de `file_path` como nombre de género (no “Otros”).

### 18.4 Descarga
- Usuario con compra en `/contenido` → clic descarga → GET `/api/download?file=Género/archivo.mp4` (y opcional `&stream=true`).
- Backend comprueba sesión y compra; si Bunny está configurado redirige a URL firmada; si no, sirve desde disco (solo desarrollo).

---

*Documentación generada para Bear Beat 2027. Para detalles de despliegue y checklist ver PRODUCCION.md.*
