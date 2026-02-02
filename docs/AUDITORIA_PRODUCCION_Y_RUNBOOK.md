# Auditoría de producción + Checklist + Runbook

**Bear Beat** – Next.js 15, Supabase, Stripe, Bunny CDN, Render.  
Fecha: 2026-02-02.

---

## 1. Resumen ejecutivo

| Aspecto | Estado |
|--------|--------|
| **Estado actual** | ✅ Listo para producción con correcciones aplicadas |
| **fix-admin en producción** | ❌ → ✅ Bloqueado (404 en NODE_ENV=production) |
| **Webhook Stripe** | ✅ Firma verificada + idempotencia (no duplica pending_purchase) |
| **RBAC admin** | ✅ Layout admin verifica rol en server; middleware no expone datos |
| **Redirects 0.0.0.0/localhost** | ✅ No hay; thumbnails usan URLs relativas; NEXT_PUBLIC_APP_URL en Render |
| **Headers seguridad** | ✅ X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| **Diagnóstico** | ✅ En producción solo accesible por rol admin (layout server) |
| **Activate idempotencia** | ✅ Si ya existe purchase (user+pack) devuelve 200; si insert 23505 devuelve 200 con datos existentes |

### Top 10 riesgos (antes → después)

| # | Riesgo | Severidad | Estado |
|---|--------|-----------|--------|
| 1 | /fix-admin accesible en producción con token | Critical | ✅ Bloqueado: 404 en prod |
| 2 | Webhook Stripe sin idempotencia (duplicar compras) | High | ✅ Idempotencia por stripe_session_id |
| 3 | Admin solo protegido en cliente | High | ✅ Layout admin verifica rol server-side |
| 4 | /diagnostico expone role/compras en producción | Medium | ✅ Layout exige admin en prod |
| 5 | Sin headers de seguridad | Medium | ✅ Añadidos en next.config |
| 6 | Filtro status en purchases (tabla sin columna) | Critical | ✅ Ya corregido (quitar .eq('status','completed')) |
| 7 | Redirects a 0.0.0.0 en thumbnails | High | ✅ URLs relativas |
| 8 | Errores TypeScript en build | High | ✅ Corregidos (download, videos/route) |
| 9 | E2E con texto fijo "1,000 videos" | Low | ✅ Acepta conteo dinámico |
| 10 | Rate limit en login/checkout | Low | Pendiente opcional (Render/Cloudflare) |

---

## 2. Matriz de bugs

| ID | Ruta/API | Repro | Expected | Actual | Root cause | Fix | Severidad | Commit/ref |
|----|----------|-------|----------|--------|------------|-----|-----------|------------|
| B1 | /fix-admin | GET /fix-admin?token=secret en producción | 404 o no disponible | Página asignaba admin | Bypass activo en prod | notFound() en NODE_ENV=production + middleware 404 | Critical | (este PR) |
| B2 | /api/webhooks/stripe | Stripe envía 2+ veces checkout.session.completed | Una sola fila en pending_purchases | Duplicados posibles | Sin idempotencia | Select por stripe_session_id; si existe return received | High | (este PR) |
| B3 | /diagnostico | Usuario normal en producción | No ver datos internos | Ve role, compras, ids | Página pública | Layout server: en prod solo admin | Medium | (este PR) |
| B4 | /api/files | Usuario con compra no podía listar/descargar | 200 + datos | 403 | .eq('status','completed') en tabla sin status | Quitar filtro status en purchases | Critical | (ya aplicado) |
| B5 | build | npm run build en Render | Build OK | Type error download route | .then().catch() en PromiseLike | try/await insert downloads | High | (ya aplicado) |
| B6 | build | npm run build | Build OK | Type error videos/route PreviewRow | previewRows puede ser null; genres es array | NonNullable + [number]; genreObj = array[0] \|\| object | High | (ya aplicado) |
| B7 | /api/complete-purchase/activate | Recarga /complete-purchase o activate repetido | 200 sin duplicar purchase | 500 (unique violation) | Insert duplicado user_id+pack_id | Idempotencia: si existe purchase user+pack devolver 200; si insert 23505 devolver 200 con datos existentes | High | (este PR) |

---

## 3. Cambios implementados

- **fix-admin:** En producción (NODE_ENV=production) la página llama a `notFound()`. El middleware devuelve 404 para `/fix-admin` en producción por si se cachea.
- **Webhook Stripe:** Antes de insertar en `pending_purchases` se comprueba si ya existe una fila con `stripe_session_id = session.id`; si existe se responde `{ received: true }` sin insertar.
- **Diagnóstico:** Layout en `src/app/diagnostico/layout.tsx`: en producción exige usuario logueado y `role === 'admin'`; si no, redirect a login o `/`.
- **Headers de seguridad:** En `next.config.mjs`: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **.env.example:** Comentario de que FIX_ADMIN_SECRET no debe usarse en producción; /fix-admin devuelve 404 en prod.
- **E2E:** purchase-flow acepta H1 dinámico (videos HD / BEAR BEAT). login-fix-admin: en producción espera 404 para /fix-admin?token=.... **critical-routes:** nuevo spec con rutas públicas (landing, contenido, checkout, complete-purchase, login, register, términos, privacidad, preview), portal/dashboard sin sesión → login, APIs /api/files y /api/download sin auth → 401, verify-payment sin session_id → 400.
- **Activate idempotencia:** En `src/app/api/complete-purchase/activate/route.ts`: antes de insertar en `purchases` se comprueba si ya existe fila para `user_id + pack_id`; si existe se devuelve 200 con ftp_username/ftp_password. Si el insert falla por unique violation (código 23505) se hace select de la fila existente y se devuelve 200 con los mismos datos. Así, recargar /complete-purchase o llamar activate varias veces no duplica purchases ni devuelve 500.

### Estructura espejo y protección de demos

- **Espejo de carpetas del servidor:** La web refleja la estructura de carpetas del servidor (FTP/Hetzner). El sync FTP (`/api/admin/sync-videos-ftp`) actualiza la tabla `videos` y los géneros en la DB; la API `/api/videos` (con o sin `statsOnly=1`) devuelve todos los géneros/carpetas con conteos y videos. En el home, la sección "Contenido del pack" muestra todas las carpetas (géneros) con el texto "Estructura idéntica al servidor". Los demos se pueden ver en el home y en `/contenido`.
- **Demos sin descarga ni clic derecho:** En todos los reproductores de demo (home modal, `/contenido`, `/preview`): `onContextMenu` con `preventDefault` + `stopPropagation`, `controlsList="nodownload nofullscreen noremoteplayback"`, `disablePictureInPicture`, `disableRemotePlayback`, `draggable={false}`, `onDragStart` preventDefault y `select-none` en el contenedor. Los usuarios con acceso siguen pudiendo descargar desde el botón explícito "Descargar".

---

## 4. Pruebas

### Unit tests

- **Script `npm run test`:** Ejecuta `type-check` + `lint` (suite mínima sin añadir Jest/Vitest).
- Unit tests con Vitest/Jest: opcional; documentado como mejora.

### Playwright E2E

| Spec | Qué cubre |
|------|-----------|
| `e2e/purchase-flow.spec.ts` | Landing → CTA → checkout → Stripe → complete-purchase → contenido; y variante solo hasta Stripe. |
| `e2e/login-fix-admin.spec.ts` | Login con redirect; fix-admin con token (en prod 404); login + /admin. |
| `e2e/critical-routes.spec.ts` | Rutas públicas (landing, contenido, checkout, complete-purchase, login, register, términos, privacidad, preview); portal/dashboard sin sesión → login; APIs /api/files y /api/download sin auth → 401; verify-payment sin session_id → 400. |

**Cómo ejecutar:**

```bash
# Local (servidor en http://127.0.0.1:3000)
npm run test:e2e

# Solo purchase flow
npm run test:e2e -- e2e/purchase-flow.spec.ts

# Contra producción
BASE_URL=https://bear-beat2027.onrender.com npm run test:e2e -- e2e/login-fix-admin.spec.ts
```

**Nota:** El flujo de compra completo (Stripe real) requiere Stripe en modo test y servidor local; contra producción solo se suelen ejecutar login/fix-admin y comprobación de landing.

---

## 5. Checklist de producción

### Variables de entorno (Render)

Sin valores secretos; solo nombres y propósito:

| Variable | Obligatorio | Descripción |
|----------|-------------|-------------|
| NODE_ENV | Sí | `production` |
| NEXT_PUBLIC_APP_URL | Sí | URL pública (ej. https://bear-beat2027.onrender.com) |
| NEXT_PUBLIC_SUPABASE_URL | Sí | URL proyecto Supabase |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Sí | Anon key |
| SUPABASE_SERVICE_ROLE_KEY | Sí | Service role (backend y webhook) |
| STRIPE_SECRET_KEY | Sí | Clave secreta Stripe |
| STRIPE_WEBHOOK_SECRET | Sí | Secreto del webhook (whsec_...) |
| BUNNY_CDN_URL, BUNNY_TOKEN_KEY (y opc. BUNNY_*) | Para descargas | CDN Bunny |
| FIX_ADMIN_SECRET | No en prod | No configurar en producción; /fix-admin debe devolver 404 |

Resto según necesidad: ManyChat, Twilio, Resend, Meta Pixel, VAPID (push), etc. Ver `.env.example`.

### Config Render / hosting

- **Build:** `npm run build` (o build command por defecto).
- **Start:** `npm run start` (node scripts/start.js con PORT).
- **Health check:** Opcional: GET `/` o `/contenido`; no usar `/diagnostico` como health público.
- **Stripe webhook:** URL `https://bear-beat2027.onrender.com/api/webhooks/stripe`, evento `checkout.session.completed`.

### Monitoreo y alertas

- Render: revisar logs y estado del servicio.
- Stripe Dashboard: webhooks entregados y fallos.
- Opcional: Sentry (o similar) para frontend/backend; logs estructurados con request_id.

### Backup y rollback

- **Supabase:** Backups según plan.
- **Rollback:** En Render, redeploy del deploy anterior desde el dashboard.
- **Código:** Tag/commit estable antes de cada release.

---

## 6. Runbook: desplegar, variables, monitoreo, rollback

### Desplegar

1. Código en `main` (o rama configurada en Render).
2. Render hace build + deploy automático al push (o lanzar deploy manual).
3. Comprobar que el deploy termina en “Live” y que la web carga.

### Variables

1. Render → servicio → **Environment**.
2. Asegurar todas las de la tabla anterior (sobre todo NEXT_PUBLIC_APP_URL, Supabase, Stripe, webhook).
3. **No** poner FIX_ADMIN_SECRET en producción.
4. Tras cambiar env, Render redeploya; esperar a que termine.

### Monitoreo

1. **Render:** Logs en tiempo real; alertas de caída del servicio.
2. **Stripe:** Developers → Webhooks → ver entregas y errores.
3. **Supabase:** Dashboard → Logs y uso.
4. **Usuario:** Probar flujo: landing → checkout → pago test → complete-purchase → contenido → descarga.

### Rollback

1. Render → servicio → **Deploys**.
2. Elegir un deploy anterior estable → **Rollback** (o redeplegar desde un commit anterior).
3. Si el problema es solo de variables, corregir env y redeploy sin rollback.

### Verificación post-despliegue

- [ ] `https://bear-beat2027.onrender.com` carga.
- [ ] `https://bear-beat2027.onrender.com/fix-admin` o `.../fix-admin?token=...` devuelve **404**.
- [ ] Login y acceso a /dashboard y /contenido funcionan.
- [ ] Checkout redirige a Stripe; tras pago test se llega a complete-purchase y se activa acceso.
- [ ] Headers: respuesta de cualquier ruta incluye X-Frame-Options, X-Content-Type-Options.

---

## 7. Pendientes opcionales

1. **Rate limit:** Añadir límite de solicitudes para login, register, forgot-password, create-checkout (p. ej. en Render/Cloudflare o middleware).
2. **Unit tests:** Añadir Vitest (o Jest) y tests para utils críticos (formateo, validación, admin-bypass en entorno no prod).
3. **Sentry:** Configurar para capturar errores frontend y API.
4. **Lighthouse:** Revisar LCP/CLS/INP en móvil en landing y checkout; optimizar imágenes y caché si hace falta.
5. **CSP:** Si se requiere política de contenido estricta, añadir Content-Security-Policy en headers (probando bien para no romper Stripe/scripts).

---

## 8. Verificación final

Antes de dar por cerrada la auditoría:

- [ ] `npm run lint` OK.
- [ ] `npm run type-check` OK.
- [ ] `npm run build` OK.
- [ ] `npm run start` y probar rutas críticas en local (modo producción).
- [ ] `npm run test:e2e` (al menos login-fix-admin y, si hay Stripe test, purchase-flow).
- [ ] En producción: /fix-admin devuelve 404.
- [ ] No hay redirects a 0.0.0.0 ni localhost en flujos de pago/thumbnails.
- [ ] Webhook Stripe: firma válida y idempotencia comprobada (reenvío de evento no duplica fila).
