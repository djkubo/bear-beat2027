# Inventario completo – Bear Beat (v1.0)

**Última actualización:** Sincronizado con el código en `src/`.  
**Source of Truth:** El código; este documento describe la realidad actual.

Para reglas de negocio y prohibiciones (hardcode, flujo de producción), ver **REGLAS_PROYECTO.md**.  
Para resumen ejecutivo y flujo de datos, ver **ESTADO_PROYECTO.md**.

---

## 1. Páginas públicas

| Ruta | Descripción | Estado |
|------|-------------|--------|
| `/` | Landing. Hero según acceso (con/sin). Stats dinámicos (useVideoInventory). CTA $350 MXN. Preview de videos por género desde API. | ✅ Funcional |
| `/login` | Inicio de sesión (email + contraseña). Link a forgot-password y register. | ✅ Funcional |
| `/register` | Registro en 2 pasos (datos + verificación SMS). | ✅ Funcional |
| `/forgot-password` | Recuperar contraseña por email. | ✅ Funcional |
| `/reset-password` | Cambiar contraseña con token. | ✅ Funcional |
| `/verify-email` | Instrucciones para verificar email. | ✅ Funcional |
| `/checkout` | Pago. Pack y conteo de videos desde Supabase. Métodos: tarjeta, OXXO, SPEI, PayPal. Precio desde DB. | ✅ Funcional |
| `/complete-purchase` | Post-pago. Verifica sesión Stripe, activa compra, muestra formulario registro/login si hace falta. Credenciales reales y CTA "IR A MIS VIDEOS". | ✅ Funcional |
| `/pago-pendiente` | Ficha OXXO/SPEI; polling hasta confirmación; redirige a complete-purchase. | ✅ Funcional |
| `/contenido` | Explorador de videos. Listado desde `/api/videos`. Búsqueda, géneros, preview, descarga (con acceso). Stats dinámicos. | ✅ Funcional |
| `/dashboard` | Panel de usuario. Compras desde `purchases`, credenciales FTP reales, instrucciones FileZilla, enlace a Contenido y soporte. | ✅ Funcional |
| `/portal` | Hub: Contenido, Dashboard (FTP), Comunidad VIP, Mi cuenta, soporte. | ✅ Funcional |
| `/mi-cuenta` | Perfil: nombre, teléfono, email (solo lectura), avatar. | ✅ Funcional |
| `/comunidad` | Grupo VIP WhatsApp y bonos. | ✅ Funcional |
| `/preview` | Preview de contenido (demo con watermark). | ✅ Funcional |
| `/diagnostico` | Diagnóstico de usuario (auth, perfil, compras). | ✅ Funcional |
| `/terminos` | Términos de servicio. | ✅ Funcional |
| `/privacidad` | Política de privacidad. | ✅ Funcional |
| `/reembolsos` | Política de reembolsos. | ✅ Funcional |
| `/cookies` | Política de cookies. | ✅ Funcional |

---

## 2. Panel de admin

Protegido por layout que verifica rol admin. Rutas bajo `src/app/admin/`.

| Ruta | Descripción | Estado |
|------|-------------|--------|
| `/admin` | Dashboard: métricas (usuarios, ventas, ingresos) vía `get_admin_stats()`. | ✅ Funcional |
| `/admin/users` | Lista de usuarios. | ✅ Funcional |
| `/admin/users/[id]` | Detalle de usuario: perfil, compras, credenciales FTP por compra. | ✅ Funcional |
| `/admin/purchases` | Historial de compras. | ✅ Funcional |
| `/admin/pending` | Compras pendientes de completar. | ✅ Funcional |
| `/admin/packs` | Gestión de packs. | ✅ Funcional |
| `/admin/tracking` | Eventos de usuarios. | ✅ Funcional |
| `/admin/push` | Notificaciones push (stats, envío). | ✅ Funcional |
| `/admin/mensajes` | Mensajes / comunicaciones. | ✅ Funcional |
| `/admin/chatbot` | Configuración del chatbot. | ✅ Funcional |
| `/admin/manychat` | ManyChat. | ✅ Funcional |
| `/admin/attribution` | Atribución. | ✅ Funcional |
| `/admin/settings` | Ajustes del panel. | ✅ Funcional |

`/admin-panel` existe como ruta alternativa (redirección o alias según configuración).

---

## 3. APIs

### Críticas para el flujo de producción

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/create-checkout` | POST | Crea sesión Stripe. Obtiene pack y total de videos desde Supabase. |
| `/api/verify-payment` | GET/POST | Verifica pago Stripe; usa datos de pack y videos desde DB. |
| `/api/videos` | GET | Lista videos (Supabase o disco local en dev). Filtros: pack_id, género, búsqueda. |
| `/api/download` | GET | Descarga de video: redirige a URL firmada Bunny (producción) o sirve desde disco (dev). |
| `/api/demo/[...path]` | GET | Stream de demos (watermark). |
| `/api/thumbnail/[...path]` | GET | Genera/sirve thumbnail (ffmpeg o placeholder). |

### Webhooks y auth

| Endpoint | Descripción |
|----------|-------------|
| `/api/webhooks/stripe` | Webhook Stripe (pagos, suscripciones). |
| `/auth/callback` | Callback OAuth (Supabase). |

### Tracking y conversiones

| Endpoint | Descripción |
|----------|-------------|
| `/api/track-event` | Eventos custom (guardado y/o envío a Meta). |
| `/api/facebook` | Facebook CAPI (eventos servidor). |

### Push, chat y mensajería

| Endpoint | Descripción |
|----------|-------------|
| `/api/push/subscribe` | Suscripción a notificaciones push. |
| `/api/push/send` | Envío de notificación push. |
| `/api/chat` | Chat de soporte (widget). |
| `/api/send-sms` | Envío SMS (Twilio). |
| `/api/send-whatsapp` | Envío WhatsApp. |

### ManyChat

| Endpoint | Descripción |
|----------|-------------|
| `/api/manychat/init` | Init ManyChat. |
| `/api/manychat/webhook` | Webhook ManyChat. |
| `/api/manychat` | Uso general. |

### Admin y utilidades

| Endpoint | Descripción |
|----------|-------------|
| `/api/admin/ftp-pool` | Gestión del pool FTP (admin). |
| `/api/setup-database` | Setup inicial de DB. |
| `/api/verify-phone` | Verificación de teléfono (SMS). |
| `/api/files` | Listado/descarga de archivos según contexto. |

---

## 4. Componentes globales y compartidos

- **Layout principal** (`layout.tsx`): MetaPixel, ManyChat, AttributionTracker, ChatWidget, PushPrompt, Toaster. Sin datos hardcoded de conteo ni precios.
- **Landing** (`page.tsx`): Contenido inline (no usa componentes en `src/components/landing/` en la versión actual). Banner según acceso, navbar, hero, stats (useVideoInventory), preview de videos, géneros, pain points, precio, CTA sticky móvil.
- **Navegación:** `MobileMenu` para menú móvil; enlaces a Contenido, Login, Mi Panel, Portal, Mi cuenta, Comunidad según sesión y acceso.
- **Video:** `ProtectedPlayer`, `VideoCounter` (conteo dinámico cuando aplica). `FileExplorer` en contenido.

---

## 5. Datos dinámicos (resumen)

- **Conteo de videos y stats de pack:** Hook `useVideoInventory()` y APIs que leen de `videos` + `packs` en Supabase. Nada de 178, 3,247 ni totales fijos en código.
- **Precio:** Definido en `packs`; la UI muestra $350 MXN donde corresponde (hero, checkout, CTA).
- **Credenciales FTP:** Generadas y guardadas en `purchases` en complete-purchase; mostradas en dashboard y portal. No generadas en frontend.
- **Compras y acceso:** `purchases` + RLS; detección de acceso en cliente y en APIs.

---

## 6. Flujos principales

1. **Compra nueva (sin cuenta):** Landing → Checkout → Pago (Stripe) → Complete-purchase → Registro/datos → Activación → Dashboard / Mis Videos.
2. **Compra (ya logueado):** Landing → Checkout → Pago → Complete-purchase activa compra y redirige a Dashboard / Mis Videos.
3. **Cliente con acceso:** Dashboard (FTP + enlace Contenido), Portal, Contenido (descarga), Mi cuenta, Comunidad.
4. **Admin:** Login → `/admin` (y subrutas). Métricas, usuarios, compras, packs, pending, tracking, push, mensajes, chatbot, manychat, attribution, settings.

Cualquier programador nuevo puede usar este inventario junto con **ESTADO_PROYECTO.md** y **REGLAS_PROYECTO.md** para entender qué existe hoy y qué no se debe cambiar (evitar hardcode, priorizar flujo de producción).
