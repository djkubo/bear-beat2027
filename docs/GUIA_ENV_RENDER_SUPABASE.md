# Guía: variables, Render y Supabase

Todo lo que necesitas tener guardado y subido para que Bear Beat funcione en producción.

---

## 1. .env.local (tu máquina)

Guarda aquí todas las claves (nunca subas este archivo al repo). Incluye al menos:

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`
- **Stripe:** `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Bunny (CDN y Storage):**
  - `NEXT_PUBLIC_BUNNY_CDN_URL` o `BUNNY_CDN_URL` (Pull Zone URL, sin barra final)
  - `BUNNY_TOKEN_KEY` (Token Authentication de la Pull Zone → Security)
  - `BUNNY_PACK_PATH_PREFIX` (ej. `Videos Enero 2026`)
  - `BUNNY_STORAGE_ZONE` (nombre de la Storage Zone)
  - `BUNNY_STORAGE_PASSWORD` (el **Password** de Storage → FTP & API Access, no el Read-only)
- **Render (solo para subir vars):** `RENDER_API_KEY` (Dashboard → Account → API Keys)

Ver [BUNNY_STORAGE_CREDENTIALES.md](./BUNNY_STORAGE_CREDENTIALES.md) para dónde sacar las de Bunny.

---

## 2. Subir variables a Render (producción)

Para que la app en https://bear-beat2027.onrender.com use esas claves:

1. En **.env.local** tienes las variables listadas arriba (y las demás que use el proyecto).
2. Añade **RENDER_API_KEY** en .env.local (solo en tu máquina).
3. En la carpeta del proyecto ejecuta:
   ```bash
   cd "/Users/gustavogarcia/Documents/CURSOR/BEAR BEAT 2027 3.0"
   npm run deploy:env
   ```
   Eso sube a Render todas las variables que estén en **PROJECT_RENDER_KEYS** (en `scripts/render-set-env.js`) y dispara un deploy.

Si añades una variable nueva al proyecto, ponla en **PROJECT_RENDER_KEYS** en `scripts/render-set-env.js` para que `deploy:env` la suba.

---

## 3. Supabase

Supabase **no guarda** configuración de Bunny ni de Render. Solo usa:

- **Auth** (usuarios, sesiones)
- **Tablas:** usuarios, compras, videos, anuncios, etc.

Qué hacer:

- **Primera vez o reset:** En Supabase → SQL Editor, ejecuta el contenido de **supabase/SETUP_COMPLETO.sql** (crea tablas y políticas).
- **Migraciones nuevas:** Si hay archivos en **supabase/migrations/** que aún no hayas aplicado, ejecuta su contenido en Supabase → SQL Editor en orden (por fecha en el nombre).

No hace falta hacer nada en Supabase específico para Bunny o para Render; solo tener la base y las tablas creadas.

---

## 4. Resumen rápido

| Dónde | Qué |
|-------|-----|
| **.env.local** | Todas las claves (Bunny, Supabase, Stripe, Render API Key). No subir al repo. |
| **Render** | Variables de entorno se suben con `npm run deploy:env` desde tu máquina. |
| **Supabase** | Ejecutar SETUP_COMPLETO.sql y migraciones si aplica. No config de Bunny. |
