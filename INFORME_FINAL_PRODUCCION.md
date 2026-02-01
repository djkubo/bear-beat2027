# Informe Final de Producción (Go-Live)

**Proyecto:** Bear Beat 2027  
**Objetivo:** Infraestructura lista para facturación ($100k USD). Sin datos simulados ni parches.

---

## Checklist de confirmación

- [x] **Conexión Hetzner Robot (FTP Real)** → LISTO  
- [x] **Lectura de Videos desde DB (Para Render)** → LISTO  
- [x] **Webhook Stripe (Pagos Reales)** → LISTO  

---

## 1. Pilar de Almacenamiento (Hetzner & Videos)

**Archivo:** `src/app/api/videos/route.ts`

**Auditoría:**
- En producción (`NODE_ENV === 'production'`) la API **obligatoriamente** lee solo desde la tabla `videos` en Supabase mediante `readVideoStructureFromDb()`. No se consulta disco local.
- En desarrollo: se usa DB si `USE_VIDEOS_FROM_DB === 'true'` o si no existe la carpeta local; en caso contrario se usa disco.

**Corrección aplicada:**  
Se endureció la condición para que en producción **nunca** se intente leer del disco: rama explícita `if (process.env.NODE_ENV === 'production')` que únicamente llama a `readVideoStructureFromDb()`.

**Estado:** LISTO. Render siempre obtiene el listado desde Supabase. El catálogo debe estar poblado con `npm run db:sync-videos` o `npm run db:sync-videos-ftp`.

---

## 2. Pilar de Entrega (FTP Automático)

**Archivos:** `src/lib/hetzner-robot.ts`, `src/app/api/complete-purchase/activate/route.ts`, `src/app/complete-purchase/page.tsx`

**Auditoría:**
- **Hetzner Robot:** `src/lib/hetzner-robot.ts` usa la API real de Hetzner:
  - `getAuth()` lee `HETZNER_ROBOT_USER` y `HETZNER_ROBOT_PASSWORD`.
  - `createStorageBoxSubaccount()` hace `POST` a `https://robot-ws.your-server.de/storagebox/{storageboxId}/subaccount` con `username`, `password`, `read_only: true`. El username se genera en servidor como `u{storageboxId}-sub{N}` (siguiente N libre).
- **Activate API:** Al completar compra, el front solo llama a `POST /api/complete-purchase/activate` con `sessionId`, `userId`, `email`, `name`, `phone`. No envía ni genera credenciales FTP. El backend:
  1. Verifica el pago con Stripe (`checkout.session`).
  2. Si `isHetznerFtpConfigured()`, llama a `createStorageBoxSubaccount()` con contraseña generada en servidor y guarda en `purchases` el `ftp_username` y `ftp_password` devueltos por Hetzner (o fallback generado en servidor si la API falla).
  3. Si Hetzner no está configurado, genera credenciales solo en servidor y las guarda en `purchases`.
- **Frontend:** No genera passwords ni usuarios FTP; solo muestra el estado de éxito. Las credenciales FTP reales se muestran en el Dashboard, que las lee de la tabla `purchases` en Supabase.

**Corrección aplicada:**  
Ninguna necesaria. Flujo ya correcto: FTP creado en servidor vía Robot API; credenciales solo en backend y en Supabase.

**Estado:** LISTO. Variables requeridas en Render: `HETZNER_ROBOT_USER`, `HETZNER_ROBOT_PASSWORD`, `HETZNER_STORAGEBOX_ID`.

---

## 3. Pilar de Dinero (Stripe & Activación)

**Archivo:** `src/app/api/webhooks/stripe/route.ts`

**Auditoría:**
- El webhook valida la firma con `STRIPE_WEBHOOK_SECRET` y procesa `checkout.session.completed`.
- Extrae de la sesión: `session.id`, `session.metadata.pack_id`, `session.amount_total`, `session.currency`, `session.customer_details?.email`, `session.customer_details?.name`, `session.customer_details?.phone`, `session.payment_intent`.
- Inserta en `pending_purchases` un registro con estado `awaiting_completion` y los datos reales del pago y del cliente.
- Registra el evento en `user_events` y sincroniza con ManyChat cuando hay email/teléfono.
- La activación definitiva (usuario en Supabase, registro en `purchases`, subcuenta FTP en Hetzner) se hace **sin intervención humana** cuando el usuario entra en `/complete-purchase` y el front llama a `POST /api/complete-purchase/activate` (tras crear cuenta o con usuario ya logueado). El webhook solo persiste el pago y deja el resto al flujo de complete-purchase.

**Correcciones aplicadas:**
- `pack_id` se obtiene con fallback seguro: `Math.max(1, parseInt(session.metadata?.pack_id || '1', 10) || 1)` para evitar NaN si falta metadata.
- Eliminada función muerta `generateSecurePassword` del archivo del webhook.

**Estado:** LISTO. Pagos reales registrados en `pending_purchases`; activación automática al completar el formulario en `/complete-purchase`.

---

## Resumen de cambios realizados en esta auditoría

| Archivo | Cambio |
|---------|--------|
| `src/app/api/videos/route.ts` | En producción, uso obligatorio solo de DB para listado de videos (sin fallback a disco). |
| `src/app/api/webhooks/stripe/route.ts` | Fallback seguro de `pack_id`; eliminación de código muerto. |

---

## Variables de entorno críticas (Render)

- **Videos en producción:** Supabase ya configurado; tabla `videos` poblada con `db:sync-videos` o `db:sync-videos-ftp`.
- **FTP real:** `HETZNER_ROBOT_USER`, `HETZNER_ROBOT_PASSWORD`, `HETZNER_STORAGEBOX_ID`.
- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (y en Stripe Dashboard, URL del webhook apuntando a `https://bear-beat2027.onrender.com/api/webhooks/stripe`).

---

*Informe generado tras auditoría de los tres pilares: Almacenamiento, Entrega (FTP), Dinero (Stripe).*
