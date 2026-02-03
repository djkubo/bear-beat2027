# Dónde sacar cada clave de .env.local

Lista de todas las variables que usa el proyecto, con enlaces y pasos para obtener cada clave., si son **obligatorias** u **opcionales**, y **dónde obtener cada una**.

---

## Obligatorias (sin estas la app no funciona bien en producción)

| Variable | Dónde sacarla |
|----------|----------------|
| **NEXT_PUBLIC_APP_URL** | En local: `http://localhost:3000`. En producción (Render): `https://bear-beat2027.onrender.com` (o tu dominio). El script `deploy:env` la sube automática. |
| **NODE_ENV** | En local: `development`. En producción: `production` (Render lo pone al hacer deploy). |
| **NEXT_PUBLIC_SUPABASE_URL** | [Supabase](https://supabase.com/dashboard) → tu proyecto → **Settings** → **API** → "Project URL". Formato: `https://XXXX.supabase.co`. |
| **NEXT_PUBLIC_SUPABASE_ANON_KEY** | Misma página: **Project API keys** → "anon" **public**. |
| **SUPABASE_SERVICE_ROLE_KEY** | Misma página → "service_role" **secret** (no la expongas en el front). |
| **DATABASE_URL** | Supabase → **Settings** → **Database** → "Connection string" → **URI**. Usa el pooler (puerto 6543) si te lo dan. Ej: `postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`. La contraseña es la de la base de datos (Settings → Database → Reset password si no la tienes). |
| **NEXT_PUBLIC_STRIPE_PUBLIC_KEY** | [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **API keys**. Public key: `pk_live_...` (producción) o `pk_test_...` (pruebas). |
| **STRIPE_SECRET_KEY** | Misma página → Secret key: `sk_live_...` o `sk_test_...`. |
| **STRIPE_WEBHOOK_SECRET** | Stripe → **Developers** → **Webhooks** → añade endpoint `https://bear-beat2027.onrender.com/api/webhooks/stripe` → evento `checkout.session.completed` (y si usas PaymentIntent, `payment_intent.succeeded`) → "Reveal" el **Signing secret** (`whsec_...`). |
| **FIX_ADMIN_SECRET** | Valor secreto que tú eliges (ej. `bearbeat-admin-2027-secreto`). Se usa en la URL `/fix-admin?token=VALOR` para asignar admin sin login. En producción debe estar solo en Render; en local opcional. |

---

## Recomendadas (pagos, auth, correos)

| Variable | Dónde sacarla |
|----------|----------------|
| **NEXT_PUBLIC_PAYPAL_CLIENT_ID** | [developer.paypal.com](https://developer.paypal.com) → **My Apps & Credentials** → tu app (Live o Sandbox) → "Client ID". |
| **PAYPAL_CLIENT_SECRET** | Misma app → "Secret". |
| **PAYPAL_USE_SANDBOX** | `true` para pruebas, `false` en producción. |
| **NEXT_PUBLIC_PAYPAL_USE_SANDBOX** | Mismo valor que arriba (para ocultar banner "Modo pruebas" en front). |
| **SUPABASE_ACCESS_TOKEN** | [Supabase](https://supabase.com/dashboard/account/tokens) → **Account** → **Access Tokens** → "Generate new token". Se usa solo para el script `npm run supabase:set-auth-urls` (configurar Site URL y Redirect URLs por API). Opcional si configuras Auth a mano en el dashboard. |

---

## Opcionales por funcionalidad

### Render (solo para subir env a Render desde tu máquina)

| Variable | Dónde sacarla |
|----------|----------------|
| **RENDER_API_KEY** | [Render](https://dashboard.render.com) → **Account Settings** → **API Keys** → "Create API Key". Formato `rnd_...`. |
| **RENDER_SERVICE_ID** | Opcional. Render → tu servicio **bear-beat2027** → la URL tiene el ID (`srv-...`) o en Settings. El script lo detecta por nombre si no lo pones. |

### Fix admin (bypass para dar rol admin)

| Variable | Dónde sacarla |
|----------|----------------|
| **FIX_ADMIN_SECRET** | Cualquier string secreto. Ej: `bearbeat-admin-2027-secreto`. En Render el script `deploy:env` puede subir un valor por defecto si no lo tienes. |

### Push (notificaciones web desde /admin)

| Variable | Dónde sacarla |
|----------|----------------|
| **NEXT_PUBLIC_VAPID_PUBLIC_KEY** | En la raíz del proyecto: `npx web-push generate-vapid-keys`. Copia "Public Key" y "Private Key". |
| **VAPID_PRIVATE_KEY** | La "Private Key" del comando anterior. |
| **VAPID_EMAIL** | Ej: `mailto:soporte@bearbeat.mx` (contacto para la suscripción push). |

### Meta / Facebook (Pixel y CAPI)

| Variable | Dónde sacarla |
|----------|----------------|
| **NEXT_PUBLIC_META_PIXEL_ID** | [Meta Events Manager](https://business.facebook.com/events_manager) → tu Pixel → Configuración → "ID del pixel". |
| **FACEBOOK_CAPI_ACCESS_TOKEN** | En el mismo Pixel → Configuración → "Configuración de la API de conversiones" → "Token de acceso del sistema". O desde [developers.facebook.com](https://developers.facebook.com) → tu app → Herramientas → Generar token con permisos `ads_management` y `business_management`. |

### Contacto y WhatsApp

| Variable | Dónde sacarla |
|----------|----------------|
| **NEXT_PUBLIC_WHATSAPP_NUMBER** | Número real de soporte: código país + número sin espacios. Ej. México: `5215512345678`. Se usa en enlaces wa.me y en la UI de contacto. |

### ManyChat (chatbot / Messenger / WhatsApp)

| Variable | Dónde sacarla |
|----------|----------------|
| **NEXT_PUBLIC_MANYCHAT_PAGE_ID** | ManyChat → **Settings** → **Page** → ID de la página de Facebook conectada. |
| **MANYCHAT_API_KEY** | ManyChat → **Settings** → **API** → "Your API Key". |

### Microsoft Clarity (analytics / mapas de calor)

| Variable | Dónde sacarla |
|----------|----------------|
| **NEXT_PUBLIC_CLARITY_PROJECT_ID** | [clarity.microsoft.com](https://clarity.microsoft.com) → crear proyecto → pegar el "Project ID". |

### Twilio (SMS / Verify OTP en registro)

| Variable | Dónde sacarla |
|----------|----------------|
| **TWILIO_ACCOUNT_SID** | [Twilio Console](https://console.twilio.com) → "Account SID". |
| **TWILIO_AUTH_TOKEN** | Misma página → "Auth Token". |
| **TWILIO_VERIFY_SERVICE_SID** | Twilio → **Verify** → **Services** → crear servicio → "Service SID" (empieza por `VA...`). |
| **TWILIO_PHONE_NUMBER** | Número de Twilio desde el que envías SMS (si no usas solo Verify). |
| **TWILIO_WHATSAPP_NUMBER** | Ej: `whatsapp:+14155238886` (sandbox) o tu número Twilio para WhatsApp. |
| **DEV_OTP_BYPASS_CODE** | Solo pruebas: ej. `111111` para entrar sin SMS. En producción quitar o no usar. |

### Resend (emails transaccionales)

| Variable | Dónde sacarla |
|----------|----------------|
| **RESEND_API_KEY** | [resend.com](https://resend.com) → **API Keys** → "Create API Key". Formato `re_...`. Para emails de recuperación de contraseña, confirmación, etc. si no usas solo Supabase. |

### Bunny CDN (demos, portadas, descargas por URL firmada)

| Variable | Dónde sacarla |
|----------|----------------|
| **BUNNY_API_KEY** | [bunny.net](https://bunny.net) → **Account** → **API** → "Account API Key". |
| **BUNNY_STORAGE_ZONE** | Bunny → **Storage** → tu Storage Zone → nombre (ej. `bear-beat`). |
| **BUNNY_STORAGE_PASSWORD** | Al crear la Storage Zone te dan una contraseña; o en la zona → "FTP & API Access" → "Password". |
| **BUNNY_CDN_URL** | Bunny → **Pull Zones** → tu zona → "Hostname" (ej. `bear-beat.b-cdn.net`) → URL: `https://bear-beat.b-cdn.net` (sin barra final). |
| **NEXT_PUBLIC_BUNNY_CDN_URL** | Mismo valor que **BUNNY_CDN_URL** (el frontend lo usa para demos). |
| **BUNNY_TOKEN_KEY** | Bunny → **Pull Zones** → tu zona → **Security** → "Token Authentication" → "Signing Key" (clave para firmar URLs). Mínimo 8 caracteres. |
| **BUNNY_PACK_PATH_PREFIX** | Ruta de carpetas en tu Storage donde están los packs. Ej: `packs/enero-2026`. |
| **BUNNY_PULL_ZONE** | Hostname de la Pull Zone para descargas (puede ser un subdominio propio, ej. `cdn.bearbeat.mx`). |
| **BUNNY_SECURITY_KEY** | Si usas "Signed URL" en la Pull Zone, esta es la clave de firma (puede ser la misma que Token Key según configuración). |
| **BUNNY_STREAM_LIBRARY_ID** / **BUNNY_STREAM_API_KEY** | Solo si usas Bunny Stream para video streaming; en **Stream** → tu biblioteca → API. |

### FTP / Hetzner (catálogo y sync)

| Variable | Dónde sacarla |
|----------|----------------|
| **FTP_HOST** | Host del Storage Box (ej. `u540473.your-storagebox.de`). |
| **FTP_USER** | Usuario FTP (ej. `u540473` o un subusuario). |
| **FTP_PASSWORD** | Contraseña del usuario FTP. |
| **NEXT_PUBLIC_FTP_HOST** | Mismo que **FTP_HOST**; se muestra en el dashboard al usuario para que se conecte con FileZilla. |
| **HETZNER_FTP_HOST** / **HETZNER_FTP_USER** / **HETZNER_FTP_PASSWORD** | Alternativa con prefijo; mismo valor que FTP_*. |
| **HETZNER_ROBOT_USER** / **HETZNER_ROBOT_PASSWORD** / **HETZNER_STORAGEBOX_ID** | [Hetzner Robot](https://robot.hetzner.com) → Storage Box → "Web service" (crear usuario webservice). Para crear subcuentas FTP por compra. Opcional. |

### OpenAI (BearBot, RAG, reportes admin)

| Variable | Dónde sacarla |
|----------|----------------|
| **OPENAI_API_KEY** | [platform.openai.com](https://platform.openai.com/api-keys) → "Create new secret key". Formato `sk-...`. |
| **OPENAI_CHAT_MODEL** | Modelo a usar. Ej: `gpt-4o`, `gpt-4o-mini`, o el que tengas (ej. `gpt-5.2` si está disponible en tu cuenta). |

### Admin y moneda

| Variable | Dónde sacarla |
|----------|----------------|
| **ADMIN_EMAIL_WHITELIST** | Opcional. Emails separados por coma que también se consideran admin (ej. `admin@bearbeat.mx,otro@bearbeat.mx`). |
| **CURRENCY_USD_TO_MXN_RATE** | Opcional. Tipo de cambio USD→MXN para mostrar en admin (ej. `17`). Se puede actualizar a mano. |

---

## Resumen: qué te falta según tu .env.local

En tu archivo **ya tienes** (correcto para producción):

- RENDER_API_KEY, APP_URL, APP_NAME  
- Supabase (URL, anon, service role, DATABASE_URL)  
- Stripe (pk_live, sk_live, webhook secret)  
- PayPal (Live, use_sandbox false)  
- FTP Hetzner (host, user, password)  
- Twilio (SID, token, Verify SID, DEV_OTP_BYPASS_CODE)  
- ManyChat, Meta Pixel, Facebook CAPI  
- VAPID (push), OpenAI  

**Te recomiendo añadir (o descomentar) si quieres usarlos:**

1. **FIX_ADMIN_SECRET**  
   - Para poder usar `/fix-admin?token=XXX` y asignar admin.  
   - En .env.local: `FIX_ADMIN_SECRET=bearbeat-admin-2027-secreto` (o el valor que uses en Render).

2. **Bunny (demos y thumbnails sin 503)**  
   - Si quieres demos y portadas por CDN: **NEXT_PUBLIC_BUNNY_CDN_URL**, **BUNNY_TOKEN_KEY** (y si usas storage: BUNNY_API_KEY, BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD, BUNNY_PACK_PATH_PREFIX).  
   - Dónde: ver tabla "Bunny CDN" arriba.

3. **RESEND_API_KEY**  
   - Si quieres que los emails de recuperación/confirmación salgan por Resend en lugar de solo Supabase.  
   - Dónde: resend.com → API Keys.

4. **SUPABASE_ACCESS_TOKEN**  
   - Solo si quieres configurar Site URL y Redirect URLs con `npm run supabase:set-auth-urls`.  
   - Dónde: supabase.com/dashboard/account/tokens.

5. **NEXT_PUBLIC_WHATSAPP_NUMBER**  
   - Número real de soporte para wa.me y contacto.  
   - Ej: `5215512345678`.

6. **NEXT_PUBLIC_FTP_HOST**  
   - Mismo valor que FTP_HOST (ej. `u540473.your-storagebox.de`) para mostrarlo en el dashboard al usuario.

Tu `.env.local` está bien para que la app funcione (login, checkout, Stripe, PayPal, FTP, Twilio, ManyChat, Pixel, push, OpenAI). Lo que falta es opcional según quieras demos por Bunny, fix-admin local, emails por Resend y número de WhatsApp real.

---

## Resumen: qué falta en Render (comparado con tu export)

Si comparas tu export de Render (`bear-beat2027.env`) con lo que usa el proyecto:

**Ya tienes en Render:** APP_URL, APP_NAME, NODE_ENV, Supabase (URL, anon, service role), DATABASE_URL, Stripe (pk, sk, webhook), PayPal, FTP, Hetzner (robot, storagebox), ManyChat, Meta Pixel, Facebook CAPI, VAPID, OpenAI, Twilio, FIX_ADMIN_SECRET, DEV_OTP_BYPASS_CODE.

**Solo te faltan en Render (opcionales):**

| Variable | Para qué | Dónde sacarla |
|----------|----------|----------------|
| **BUNNY_API_KEY** | Ya la tienes en .env.local; sube con `npm run deploy:env`. | Bunny → Account → API. |
| **NEXT_PUBLIC_BUNNY_CDN_URL** | Demos y thumbnails sin 503. | Bunny → Pull Zones → tu zona → hostname → `https://tu-zona.b-cdn.net` (sin barra final). |
| **BUNNY_TOKEN_KEY** | Firmar URLs de demos. | Bunny → Pull Zones → tu zona → **Security** → Token Authentication → Signing Key (mín. 8 caracteres). |
| **NEXT_PUBLIC_FTP_HOST** | Que el dashboard muestre el host FTP al usuario. | Mismo valor que FTP_HOST (ej. `u540473.your-storagebox.de`). Ya está en .env.local; `deploy:env` la sube. |
| **RESEND_API_KEY** | Emails (recuperar contraseña, etc.) por Resend. | [resend.com](https://resend.com) → API Keys. Opcional. |

**Corrección en Render:** Borra la variable **EXT_PUBLIC_APP_URL** (está mal escrita). La correcta es **NEXT_PUBLIC_APP_URL**, que ya tienes. Tener las dos puede generar confusión.
