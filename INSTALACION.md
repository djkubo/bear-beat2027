# 🚀 GUÍA DE INSTALACIÓN - Video Remixes DJ 2026

## 📋 Requisitos Previos

- Node.js 18.17.0 o superior
- npm 9.6.7 o superior
- Cuenta de Supabase (gratis)
- Cuenta de Stripe (para pagos)

---

## 📦 PASO 1: Instalación de Dependencias

```bash
# Instalar todas las dependencias
npm install

# O si prefieres pnpm
pnpm install
```

**Tiempo estimado**: 2-5 minutos

---

## 🗄️ PASO 2: Configurar Supabase

### 2.1 Crear Proyecto en Supabase

1. Ve a https://supabase.com
2. Clic en "New project"
3. Completa el formulario:
   - **Name**: video-remixes-dj
   - **Database Password**: (guarda esta contraseña)
   - **Region**: South America (São Paulo) o la más cercana

### 2.2 Obtener Credenciales

1. Ve a Settings → API
2. Copia:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6...`

### 2.3 Ejecutar Schema SQL

1. Ve a SQL Editor en Supabase Dashboard
2. Crea una nueva query
3. Copia y pega el contenido de `supabase/schema.sql`
4. Ejecuta la query (Run)
5. Verifica que se crearon todas las tablas

---

## ⚙️ PASO 3: Configurar Variables de Entorno

### 3.1 Crear archivo .env.local

```bash
cp .env.example .env.local
```

### 3.2 Editar .env.local

```env
# Supabase (REQUERIDO)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-de-supabase

# Stripe (REQUERIDO para pagos)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 💳 PASO 4: Configurar Stripe (Pagos)

### 4.1 Crear Cuenta Stripe

1. Ve a https://stripe.com
2. Crea una cuenta (modo test)

### 4.2 Obtener API Keys

1. Ve a Developers → API keys
2. Copia:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...`
3. Pégalas en `.env.local`

### 4.3 Configurar Webhook

1. Ve a Developers → Webhooks
2. Add endpoint
3. URL: `https://tu-dominio.com/api/webhooks/stripe`
   - (En desarrollo usa ngrok o similar)
4. Eventos a escuchar:
   - `checkout.session.completed`
5. Copia el **Signing secret** y pégalo en `.env.local`

---

## 🚀 PASO 5: Ejecutar en Desarrollo

```bash
npm run dev
```

Abre http://localhost:3000

**¡Deberías ver la landing page funcionando!** 🎉

---

## ✅ PASO 6: Verificación

### 6.1 Verificar que funciona:

- ✅ Landing page se ve correctamente
- ✅ Sección de géneros muestra datos de ejemplo
- ✅ Pricing section muestra $350 MXN
- ✅ No hay errores en consola

### 6.2 Verificar Base de Datos

1. Ve a Supabase Dashboard → Table Editor
2. Verifica que existen estas tablas:
   - `users`
   - `packs`
   - `purchases`
   - `genres` (con datos de ejemplo)
   - `videos`
   - `bundles`

### 6.3 Verificar Géneros

```sql
SELECT * FROM genres ORDER BY video_count DESC;
```

Deberías ver 12 géneros con sus contadores.

---

## 🎨 PASO 7: (Opcional) Personalizar

### 7.1 Cambiar Logo

1. Agrega tu logo en `public/logo.png`
2. Editar `src/components/landing/navbar.tsx`

### 7.2 Cambiar Colores

Editar `tailwind.config.ts`:

```typescript
colors: {
  primary: {
    DEFAULT: 'hsl(221, 83%, 53%)', // Tu color principal
  }
}
```

### 7.3 Agregar Imágenes

1. Coloca imágenes en `public/`
2. Referéncialas en los componentes

---

## 📤 PASO 8: Deploy a Producción (Render)

### 8.1 Preparar para Deploy

```bash
npm run build
```

Verifica que no hay errores.

### 8.2 Deploy en Render

1. Entra en [render.com](https://render.com) y conecta tu repositorio (GitHub/GitLab)
2. Crea un **Web Service**
3. Configura:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm run start`
   - **Node:** 18 o superior
4. Deploy (o activa auto-deploy en cada push a `main`)

### 8.3 Configurar Variables de Entorno en Render

1. En tu Web Service → **Environment**
2. Agrega todas las variables de `.env.local`
3. **NEXT_PUBLIC_APP_URL** debe ser la URL de tu app en Render (ej. `https://tu-app.onrender.com`) o tu dominio propio
4. Guarda y redeploy

### 8.4 Actualizar Webhook de Stripe

1. Ve a Stripe Dashboard → Webhooks
2. Actualiza URL a: `https://tu-app.onrender.com/api/webhooks/stripe` (o tu dominio)

---

## 🐛 Solución de Problemas

### Error: "Cannot find module '@supabase/ssr'"

```bash
rm -rf node_modules
rm package-lock.json
npm install
```

### Error: "Failed to fetch" en APIs

Verifica que:
- `.env.local` tiene las credenciales correctas
- Supabase está configurado
- El schema SQL se ejecutó correctamente

### Error: "Middleware redirect loop"

Verifica que el middleware en `src/middleware.ts` excluye rutas públicas.

---

## 📚 Próximos Pasos

1. ✅ **Agregar contenido real**:
   - Subir videos a Cloudflare R2
   - Poblar base de datos con videos reales

2. ✅ **Configurar FTP**:
   - Instalar Pure-FTPd en servidor
   - Conectar con base de datos

3. ✅ **Configurar emails**:
   - Cuenta de Resend
   - Templates de emails

4. ✅ **Configurar WhatsApp** (opcional):
   - Cuenta de Twilio
   - WhatsApp Business API

5. ✅ **Testing**:
   - Probar flujo completo de compra
   - Verificar emails
   - Probar descargas

---

## 💡 Recursos Adicionales

- 📖 [Documentación de Next.js 15](https://nextjs.org/docs)
- 📖 [Documentación de Supabase](https://supabase.com/docs)
- 📖 [Documentación de Stripe](https://stripe.com/docs)
- 📖 [Tailwind CSS](https://tailwindcss.com/docs)

---

## 🆘 Soporte

Si tienes problemas:

1. Revisa esta guía nuevamente
2. Verifica la consola del navegador
3. Revisa logs de Render/Supabase
4. Revisa el código de ejemplo en los componentes

---

**¡Listo! Tu plataforma de Video Remixes DJ 2026 está funcionando!** 🎉🚀
