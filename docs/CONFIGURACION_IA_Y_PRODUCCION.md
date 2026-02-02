# Configuración IA (OpenAI) y subida a producción – Bear Beat 2027

Documentación de la configuración de IA en el proyecto: modelo GPT-5.2, embeddings RAG, variables de entorno y proceso para subir todo a producción.

---

## 1. Modelo de chat: GPT-5.2

- **ID del modelo:** `gpt-5.2`
- **Documentación oficial:** [OpenAI – GPT-5.2](https://platform.openai.com/docs/models/gpt-5.2)
- **Uso en Bear Beat:** BearBot (chat web), webhook ManyChat, análisis de chat en admin.

### Dónde se usa

| Lugar | Archivo | Descripción |
|-------|---------|-------------|
| Chat web (BearBot) | `src/app/api/chat/route.ts` | RAG + GPT → respuesta + guardado en `chat_messages`. |
| Webhook ManyChat | `src/app/api/chat/webhook/route.ts` | RAG + GPT → respuesta en formato ManyChat v2. |
| Análisis de chat (admin) | `src/app/api/admin/analyze-chat/route.ts` | Últimos 100 mensajes → reporte (tendencia, dolor, oportunidades, recomendación). |

Todos usan la función **`getOpenAIChatModel()`** de `src/lib/openai-config.ts`, que lee `OPENAI_CHAT_MODEL` o devuelve `gpt-5.2` por defecto.

---

## 2. Configuración centralizada (`src/lib/openai-config.ts`)

```ts
OPENAI_CHAT_MODEL_DEFAULT = 'gpt-5.2'
getOpenAIChatModel()  → process.env.OPENAI_CHAT_MODEL || 'gpt-5.2'
EMBEDDING_MODEL       = 'text-embedding-3-large'
EMBEDDING_DIMENSIONS  = 3072
```

- **Chat:** Cualquier ruta que llame a OpenAI Chat Completions debe usar `getOpenAIChatModel()`.
- **Embeddings:** RAG usa `text-embedding-3-large` (3072 dimensiones). La tabla `documents` y la RPC `match_documents` en Supabase están definidas para 3072 dims.

---

## 3. Variables de entorno (OpenAI)

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `OPENAI_API_KEY` | Sí | Todas las llamadas a OpenAI (chat, embeddings). Crear en [API Keys](https://platform.openai.com/api-keys). |
| `OPENAI_CHAT_MODEL` | No | Modelo de chat. Por defecto `gpt-5.2`. Ejemplo alternativo: `gpt-5.2-pro`. |

- **Local:** `.env.local` (no se sube a Git).
- **Producción (Render):** Añadir en Dashboard → Environment o subir con `npm run deploy:env`.

---

## 4. RAG (embeddings y búsqueda)

- **Modelo de embeddings:** `text-embedding-3-large` (3072 dimensiones).
- **Supabase:** Tabla `documents` (columnas `content`, `metadata`, `embedding vector(3072)`). RPC `match_documents(query_embedding, match_threshold, match_count)`.
- **Scripts de ingesta:**
  - `npx tsx scripts/feed-brain.ts` — Catálogo (videos) + reglas de negocio → `documents`.
  - `npx tsx scripts/sync-knowledge.ts` — Páginas estáticas (términos, privacidad, reembolsos) + catálogo + reglas → `documents`.

Env para scripts: `OPENAI_API_KEY`, `SUPABASE_URL` (o `NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY`.

---

## 5. Subir todo a producción

### 5.1 Código (Git → Render)

1. **Commit y push a `main`:**
   ```bash
   git add .
   git status   # revisar que no se suba .env.local
   git commit -m "Descripción del cambio"
   git push origin main
   ```
2. Si el servicio en Render está conectado al repo con **Auto-Deploy** para `main`, se dispara un deploy automático.

### 5.2 Variables de entorno en Render

1. **Opción A – Script (recomendado):**  
   En `.env.local` tener `RENDER_API_KEY` (y opcionalmente `RENDER_SERVICE_ID`). Luego:
   ```bash
   npm run deploy:env
   ```
   El script lee `.env.local` y sube todas las variables al Environment del servicio **bear-beat2027** en Render (incluye `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`, Supabase, Stripe, etc.). Además dispara un deploy.

2. **Opción B – Manual:**  
   En [Render Dashboard](https://dashboard.render.com) → tu servicio → **Environment** → añadir/editar `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL=gpt-5.2`, y el resto según `.env.example`.

### 5.3 Comprobaciones tras el deploy

- **Sitio:** https://bear-beat2027.onrender.com
- **Chat:** Probar el widget BearBot en la web.
- **Admin:** `/admin` → Centro de Chatbot → "Generar Reporte AI" (usa GPT-5.2).
- **ManyChat:** Si usas External Request a `/api/chat/webhook`, probar un mensaje.

---

## 6. Resumen de archivos clave

| Archivo | Función |
|---------|---------|
| `src/lib/openai-config.ts` | Default del modelo de chat (`gpt-5.2`), `getOpenAIChatModel()`, constantes de embeddings. |
| `src/app/api/chat/route.ts` | POST /api/chat (BearBot web). |
| `src/app/api/chat/webhook/route.ts` | POST /api/chat/webhook (ManyChat). |
| `src/app/api/admin/analyze-chat/route.ts` | POST /api/admin/analyze-chat (reporte IA admin). |
| `scripts/feed-brain.ts` | Alimenta `documents` para RAG. |
| `scripts/sync-knowledge.ts` | Ingesta RAG (páginas estáticas + catálogo + reglas). |
| `scripts/render-set-env.js` | Sube variables de `.env.local` a Render; uso: `npm run deploy:env`. |

---

## 7. Referencias

- [OpenAI – GPT-5.2](https://platform.openai.com/docs/models/gpt-5.2)
- [OpenAI – Chat Completions](https://platform.openai.com/docs/api-reference/chat)
- [DESPLIEGUE_Y_CAMBIOS_RECIENTES.md](./DESPLIEGUE_Y_CAMBIOS_RECIENTES.md) — Chat RAG, analyze-chat, migraciones.
- [INDICE_COMPLETO.md](./INDICE_COMPLETO.md) — Rutas, APIs, variables, scripts.
- [PRODUCCION.md](../PRODUCCION.md) — Checklist producción, Render, variables.

---

*Última actualización: GPT-5.2 como modelo por defecto, openai-config centralizado, proceso de subida a producción documentado.*
