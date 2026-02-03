# Donde ver los logs después del tráfico (debug mañana)

Cuando envías tráfico de noche, al día siguiente puedes revisar todo aquí.

---

## URL desde ManyChat (broadcasts / flujos)

Usa este formato para que quede atribuido a ManyChat y al usuario:

```
https://bear-beat2027.onrender.com/?mc_id={{user_id}}&fname={{first_name}}&utm_source=manychat&utm_medium=broadcast
```

- **mc_id** y **fname** se guardan en cookies (`bb_mc_id`, `bb_user_name`); el middleware redirige a la misma página **sin** esos params pero **conservando** `utm_source` y `utm_medium`.
- Todos los eventos llevan `utm_source=manychat`, `utm_medium=broadcast` y en `event_data` el `mc_id` (para cruzar con ManyChat).
- En Admin → Atribución verás fuente **manychat** y medio **broadcast**.

---

## 1. **Supabase → `user_events`** (todo el recorrido)

Cada página, clic en CTA, inicio de checkout, método de pago, etc. se guarda en **Supabase → Table Editor → `user_events`**.

- **Ordenar por** `created_at` DESC para ver lo último.
- Columnas útiles: `event_type`, `event_name`, `session_id`, `user_id`, `page_url`, `utm_source`, `utm_medium`, `utm_campaign`, `ip_address`, `event_data` (JSON con atribución, referrer, etc.).
- Errores de JavaScript del cliente: `event_type = 'client_error'` o `'client_promise_rejection'` (mensaje y stack en `event_data`).

---

## 2. **Admin → Atribución** (fuentes y conversiones)

**URL:** `https://tu-dominio.com/admin/attribution` (entra como admin).

- Visitas, conversiones e ingresos por **utm_source** y **utm_medium**.
- Top campañas por **utm_campaign**.
- Requiere que en Supabase estén creadas las funciones `get_traffic_stats` y `get_top_campaigns` (script `supabase/schema_attribution.sql`).

---

## 3. **Render → Logs** (servidor)

**Dashboard Render → tu servicio → pestaña Logs.**

- Errores de API (activate, download, stripe, etc.).
- Mensajes `[activate] FTP real creado` o `FTP compartido asignado` para ver que el FTP se entregó bien.
- Cualquier `console.log` / `console.error` del backend.

---

## 4. **Stripe Dashboard** (pagos)

**Stripe → Payments / Checkout sessions.**

- Pagos completados, fallidos, reembolsos.
- Metadata (pack_id, utm_source, etc.) en cada pago si la envías desde checkout.

---

## 5. **Meta Events Manager** (si usas Pixel/CAPI)

Eventos del Pixel y de la CAPI (PageView, ViewContent, AddToCart, InitiateCheckout, Purchase, etc.) para cruzar con Supabase y Stripe.

---

## Resumen

| Qué quieres ver        | Dónde                          |
|------------------------|--------------------------------|
| Recorrido y CTAs       | Supabase `user_events`        |
| Fuente (Facebook, etc.)| Admin → Atribución + `user_events.utm_*` |
| Errores en navegador   | `user_events` (event_type client_error) |
| Errores en servidor    | Render → Logs                  |
| Pagos                  | Stripe Dashboard              |
| FTP entregado          | Render Logs + `purchases` (ftp_username) |

Todo el rastreo (eventos + UTM + click IDs) queda en `user_events`; las columnas `utm_source`, `utm_medium`, `utm_campaign` se rellenan para que Atribución y las funciones SQL funcionen.
