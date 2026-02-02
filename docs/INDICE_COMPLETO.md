# Índice completo – Bear Beat 2027

Documentación maestra: todo lo que hay en el proyecto, dónde está y cómo usarlo.

---

## 1. Documentación principal

| Documento | Descripción |
|-----------|-------------|
| [DOCUMENTACION_COMPLETA.md](../DOCUMENTACION_COMPLETA.md) | **Referencia detallada:** secciones, botones, textos, APIs, BD, variables, flujos, cambios recientes. |
| [README.md](../README.md) | Resumen del proyecto, stack, instalación, estructura, deploy. |
| [docs/README_DOCS.md](./README_DOCS.md) | Índice de la carpeta docs (embudo, producción, infra, pagos, contenido). |

---

## 2. Rutas y páginas

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `src/app/page.tsx` | Landing (hero, stats, géneros, CTAs). |
| `/login` | `src/app/login/page.tsx` | Login email/contraseña. |
| `/register` | `src/app/register/page.tsx` | Registro (opcional verificación teléfono). |
| `/checkout` | `src/app/checkout/page.tsx` | Checkout (Stripe/PayPal, OXXO, SPEI, tarjeta). |
| `/complete-purchase` | `src/app/complete-purchase/page.tsx` | Post-pago: datos, activación, 3 vías (Web, Drive, FTP), guía paso a paso. |
| `/dashboard` | `src/app/dashboard/page.tsx` | Panel usuario: 3 vías (Web, Drive, FTP), guía paso a paso, actividad. |
| `/contenido` | `src/app/contenido/page.tsx` | Biblioteca de videos (géneros, búsqueda, descarga, ZIP). |
| `/mi-cuenta` | `src/app/mi-cuenta/page.tsx` | Editar perfil. |
| `/admin` | `src/app/admin/page.tsx` | Panel admin (KPIs, Fuentes de Tráfico, sync FTP, últimas compras). |
| `/forgot-password`, `/reset-password`, `/verify-email` | `src/app/forgot-password/`, etc. | Recuperar contraseña, reset, verificación email. |
| `/terminos`, `/privacidad`, `/reembolsos`, `/cookies` | `src/app/terminos/`, etc. | Páginas legales. |

---

## 3. APIs

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/videos` | Listado géneros y videos (Supabase). |
| GET | `/api/download?file=...&stream=true` | 307 redirect a URL firmada Bunny CDN (Token Auth); sin fs/fetch en servidor. |
| GET | `/api/demo-url?path=...` | Redirect a CDN firmado o proxy `/api/demo/...`. |
| GET | `/api/demo/[...path]` | Streaming demo (disco o FTP). |
| GET | `/api/cdn-base` | URL base CDN Bunny (para frontend). |
| POST | `/api/create-checkout` | Crea sesión Stripe Checkout. |
| POST | `/api/create-payment-intent` | Crea PaymentIntent (tarjeta). |
| POST | `/api/create-paypal-order` | Crea orden PayPal. |
| GET | `/api/verify-payment` | Verifica pago (session_id o payment_intent). |
| POST | `/api/complete-purchase/activate` | Activa compra (FTP, purchases). |
| POST | `/api/webhooks/stripe` | Webhook Stripe (pending_purchases, usuario Auth con email_confirm). |
| POST | `/api/auth/create-user` | Crea usuario Auth con email_confirm: true. |
| POST | `/api/claim-account` | Reclamar cuenta (password + email_confirm). |
| POST | `/api/chat` | Chat web BearBot: RAG (match_documents) + GPT + guardado en chat_messages. Input: { message, history?, sessionId? }. |
| POST | `/api/chat/webhook` | RAG chatbot ManyChat (External Request). |
| POST | `/api/admin/send-push` | Enviar notificaciones push a todos (solo admin). GET: estadísticas suscripciones. |
| POST | `/api/admin/analyze-chat` | Reporte IA sobre conversaciones recientes (solo admin). |
| POST | `/api/manychat/webhook` | Webhook ManyChat (mensajes entrantes). |
| POST | `/api/track-event` | Tracking eventos. |
| POST | `/api/admin/sync-videos-ftp` | Sincroniza catálogo desde FTP a tabla videos. |
| GET | `/api/thumbnail-cdn`, `/api/thumbnail/[...path]`, `/api/thumbnail-from-video` | Miniaturas. |
| POST | `/api/push/subscribe` | Guardar suscripción push (subscription jsonb). |
| GET | `/auth/callback` | Callback OAuth (Google). |

---

## 4. Base de datos (Supabase)

| Tabla / RPC | Descripción |
|-------------|-------------|
| users | Perfil, role, UTM. |
| packs | Packs de video (slug, precios, etc.). |
| genres | Géneros musicales. |
| videos | Catálogo (title, artist, path, key, bpm, etc.). |
| purchases | Compras (user_id, pack_id, ftp_*, utm_*, traffic_source). |
| pending_purchases | Compras pendientes (Stripe session). |
| documents | Base conocimientos RAG (content, metadata, embedding vector 3072). |
| chat_messages | Mensajes del chat web BearBot (session_id, user_id, role, content, is_bot). |
| push_subscriptions | Suscripciones push (endpoint, keys, subscription jsonb, user_id); RLS: insert usuario, select admin. |
| match_documents(query_embedding, match_threshold, match_count) | RPC búsqueda por similitud (coseno). |
| get_admin_stats() | RPC KPIs admin. |

**Migraciones:** `supabase/migrations/` — 20260130000000_add_purchases_attribution.sql, 20260130200001_vector_knowledge_fix.sql, 20260202000000_push_subscriptions_rls.sql, 20260202100000_chat_messages_web.sql. Ver [DESPLIEGUE_Y_CAMBIOS_RECIENTES.md](./DESPLIEGUE_Y_CAMBIOS_RECIENTES.md).

---

## 5. Variables de entorno

| Variable | Uso |
|----------|-----|
| NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase cliente. |
| SUPABASE_SERVICE_ROLE_KEY | Admin, RAG, sync-knowledge. |
| NEXT_PUBLIC_APP_URL | Redirects, demo-url, auth callback (evitar 0.0.0.0). |
| STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLIC_KEY, STRIPE_WEBHOOK_SECRET | Stripe. |
| PAYPAL_*, NEXT_PUBLIC_PAYPAL_* | PayPal. |
| OPENAI_API_KEY, OPENAI_CHAT_MODEL | RAG (chatbot, sync-knowledge). |
| FTP_HOST, FTP_USER, FTP_PASSWORD (o HETZNER_*) | Sync FTP, demo proxy. |
| BUNNY_PULL_ZONE, BUNNY_SECURITY_KEY | Descargas CDN (Token Auth, 307 redirect). |
| BUNNY_CDN_URL, BUNNY_TOKEN_KEY | Legacy descargas CDN. |
| NEXT_PUBLIC_FB_PIXEL_ID, FB_ACCESS_TOKEN (o FACEBOOK_CAPI_ACCESS_TOKEN) | Meta Pixel + CAPI. |
| NEXT_PUBLIC_MANYCHAT_PAGE_ID | Widget ManyChat. |
| ADMIN_EMAIL_WHITELIST | Lista blanca admin (emails separados por coma). |

Ver `.env.example` y DOCUMENTACION_COMPLETA.md §16.

---

## 6. Scripts

| Script | Uso |
|--------|-----|
| npm run dev | Desarrollo local. |
| npm run build | Build producción. |
| npm run start | Servidor producción (Render: 0.0.0.0, PORT). |
| npm run db:setup | Ejecuta SETUP_COMPLETO.sql. |
| npm run db:sync-videos-ftp | Sincroniza FTP → tabla videos. |
| npx tsx scripts/feed-brain.ts | Alimenta RAG: catálogo (videos) + reglas (precios, FTP, Drive) → documents. |
| npx tsx scripts/sync-knowledge.ts | Ingesta RAG: páginas estáticas + catálogo + reglas → documents. |
| npm run deploy:env | Sube variables .env.local a Render. |
| node scripts/run-supabase-sql.js supabase/migrations/<archivo>.sql | Ejecutar migración con DATABASE_URL. |

---

## 7. Documentos por tema

| Tema | Documentos |
|------|------------|
| **Deploy / producción** | [DEPLOY_PRODUCCION.md](./DEPLOY_PRODUCCION.md), [DESPLIEGUE_Y_CAMBIOS_RECIENTES.md](./DESPLIEGUE_Y_CAMBIOS_RECIENTES.md), [RENDER_DEPLOY.md](../RENDER_DEPLOY.md), [AUDITORIA_PRODUCCION_Y_RUNBOOK.md](./AUDITORIA_PRODUCCION_Y_RUNBOOK.md) |
| **Pagos (Stripe, PayPal)** | [PRUEBAS_STRIPE_Y_PAYPAL_SANDBOX.md](./PRUEBAS_STRIPE_Y_PAYPAL_SANDBOX.md), [WEBHOOK_STRIPE_CONFIG.md](./WEBHOOK_STRIPE_CONFIG.md) |
| **Embudo / CRO** | [EMBUDO_Y_SECCIONES_A_FONDO.md](./EMBUDO_Y_SECCIONES_A_FONDO.md), [CRO_EMBUDO_COPY.md](./CRO_EMBUDO_COPY.md) |
| **Bunny / Hetzner / FTP** | [BUNNY_HETZNER_INTEGRACION.md](./BUNNY_HETZNER_INTEGRACION.md), [BUNNY_PULL_ZONE_SETUP.md](./BUNNY_PULL_ZONE_SETUP.md), [HETZNER_FTP_REAL.md](./HETZNER_FTP_REAL.md) |
| **Supabase** | [CHECKLIST_SUPABASE_PRODUCCION.md](./CHECKLIST_SUPABASE_PRODUCCION.md) |
| **Admin / auth** | [ADMIN_TEST_BEARBEAT.md](./ADMIN_TEST_BEARBEAT.md), [SISTEMA_AUTH_ADMIN.md](../SISTEMA_AUTH_ADMIN.md) |
| **Chatbot / ManyChat** | [SISTEMA_CHATBOT.md](../SISTEMA_CHATBOT.md), [INTEGRACION_MANYCHAT.md](../INTEGRACION_MANYCHAT.md) |
| **Atribución / tracking** | [SISTEMA_ATRIBUCION.md](../SISTEMA_ATRIBUCION.md) |

---

## 8. Flujos clave

1. **Compra:** Checkout → Stripe/PayPal → webhook (pending_purchases, usuario Auth email_confirm) → complete-purchase (datos, activate) → 3 vías (Web, Drive, FTP).
2. **Descarga:** Dashboard o contenido → Biblioteca Online (`/contenido`) o Google Drive (link) o FTP (credenciales + FileZilla/Air Explorer).
3. **Chatbot RAG:** ManyChat External Request → POST `/api/chat/webhook` (message, userId) → embedding → match_documents → OpenAI → respuesta ManyChat v2.
4. **Admin:** Acceso por role admin o ADMIN_EMAIL_WHITELIST; KPIs, Fuentes de Tráfico, sync FTP, últimas compras, Notificaciones Push (ENVIAR A TODOS), Centro de Chatbot con "Generar Reporte AI".
5. **Chat web:** Frontend → POST `/api/chat` (message, history) → RAG (match_documents) → GPT → guardado en chat_messages → respuesta.

---

*Última actualización: ver [DESPLIEGUE_Y_CAMBIOS_RECIENTES.md](./DESPLIEGUE_Y_CAMBIOS_RECIENTES.md) para descargas 307, push admin, chat RAG + chat_messages, analyze-chat y migraciones.*
