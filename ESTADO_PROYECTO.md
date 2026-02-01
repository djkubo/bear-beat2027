# Estado del proyecto – Bear Beat (v1.0)

**Última actualización:** Sincronizado con el código en `src/`.  
**Source of Truth:** El código; este documento describe la realidad actual.

---

## Resumen ejecutivo

Plataforma de **Video Remixes para DJs**: pago único por pack ($350 MXN), acceso permanente, descarga por web (Bunny) o FTP. Flujo sin fricción: **Pago primero → Datos después**. Sin números ni precios hardcoded: todo sale de Supabase.

---

## Datos dinámicos (cero hardcode)

- **Conteo de videos:** Hook `useVideoInventory()` (`src/lib/hooks/useVideoInventory.ts`) consulta `videos` en Supabase por pack `enero-2026`: `count` y suma de `file_size` para GB. Si agregas o borras filas en `videos`, la landing, checkout y contenido muestran el número actual al recargar.
- **APIs:** `/api/verify-payment` y `/api/create-checkout` obtienen el pack desde Supabase y el total de videos con `supabase.from('videos').select('*', { count: 'exact', head: true }).eq('pack_id', packId)`.
- **Precio:** Definido en tabla `packs`; la UI muestra $350 MXN donde corresponde (hero, checkout, CTA). No hay 178 ni 3,000 fijos en el código.

---

## Flujo de producción (frictionless)

1. Usuario entra a la **landing** (`/`). Ve inventario en tiempo real (count, géneros, GB) y precio $350 MXN.
2. Clic en comprar → **Checkout** (`/checkout`). Resumen con conteo dinámico de videos; elige OXXO, SPEI, tarjeta o PayPal.
3. Paga en Stripe → redirección a **Complete-purchase** (`/complete-purchase?session_id=...`).
4. Si ya está logueado: se activa la compra y se redirige a **Mis Videos** (dashboard). Si no: se pide email, nombre, teléfono y contraseña (o solo contraseña si el email ya existe); al enviar se activa y se muestran sus datos de acceso.
5. **Dashboard** (`/dashboard`): compras reales desde `purchases`, credenciales FTP reales (generadas en complete-purchase), enlaces a Contenido, Portal, Mi cuenta.
6. **Contenido** (`/contenido`): listado de videos desde `/api/videos` (Supabase o disco local en dev). Descarga por archivo: `/api/download` (Bunny en producción si está configurado, si no disco local).

No se pide registro antes de pagar; el registro/login ocurre después del pago en complete-purchase.

---

## Panel de cliente (funcional)

- **`/dashboard`:** Bienvenida con nombre del usuario (Supabase), listado de compras con nombre del pack, credenciales FTP (usuario/contraseña por compra), instrucciones FileZilla, enlace a Contenido y soporte.
- **`/portal`:** Hub con accesos rápidos a Contenido, Dashboard (FTP), Comunidad VIP, Mi cuenta; guía breve y soporte.
- **`/mi-cuenta`:** Ver y editar nombre, teléfono; email solo lectura; avatar con iniciales. Datos en `users` (Supabase).
- **`/comunidad`:** Grupo VIP WhatsApp y listado de bonos (estático por ahora).
- **`/contenido`:** Explorador de videos por género, búsqueda, preview y descarga (con acceso). Inventario y stats desde API/DB.

Navegación: enlaces a Mi Panel, Portal, Mi cuenta, Comunidad desde header y menú móvil cuando el usuario tiene acceso o está logueado.

---

## Panel de admin (funcional)

- **`/admin`:** Dashboard con métricas (usuarios, ventas, ingresos) vía `get_admin_stats()` y RLS.
- **`/admin/users`** y **`/admin/users/[id]`:** Lista y detalle de usuarios, compras, claves FTP.
- **`/admin/purchases`:** Historial de compras.
- **`/admin/packs`:** Gestión de packs.
- **`/admin/pending`:** Compras pendientes de completar (pending_purchases).
- **`/admin/tracking`:** Eventos de usuarios.
- **`/admin/push`:** Notificaciones push.
- **`/admin/mensajes`,** **`/admin/chatbot`,** **`/admin/manychat`,** **`/admin/attribution`,** **`/admin/settings`:** Según corresponda.

Protección por rol: layout de admin verifica usuario admin antes de mostrar rutas `/admin/*`.

---

## Base de datos (Supabase)

- **Schema único:** `supabase/SETUP_COMPLETO.sql` (tablas, RLS, funciones, seeds).
- **Tablas principales:** `users`, `packs`, `genres`, `videos`, `purchases`, `pending_purchases`, `user_events`, `push_subscriptions`, `ftp_pool`, `conversations`, `messages`, etc.
- **Funciones:** `is_admin()`, `get_admin_stats()` (para métricas del admin).
- **Catálogo de videos:** Se llena con `npm run db:sync-videos` (carpeta local) o `npm run db:sync-videos-ftp` (FTP Hetzner). La web muestra lo que hay en la tabla `videos`.

---

## Descargas

- **Web:** `/api/download` redirige a URL firmada de Bunny si están configurados `BUNNY_CDN_URL` y `BUNNY_TOKEN_KEY`; si no, sirve desde disco local (`VIDEOS_PATH`).
- **FTP:** Credenciales por compra (`ftp_username`, `ftp_password` en `purchases`), generadas en complete-purchase. El usuario las ve en Dashboard y las usa en FileZilla.

---

## Tracking y conversiones

- Eventos en `user_events` y Meta Pixel (PageView, InitiateCheckout, AddPaymentInfo, etc.).
- **Purchase:** Se dispara en complete-purchase al activar la compra, con **valor dinámico** (monto real) vía `trackPaymentSuccess` → `fbTrackPurchase`. Sin montos fijos en el evento.

---

## Cómo usar el proyecto hoy

1. Variables de entorno en `.env.local` (ver `.env.example` y `CHECKLIST_LANZAMIENTO.md`).
2. Aplicar `supabase/SETUP_COMPLETO.sql` en el proyecto Supabase.
3. Poblar `videos`: `npm run db:sync-videos` o `npm run db:sync-videos-ftp` (con FTP configurado).
4. En producción: configurar Bunny para descargas web; Stripe (live) y webhook; dominio y `NEXT_PUBLIC_APP_URL`.

Un programador nuevo puede apoyarse en `INVENTARIO_COMPLETO_WEB.md` para el detalle de rutas y APIs, y en `REGLAS_PROYECTO.md` para no reintroducir hardcodes ni romper el flujo de producción.
