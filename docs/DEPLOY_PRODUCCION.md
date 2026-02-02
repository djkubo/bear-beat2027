# Llevar Bear Beat a producción

Guía paso a paso para documentar todo y desplegar a producción (Render).

---

## 1. Documentación disponible

Antes de desplegar, toda la documentación está en `/docs`:

| Documento | Uso |
|-----------|-----|
| [README_DOCS.md](./README_DOCS.md) | Índice de toda la documentación. |
| [EMBUDO_Y_SECCIONES_A_FONDO.md](./EMBUDO_Y_SECCIONES_A_FONDO.md) | Fuente de verdad: rutas, APIs, flujo. |
| [REPORTE_EMBUDO_PRODUCCION.md](./REPORTE_EMBUDO_PRODUCCION.md) | Mapa del embudo, E2E, hallazgos, checklist. |
| [AUDITORIA_PRODUCCION_Y_RUNBOOK.md](./AUDITORIA_PRODUCCION_Y_RUNBOOK.md) | Variables de entorno, runbook, verificación post-deploy. |
| [CHECKLIST_SUPABASE_PRODUCCION.md](./CHECKLIST_SUPABASE_PRODUCCION.md) | Supabase en producción. |

---

## 2. Pre-requisitos

- Código listo en la rama que despliega Render (normalmente `main`).
- Variables de entorno configuradas en Render (ver [AUDITORIA_PRODUCCION_Y_RUNBOOK.md](./AUDITORIA_PRODUCCION_Y_RUNBOOK.md) § 5).
- Stripe: webhook apuntando a `https://TU_DOMINIO/api/webhooks/stripe` con evento `checkout.session.completed`.
- Supabase: proyecto de producción con tablas y RLS según [CHECKLIST_SUPABASE_PRODUCCION.md](./CHECKLIST_SUPABASE_PRODUCCION.md).

---

## 3. Pasos para llevar todo a producción

### 3.1 Verificación local

```bash
# En la raíz del proyecto
npm run test          # type-check
npm run build         # build de producción
npm run start         # probar en local (modo prod)
```

Opcional: `npm run test:e2e` con servidor en `http://127.0.0.1:3000`.

### 3.2 Commit y push

Todos los cambios (código + documentación) se suben a la rama que Render usa para deploy:

```bash
git add -A
git status   # revisar qué se incluye
git commit -m "Producción: auditoría embudo, idempotencia activate, E2E critical-routes, docs deploy"
git push origin main
```

- Si Render está conectado a `main`, el push dispara el deploy automático.
- Si usas otra rama o deploy manual, en Render → servicio → **Deploys** → **Deploy latest commit**.

### 3.3 En Render

1. **Environment:** Comprobar que están todas las variables (NODE_ENV=production, NEXT_PUBLIC_APP_URL, Supabase, Stripe, STRIPE_WEBHOOK_SECRET, Bunny si aplica). **No** configurar FIX_ADMIN_SECRET en producción.
2. **Build command:** `npm run build` (o el que tenga el servicio).
3. **Start command:** `npm start` (o `node scripts/start.js`).
4. Esperar a que el deploy pase a estado **Live**.

---

## 4. Verificación post-despliegue

Comprobar en la URL de producción (ej. `https://bear-beat2027.onrender.com`):

| Comprobación | Cómo |
|--------------|------|
| Landing carga | Abrir `/` y ver H1 + CTA. |
| /fix-admin devuelve 404 | Abrir `/fix-admin` y `/fix-admin?token=xxx` → debe ser 404. |
| Login y dashboard | Login con un usuario → redirect a dashboard o destino. |
| Checkout redirige a Stripe | Ir a `/checkout?pack=enero-2026` → elegir Tarjeta → redirige a Stripe. |
| Headers de seguridad | En DevTools → Network → cualquier respuesta debe incluir X-Frame-Options, X-Content-Type-Options. |

Opcional: ejecutar E2E contra producción (solo los que no requieren Stripe test):

```bash
BASE_URL=https://bear-beat2027.onrender.com npm run test:e2e -- e2e/login-fix-admin.spec.ts
BASE_URL=https://bear-beat2027.onrender.com npm run test:e2e -- e2e/critical-routes.spec.ts
```

---

## 5. Rollback

Si algo falla en producción:

1. **Render** → tu servicio → **Deploys**.
2. Elegir un deploy anterior estable → **Rollback** (o **Redeploy** desde ese commit).
3. Si el fallo es solo por una variable de entorno, corregirla en **Environment** y hacer **Manual Deploy** sin cambiar código.

Detalle en [AUDITORIA_PRODUCCION_Y_RUNBOOK.md](./AUDITORIA_PRODUCCION_Y_RUNBOOK.md) § 6.

---

## 6. Resumen

| Paso | Acción |
|------|--------|
| 1 | Documentación en `/docs` (README_DOCS, EMBUDO, REPORTE, AUDITORIA, DEPLOY_PRODUCCION). |
| 2 | `npm run test` y `npm run build` en local. |
| 3 | `git add -A` → `git commit` → `git push origin main`. |
| 4 | Render despliega automáticamente (o deploy manual). |
| 5 | Verificación post-deploy (landing, /fix-admin 404, login, checkout, headers). |
| 6 | Rollback desde Render si es necesario. |

Con esto, todo queda documentado y el código llevado a producción.
