# Verificación: Render y Supabase

Checklist único para confirmar que **Render** tiene las claves correctas y **Supabase** está bien configurado para producción.

---

## 1. Render – Claves correctas

Las variables de entorno que usa el proyecto están definidas en **`scripts/render-set-env.js`**:

- **REQUIRED_KEYS**: mínimo imprescindible para que la app funcione (login, checkout, webhooks).  
  Son 11: `NODE_ENV`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FIX_ADMIN_SECRET`.  
  PayPal es opcional (no está en REQUIRED_KEYS).

- **PROJECT_RENDER_KEYS**: lista canónica de todas las claves que el proyecto usa.  
  El comando `npm run deploy:env` **solo sube** variables que estén en esta lista (evita claves obsoletas o con typo).

**Qué hacer:**

1. En Render → tu servicio → **Environment**, comprueba que existan las 11 variables de REQUIRED_KEYS (ver tabla en [RENDER_DEPLOY.md](../RENDER_DEPLOY.md)).
2. Para sincronizar desde local: pon en `.env.local` las claves que quieras y ejecuta `npm run deploy:env`. Solo se subirán las que estén en PROJECT_RENDER_KEYS.
3. Si añades una variable nueva al código, añádela también a **PROJECT_RENDER_KEYS** en `scripts/render-set-env.js`.

Detalle de variables obligatorias y opcionales: [RENDER_DEPLOY.md](../RENDER_DEPLOY.md).

---

## 2. Supabase – Todo correcto

### 2.1 Variables en Render que apuntan a Supabase

Deben estar configuradas en Render (o en `.env.local` si usas `deploy:env`):

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto (https://REF.supabase.co) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima (cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (solo API routes; no exponer en cliente) |
| `DATABASE_URL` | Connection string de PostgreSQL (scripts, pooler) |

Si faltan, el login, el dashboard y las APIs que usan Supabase fallan.

### 2.2 Auth (URLs) – Imprescindible para login en producción

En **Supabase Dashboard** → **Authentication** → **URL Configuration**:

| Campo | Valor |
|-------|--------|
| **Site URL** | `https://bear-beat2027.onrender.com` (debe coincidir con `NEXT_PUBLIC_APP_URL` en Render) |
| **Redirect URLs** | `https://bear-beat2027.onrender.com/**` y, si quieres local: `http://localhost:3000/**` |

Si Site URL no coincide con la URL pública de la app, el login en producción puede redirigir mal o pedir login de nuevo.

**Configurar por script:** con `SUPABASE_ACCESS_TOKEN` en `.env.local`, ejecuta `npm run supabase:set-auth-urls` (usa `scripts/supabase-set-auth-urls.js`).

Guía paso a paso: [CHECKLIST_SUPABASE_PRODUCCION.md](CHECKLIST_SUPABASE_PRODUCCION.md).

### 2.3 Base de datos – Tablas y funciones

La app espera estas tablas/funciones. Si falta algo, verás errores del tipo "relation does not exist" o "function does not exist".

**Orden recomendado en SQL Editor** (ejecutar uno por uno; si ya existe, Supabase suele indicar "already exists"):

1. `supabase/SETUP_COMPLETO.sql` – Base: users, packs, genres, videos, purchases, pending_purchases, user_events, push_*, ftp_pool, conversations, messages, RLS, is_admin(), get_admin_stats(), datos iniciales.
2. `supabase/PENDIENTES_SUPABASE.sql` – Tabla **downloads** (historial de descargas).
3. `supabase/migrations/20260130000000_add_purchases_attribution.sql` – UTM y is_ad_traffic en purchases.
4. `supabase/migrations/20260130200001_vector_knowledge_fix.sql` – Tabla **documents** y función **match_documents** (RAG del chat).
5. `supabase/migrations/20260131000000_add_videos_key_bpm.sql` – Columnas key/bpm en videos (si aplica).
6. `supabase/migrations/20260202000000_push_subscriptions_rls.sql` – RLS y columna subscription en push_subscriptions.
7. `supabase/migrations/20260202100000_chat_messages_web.sql` – Tabla **chat_messages** (BearBot web).
8. `supabase/migrations/20260203000000_videos_unique_pack_file.sql` – Unique (pack_id, file_path) en videos.
9. `supabase/migrations/20260203100000_global_announcements.sql` – Tabla **global_announcements** (anuncios en el chat).
10. `supabase/schema_attribution.sql` – Funciones **get_traffic_stats**, **get_top_campaigns** (Admin → Fuentes de tráfico).
11. `supabase/schema_tracking.sql` – Función **get_funnel_stats** (Admin → Tracking / embudo).
12. `supabase/schema_chatbot.sql` – **get_chatbot_stats**, **get_or_create_conversation**, tablas **knowledge_base**, **bot_actions** (Admin → Chatbot / ManyChat).

Listado detallado por funcionalidad: [SUPABASE_CHECKLIST_NADA_FALTA.md](SUPABASE_CHECKLIST_NADA_FALTA.md).

### 2.4 Usuario admin

- Crear usuario en **Authentication** → Users (o registrarse en la app).
- En **SQL Editor**:  
  `UPDATE public.users SET role = 'admin' WHERE email = 'tu@email.com';`
- Opcional: **/fix-admin?token=bearbeat-admin-2027-secreto** (requiere `FIX_ADMIN_SECRET` en Render con ese valor).

---

## 3. Resumen rápido

| Dónde | Qué comprobar |
|-------|----------------|
| **Render** | Las 11 REQUIRED_KEYS existen en Environment; `NEXT_PUBLIC_APP_URL` = `https://bear-beat2027.onrender.com`. |
| **Supabase Auth** | Site URL = misma que `NEXT_PUBLIC_APP_URL`; Redirect URLs incluyen `https://bear-beat2027.onrender.com/**`. |
| **Supabase DB** | SETUP_COMPLETO + PENDIENTES (downloads) + migraciones y schemas en el orden anterior. |

Si todo está correcto, no debería faltar nada en Render ni en Supabase para que la app funcione en producción.
