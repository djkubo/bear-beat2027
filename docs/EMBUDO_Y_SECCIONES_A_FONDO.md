# Bear Beat: embudo completo y funcionamiento de cada sección

Documento de referencia: cómo funciona cada parte de la web y el flujo de venta de punta a punta.

---

## 1. Vista general del embudo

```
Visitante (no logueado)
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  LANDING (/)                                                     │
│  • Ve oferta, stats, géneros, "Los 10 más populares", CTA        │
│  • Puede: Ver Contenido → /contenido | Comprar → /checkout       │
│  • Puede: Iniciar sesión → /login | Registrarse → /register      │
└──────────────────────────────────────────────────────────────────┘
       │
       ├── Clic "Ver Contenido" ──────────────────────────────► /contenido (paywall)
       ├── Clic "Comprar" / CTA ──────────────────────────────► /checkout
       └── Login/Register (opcional antes de comprar)
       
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  CHECKOUT (/checkout?pack=enero-2026)                             │
│  • Elige método: OXXO | SPEI | Tarjeta | PayPal                  │
│  • POST /api/create-checkout → Stripe crea sesión                │
│  • Redirige a Stripe (hosted checkout)                            │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  STRIPE (externo)                                                 │
│  • Usuario paga (tarjeta/OXXO/SPEI/PayPal)                        │
│  • Stripe llama a tu webhook: POST /api/webhooks/stripe           │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐│
│  WEBHOOK STRIPE                                                   │
│  • Crea fila en pending_purchases (status: awaiting_completion)    │
│  • Registra user_events (payment_success)                         │
│  • Opcional: ManyChat (email/teléfono)                            │
│  • NO crea usuario ni acceso todavía                              │
└──────────────────────────────────────────────────────────────────┘
       │
       ├── Pago con tarjeta/PayPal ──► Stripe redirige a success_url
       │   success_url = /complete-purchase?session_id=...
       │
       └── Pago OXXO/SPEI ──► Stripe puede redirigir a cancel_url o
           a una página "esperando pago" → /pago-pendiente?session_id=...
           Cuando el pago se confirma, el webhook ya creó pending_purchases.
           El usuario puede ir manualmente a /complete-purchase?session_id=...
           o /pago-pendiente hace polling y redirige cuando status = awaiting_completion.
       
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  COMPLETE PURCHASE (/complete-purchase?session_id=...)            │
│  • GET /api/verify-payment?session_id=... → verifica pago Stripe  │
│  • Si hay usuario (logueado o en metadata): activa automático      │
│  • Si no: muestra formulario (email, nombre, teléfono, contraseña) │
│    o "Ya tengo cuenta" → login → luego POST /api/complete-purchase/activate
│  • POST /api/complete-purchase/activate:                           │
│    - Crea/actualiza usuario en Supabase Auth + tabla users         │
│    - Actualiza pending_purchases (status completed, user_id)      │
│    - Inserta en purchases (user_id, pack_id, ftp_username, etc.)  │
│  • Muestra éxito + credenciales FTP + enlaces a Dashboard/Contenido
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  ACCESO ACTIVO                                                    │
│  • El usuario tiene fila en `purchases` (user_id + pack_id)       │
│  • Landing, Contenido, Dashboard, API download/files lo comprueban │
└──────────────────────────────────────────────────────────────────┘
       │
       ├── /dashboard  → Panel: descarga web, FTP (credenciales), enlaces
       ├── /contenido  → Listado de videos por género, descarga por archivo
       ├── /portal     → Resumen de accesos (contenido, FTP, comunidad, mi cuenta)
       └── /mi-cuenta → Perfil (nombre, email, etc.)
```

---

## 2. Secciones una por una

### 2.1 Landing (`/`)

**Qué es:** Página principal. Diferencia entre **no logueado**, **logueado sin compra** y **logueado con compra**.

**Comportamiento:**
- **Sin sesión:** Banner de oferta, hero con CTA "Comprar", marquee de géneros, stats (videos, géneros, tamaño), "Los 10 videos más populares" (carrusel), "Última descarga" no se muestra, preview de 6 videos, bloque "¿Es Bear Beat para ti?", precios, FAQ, footer (Términos, Privacidad, Reembolsos).
- **Logueado sin compra:** Igual pero navbar con "Iniciar sesión" sustituido por "Mi Panel" / "Mi cuenta"; puede entrar a /contenido pero ahí verá paywall al descargar.
- **Logueado con compra:** Banner "Ya tienes acceso" + botones Descargar y Mi Panel; hero corto con enlaces a /contenido y /dashboard; mismo resto de contenido.

**Datos:**
- `GET /api/videos?pack=enero-2026&statsOnly=1` → pack (totalVideos, genreCount, totalSizeFormatted, totalPurchases) y géneros (preview + marquee).
- `GET /api/videos/popular?pack=enero-2026&limit=10` → Los 10 más descargados (o primeros 10 por artista si no hay descargas).
- Si está logueado: `GET /api/videos/last-downloaded` → última descarga (opcional).
- Acceso: `supabase.auth.getUser()` + `purchases` por user_id.

**Enlaces principales:** /checkout, /contenido, /login, /dashboard, /mi-cuenta, /terminos, /privacidad, /reembolsos.

---

### 2.2 Contenido (`/contenido`)

**Qué es:** Catálogo de videos del pack por género. Quién tiene compra puede descargar; quien no, ve paywall.

**Comportamiento:**
- Carga: `verificarAcceso()` (purchases por user_id) y `GET /api/videos` (sin statsOnly) para listado completo.
- Búsqueda por artista, título, género, key, BPM.
- **Con acceso:** Botón descargar abre `GET /api/download?file=genre/archivo.mp4` (redirect a URL firmada Bunny o descarga local).
- **Sin acceso:** Clic en descargar abre modal de paywall y CTA a /checkout.

**Acceso:** Tener al menos una fila en `purchases` para ese user_id. No se usa columna `status` en `purchases`.

---

### 2.3 Checkout (`/checkout?pack=enero-2026`)

**Qué es:** Página de pago. Un solo paso: elegir método y ir a Stripe.

**Comportamiento:**
- Detecta país (ipapi.co) para sugerir MXN/USD.
- Muestra resumen: Pack Enero 2026, precio (350 MXN o 19 USD), métodos (OXXO, SPEI, Tarjeta, PayPal según país).
- Al elegir método: `POST /api/create-checkout` con `packSlug`, `paymentMethod`, `currency`.
- **create-checkout:** Busca pack en DB (o fallback), crea Stripe Checkout Session con success_url=`/complete-purchase?session_id={CHECKOUT_SESSION_ID}`, cancel_url con pack. Si hay usuario logueado, lo mete en metadata (user_id, customer_email, etc.).
- Redirige a `session.url` (Stripe hosted checkout).

**No crea usuario ni compra:** Solo redirige a Stripe. La compra se registra en el webhook y se activa en /complete-purchase.

---

### 2.4 Webhook Stripe (`POST /api/webhooks/stripe`)

**Qué es:** Llamada que hace Stripe cuando ocurre un evento (en tu caso, `checkout.session.completed`).

**Comportamiento:**
- Verifica firma con `STRIPE_WEBHOOK_SECRET`.
- En `checkout.session.completed`:
  - Inserta en **pending_purchases**: stripe_session_id, pack_id, amount_paid, currency, customer_email, customer_name, customer_phone, payment_status='paid', status='awaiting_completion'.
  - Inserta en **user_events** (payment_success).
  - Opcional: ManyChat (upsert suscriptor + tags).
- **No** inserta en `purchases` ni crea usuario. Eso lo hace /complete-purchase al "activar" la compra.

---

### 2.5 Pago pendiente (`/pago-pendiente?session_id=...`)

**Qué es:** Página de espera para pagos OXXO/SPEI que no confirman al instante.

**Comportamiento:**
- Lee `session_id` de la URL.
- Hace polling (cada 30 s) a `pending_purchases` por ese stripe_session_id.
- Si aparece una fila con status `awaiting_completion`, asume "pago confirmado" y redirige a `/complete-purchase?session_id=...`.
- Botón "Ya pagué" hace la misma comprobación de forma manual.

---

### 2.6 Completar compra (`/complete-purchase?session_id=...`)

**Qué es:** Post-pago: verificar pago, identificar/usar usuario y activar acceso.

**Comportamiento:**
- **1) Cargar datos:**  
  - Si hay usuario logueado, se usa ese user.  
  - `GET /api/verify-payment?session_id=...` devuelve datos de la sesión Stripe (packId, amount, customerEmail, etc.) y opcionalmente userId si el comprador estaba logueado.
- **2) Si ya hay usuario (logueado o en metadata):**  
  - Muestra pantalla de éxito y en segundo plano llama a **activar**.  
  - Activar = `POST /api/complete-purchase/activate` con sessionId y userId.  
  - No pide formulario; va directo a "done" y enlaces a dashboard/contenido.
- **3) Si no hay usuario:**  
  - Muestra formulario: email, nombre, teléfono, contraseña (o "Ya tengo cuenta" → login).  
  - Al enviar: crear usuario en Supabase Auth (o login si ya existe), actualizar/crear en tabla `users`, luego `POST /api/complete-purchase/activate` con sessionId y userId.
- **Activate (API):**
  - Verifica sesión Stripe (payment_status === 'paid').
  - Actualiza **pending_purchases**: user_id, status='completed', customer_email/name/phone, completed_at.
  - Inserta en **purchases**: user_id, pack_id, amount_paid, currency, payment_provider, payment_id, ftp_username, ftp_password (generados o desde Hetzner si está configurado).

Tras esto, el usuario tiene acceso: aparece en `purchases` y todas las rutas que comprueban acceso usan esa tabla.

---

### 2.7 Dashboard (`/dashboard`)

**Qué es:** Panel del cliente con acceso: descarga por web, credenciales FTP, enlaces útiles.

**Comportamiento:**
- Requiere sesión; si no hay, redirige a `/login?redirect=/dashboard`.
- Carga perfil desde `users` (o usa auth) y compras desde `purchases` (con pack).
- Muestra: bienvenida, pestaña "Descarga por web" (enlace a /contenido), pestaña "FTP" (host, usuario, contraseña para FileZilla), enlace a comunidad/soporte.

---

### 2.8 Portal (`/portal`)

**Qué es:** Página de "hub" para el cliente: enlaces rápidos a contenido, FTP, comunidad, mi cuenta.

**Comportamiento:**
- Requiere sesión; si no, redirige a login.
- Muestra 4 bloques: Descargar Videos (/contenido), Descarga FTP (/dashboard), Comunidad VIP (/comunidad), Mi Cuenta (/mi-cuenta).

---

### 2.9 Mi cuenta (`/mi-cuenta`)

**Qué es:** Perfil del usuario (nombre, email, etc.). Requiere sesión.

---

### 2.10 Comunidad (`/comunidad`)

**Qué es:** Página de comunidad VIP (grupo WhatsApp, bonos). Requiere sesión; contenido según tengas o no compra.

---

### 2.11 Login (`/login`) y Registro (`/register`)

**Login:** Supabase Auth (email + contraseña). Redirect opcional (`?redirect=...`) tras iniciar sesión.

**Registro:** Formulario (email, contraseña, nombre, teléfono, país). Verificación de teléfono por SMS (código). Crea usuario en Supabase Auth y en tabla `users` si aplica.

---

### 2.12 Preview (`/preview`)

**Qué es:** Página de demos/preview del pack (videos de ejemplo). No sustituye al catálogo real de /contenido; es más de marketing. CTAs a checkout.

---

### 2.13 Legales

- **Términos** (`/terminos`), **Privacidad** (`/privacidad`), **Reembolsos** (`/reembolsos`), **Cookies** (`/cookies`): Contenido estático y enlaces desde footer.

---

### 2.14 Fix admin (`/fix-admin?token=...`)

**Qué es:** Bypass para dar rol admin a un usuario sin depender de sesión persistente. Requiere `FIX_ADMIN_SECRET` en Render igual al token. Asigna admin al usuario que indiques (ej. test@bearbeat.com) y ofrece enlace a /admin.

---

### 2.15 Admin (`/admin` y subrutas)

**Qué es:** Panel interno. Solo usuarios con rol admin (o tras fix-admin).

**Subsecciones:**
- **admin:** Resumen y enlaces a usuarios, compras, packs, tracking, atribución, chatbot, ManyChat, mensajes, pendientes, ajustes.
- **admin/users:** Lista de usuarios.
- **admin/users/[id]:** Detalle de un usuario.
- **admin/purchases:** Lista de compras.
- **admin/packs:** Packs.
- **admin/pending:** Compras pendientes (pending_purchases con status awaiting_completion).
- **admin/tracking:** Eventos (user_events, etc.).
- **admin/attribution:** Atribución.
- **admin/chatbot:** Chatbot.
- **admin/manychat:** ManyChat.
- **admin/mensajes:** Mensajes.
- **admin/push:** Notificaciones push.
- **admin/settings:** Ajustes.

---

## 3. APIs clave para el embudo

| API | Uso en el embudo |
|-----|-------------------|
| `POST /api/create-checkout` | Crear sesión Stripe desde /checkout. |
| `POST /api/webhooks/stripe` | Recibir pago completado; crear pending_purchase. |
| `GET /api/verify-payment?session_id=` | En /complete-purchase, verificar pago y obtener datos. |
| `POST /api/complete-purchase/activate` | Crear/actualizar usuario, completar pending_purchase, insertar en purchases. |
| `GET /api/videos` | Landing (statsOnly=1) y /contenido (listado completo). |
| `GET /api/videos/popular` | "Los 10 más populares" en landing. |
| `GET /api/videos/last-downloaded` | "Última descarga" en landing (logueado). |
| `GET /api/download?file=` | Descarga de un archivo (requiere compra en purchases). |
| `GET /api/files` | Listado de archivos del pack (requiere compra). |

---

## 4. Tablas que intervienen en el embudo

| Tabla | Rol |
|-------|-----|
| **users** | Perfil (id = auth.uid(), email, name, phone, etc.). |
| **packs** | Productos (id, slug, name, price_mxn, price_usd, status, etc.). |
| **pending_purchases** | Después del webhook: pago recibido, esperando completar datos y activar. Campos: stripe_session_id, pack_id, amount_paid, customer_email, status (awaiting_completion → completed), user_id (cuando se activa). |
| **purchases** | Acceso definitivo. Una fila = un usuario tiene un pack. Usado por /contenido, /dashboard, /api/download, /api/files. No tiene columna `status`. |
| **downloads** | Registro de descargas (user_id, pack_id, file_path, downloaded_at) para "Los más populares" y "Última descarga". |
| **user_events** | Eventos de tracking (payment_success, etc.). |

---

## 5. Flujo resumido en 4 pasos

1. **Visita y decisión:** Landing → clic "Comprar" o "Ver Contenido" (y luego paywall) → Checkout.
2. **Pago:** Checkout → Stripe → Webhook crea pending_purchase (awaiting_completion).
3. **Activación:** Usuario llega a Complete Purchase (redirect de Stripe o desde Pago pendiente) → verify-payment → activate → se crea/vincula usuario y se inserta en purchases.
4. **Uso:** Dashboard, Contenido, Portal, Mi cuenta; descargas vía /api/download y listado vía /api/files, comprobando siempre `purchases` por user_id y pack_id.

Este documento describe exactamente cómo funciona cada sección y el embudo completo de la web en producción.
