# Despliegue y cambios recientes – Bear Beat 2027

Documentación de lo subido a producción: descargas, push, chat RAG, panel admin y migraciones.

---

## 1. Descargas (`/api/download`)

- **Comportamiento:** El servidor **no** lee archivos ni hace `fetch` al CDN. Responde con **307 Temporary Redirect** a la URL firmada de BunnyCDN (Token Auth: `BUNNY_PULL_ZONE` + `BUNNY_SECURITY_KEY`).
- **Path:** Se codifica con `encodeURIComponent` por segmento en `@/lib/bunny` para que Bunny acepte espacios y caracteres especiales.
- **Frontend (`/contenido`):** Al descargar carpeta ZIP se hace HEAD a la URL del CDN; si devuelve 404 se muestra un **toast de advertencia** (amarillo/naranja): *"El paquete ZIP de este género aún no está disponible. Por favor usa la opción FTP..."* y no se abre pestaña.

**Archivos:** `src/app/api/download/route.ts`, `src/lib/bunny.ts`, `src/app/contenido/page.tsx`.

---

## 2. Notificaciones Push (admin)

- **Tabla `push_subscriptions`:** Columna `subscription` (jsonb) añadida; RLS: usuarios pueden **insertar** su suscripción; solo **admin** puede **leer** todas (para el panel).
- **API de envío:** `POST /api/admin/send-push` (solo admin). Recibe `{ title, body, url, icon }`. Lee todas las suscripciones activas con service role, envía con **web-push**; si una suscripción devuelve **410 (Gone)** o 404, se **elimina** de la BD (limpieza automática).
- **Panel admin (`/admin/push`):** Formulario con título, mensaje, URL, icono (opcional). Botón **"ENVIAR A TODOS"**. Estadísticas (dispositivos suscritos) vía `GET /api/admin/send-push`.
- **Subscribe:** `POST /api/push/subscribe` guarda también el objeto completo en `subscription` (jsonb).

**Variables:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_ADMIN_EMAIL` (opcional, para subject web-push).

**Migración:** `supabase/migrations/20260202000000_push_subscriptions_rls.sql`.

---

## 3. Chat Web (BearBot) – RAG + persistencia

- **API `POST /api/chat`:**  
  - **Input:** `{ message, history?, sessionId? }` (history = mensajes anteriores para contexto).  
  - **Paso 1:** Embedding del mensaje → RPC `match_documents` en Supabase (fragmentos relevantes).  
  - **Paso 2:** System prompt BearBot + fragmentos RAG (precios $19 USD, FTP/Drive, catálogo).  
  - **Paso 3:** OpenAI (GPT-5.2 vía `OPENAI_CHAT_MODEL` o default `gpt-5.2` en `src/lib/openai-config.ts`).  
  - **Paso 4:** Guarda en `chat_messages`: (1) mensaje usuario `role: 'user'`, `is_bot: false`; (2) respuesta `role: 'assistant'`, `is_bot: true`.  
  - **Output:** `{ role: 'assistant', content: '...', sessionId }`. Cookie `chat_session_id` se establece/actualiza.

- **Tabla `chat_messages`:**  
  - `id`, `session_id`, `user_id` (nullable), `role`, `content`, `is_bot`, `created_at`.  
  - RLS: INSERT permitido; SELECT solo admin (para panel).

- **Script de alimentación RAG:** `npx tsx scripts/feed-brain.ts`  
  - Fuentes: tabla `videos` (catálogo por género) + reglas hardcodeadas (Precios, FTP, Drive, descargas, pagos).  
  - Embeddings: `text-embedding-3-large`. Inserta en `documents`.

**Migración:** `supabase/migrations/20260202100000_chat_messages_web.sql` (tabla `chat_messages` + `is_admin()` si no existe).

---

## 4. Panel Admin – Análisis de chat con IA

- **Botón "🧠 Generar Reporte AI"** en `/admin/chatbot` (Centro de Chatbot). Al hacer clic se abre un modal: "Analizando conversaciones..."; luego se muestra un reporte con:
  - 🔥 Tendencia principal  
  - ⚠️ Puntos de dolor  
  - 💰 Oportunidades de venta  
  - 💡 Recomendación  
- **API:** `POST /api/admin/analyze-chat` (solo admin). Lee últimos 100 mensajes de usuarios (`messages`, `direction = 'inbound'`), los envía a OpenAI (GPT-5.2) y devuelve el JSON del reporte.
- **Acción rápida:** Si hay "Oportunidades de venta", el modal muestra el botón **"Ir a esos chats →"** que hace scroll a la sección "Esperando Atención Humana".

**Archivos:** `src/app/api/admin/analyze-chat/route.ts`, `src/app/admin/chatbot/AnalyzeChatButton.tsx`, `src/app/admin/chatbot/page.tsx`.

---

## 5. Migraciones Supabase (orden sugerido)

| Migración | Descripción |
|-----------|-------------|
| `20260130000000_add_purchases_attribution.sql` | Columnas UTM en `purchases`. |
| `20260130200001_vector_knowledge_fix.sql` | Extensión `vector`, tabla `documents`, función `match_documents` (sin índice). |
| `20260131000000_add_videos_key_bpm.sql` | Key/BPM en videos. |
| `20260202000000_push_subscriptions_rls.sql` | Columna `subscription` en `push_subscriptions` y RLS (insert usuario, select admin). |
| `20260202100000_chat_messages_web.sql` | Tabla `chat_messages` y RLS para BearBot. |

**Aplicar en Supabase:** SQL Editor (pegar contenido de cada archivo en orden) o `supabase db push` si el proyecto está enlazado.

---

## 6. Variables de entorno (resumen)

| Variable | Uso |
|----------|-----|
| OPENAI_API_KEY, OPENAI_CHAT_MODEL | Chat RAG (GPT-5.2), analyze-chat, feed-brain. Default: `gpt-5.2`. Ver [CONFIGURACION_IA_Y_PRODUCCION.md](./CONFIGURACION_IA_Y_PRODUCCION.md). |
| SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | RAG, chat_messages, push send-push, feed-brain. |
| BUNNY_PULL_ZONE, BUNNY_SECURITY_KEY | Descargas (URL firmada, 307 redirect). |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY | Push (web-push). |
| NEXT_PUBLIC_ADMIN_EMAIL | Subject web-push (opcional). |

Ver también [INDICE_COMPLETO.md](./INDICE_COMPLETO.md) §5 y DOCUMENTACION_COMPLETA.md.

---

## 7. Scripts

| Comando | Uso |
|---------|-----|
| `npx tsx scripts/feed-brain.ts` | Alimenta `documents` (catálogo + reglas) para RAG del chat web. |
| `npx tsx scripts/sync-knowledge.ts` | Alternativa: ingesta RAG (páginas estáticas + catálogo + reglas). |
| `node scripts/run-supabase-sql.js supabase/migrations/<archivo>.sql` | Ejecutar una migración con `DATABASE_URL` de `.env.local`. |

---

## 8. Subir todo a producción

1. **Código:** `git add .` (sin `.env.local`), `git commit -m "..."`, `git push origin main`. Render hace Auto-Deploy si el servicio está conectado al repo.
2. **Variables en Render:** `npm run deploy:env` (requiere `RENDER_API_KEY` en `.env.local`). Sube todas las vars de `.env.local` al servicio bear-beat2027 y dispara un deploy.
3. **Comprobaciones:** https://bear-beat2027.onrender.com, chat BearBot, admin → "Generar Reporte AI".

Ver [CONFIGURACION_IA_Y_PRODUCCION.md](./CONFIGURACION_IA_Y_PRODUCCION.md) para IA (GPT-5.2) y proceso completo.

---

*Última actualización: GPT-5.2 como modelo de chat, openai-config centralizado, subida a producción documentada.*
