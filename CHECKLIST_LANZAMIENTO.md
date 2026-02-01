# Checklist de lanzamiento – Bear Beat

Objetivo: plataforma lista para tráfico real y facturación masiva. Nivel: “que un niño pueda comprar”.

---

## 1. Variables de entorno EXACTAS (Render / Vercel)

### Obligatorias en TODOS los entornos

| Variable | Test (desarrollo / staging) | Live (producción) |
|----------|-----------------------------|-------------------|
| `NODE_ENV` | `development` (local) / `production` (Render) | `production` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` (local) / `https://tu-app.onrender.com` (staging) | `https://bearbeat.mx` (o tu dominio) |
| `NEXT_PUBLIC_SUPABASE_URL` | Mismo proyecto Supabase (dev) | Mismo o proyecto prod |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key del proyecto | Anon key del proyecto |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (nunca en cliente) | Service role key |
| `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | `pk_test_...` | `pk_live_...` |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (endpoint de test) | `whsec_...` (endpoint de live) |

### Stripe: Test vs Live

- **Test:** Usar claves `pk_test_` y `sk_test_`. Webhook con URL de staging + `whsec_` de ese endpoint.
- **Live:** Usar claves `pk_live_` y `sk_live_`. Webhook con URL de producción (ej. `https://bearbeat.mx/api/webhooks/stripe`) + su `whsec_`.

### Meta / Facebook (Pixel + CAPI)

| Variable | Test | Live |
|---------|------|------|
| `NEXT_PUBLIC_META_PIXEL_ID` | ID del Pixel (mismo en test/live) | ID del Pixel de producción |
| `FACEBOOK_CAPI_ACCESS_TOKEN` | Token CAPI (puede ser el mismo) | Token CAPI con permisos en la app de prod |

**Pixel Purchase:** El evento `Purchase` se dispara con **valor dinámico** desde `complete-purchase` vía `trackPaymentSuccess` → `fbTrackPurchase({ value: amount, currency })`. El `amount` es el monto real pagado (ej. 350 MXN o 19 USD), no un número fijo.

### Descargas web (Bunny) – producción

| Variable | Test | Live |
|---------|------|------|
| `BUNNY_CDN_URL` | Opcional | URL del Pull Zone (ej. `https://bear-beat.b-cdn.net`) |
| `BUNNY_TOKEN_KEY` | Opcional | Clave para URLs firmadas (Token Auth en Bunny) |
| `BUNNY_PACK_PATH_PREFIX` | Opcional | `packs/enero-2026` |

### Opcionales (según uso)

- `DATABASE_URL` – Para scripts (`db:setup`, `db:sync-videos`, `db:sync-videos-ftp`). Mismo en test/live si usas un solo proyecto Supabase.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` – Push.
- `NEXT_PUBLIC_MANYCHAT_PAGE_ID` / `MANYCHAT_API_KEY` – ManyChat.
- `FTP_HOST` / `FTP_USER` / `FTP_PASSWORD` (o `HETZNER_FTP_*`) – Solo para `npm run db:sync-videos-ftp`.
- `RENDER_API_KEY` / `RENDER_SERVICE_ID` – Solo para `npm run deploy:env`.

---

## 2. Facebook Pixel – evento Purchase con valor real

- **Dónde se dispara:** Al activar la compra en `/complete-purchase` (usuario nuevo o ya logueado).
- **Función:** `trackPaymentSuccess(...)` en `src/lib/tracking.ts` llama a `fbTrackPurchase({ value: amount, currency, ... })`.
- **Valor:** `amount` = monto real de la compra (Stripe / verify-payment). No hay 178 ni 350 fijos en el evento.
- **Qué revisar en Meta Events Manager:** Evento `Purchase` con parámetros `value` y `currency` correctos por transacción.

---

## 3. Verificaciones pre-lanzamiento

- [ ] En Render/Vercel: todas las variables de la tabla obligatoria configuradas.
- [ ] Stripe en **Live** con `pk_live_` y `sk_live_`, y webhook apuntando a tu dominio de producción.
- [ ] Supabase: `SETUP_COMPLETO.sql` aplicado; tabla `videos` con datos (sync desde FTP o local).
- [ ] Bunny (si usas descargas web): archivos en Storage con `BUNNY_PACK_PATH_PREFIX`; Token Auth activado en Pull Zone.
- [ ] Dominio: `NEXT_PUBLIC_APP_URL` = URL final (ej. `https://bearbeat.mx`).
- [ ] Prueba de compra de extremo a extremo en **test** (Stripe test) y, antes de tráfico real, una compra **live** de prueba y reembolso.

---

## 4. UX ya aplicada en código

- **Inventario dinámico:** Conteo de videos desde Supabase (`useVideoInventory`); sin 178/3,000 fijos en landing, checkout ni contenido.
- **Lenguaje humano:** "Tus claves", "Tu cuenta", "Mis Videos", "Tus claves FTP"; mensajes de error con solución (ej. "Tu tarjeta no pasó, intenta con OXXO").
- **Precio visible:** $350 MXN en hero, checkout y CTA sticky móvil.
- **Sticky CTA móvil:** Barra fija inferior en landing con "Comprar ahora · $350 MXN" (solo sin acceso).
- **Complete-purchase:** Errores amables + enlace a checkout para reintentar con OXXO/SPEI; Pixel Purchase con valor real.

Cuando todo lo anterior esté marcado y una compra de prueba en live funcione de punta a punta, la web está lista para lanzar tráfico real.
