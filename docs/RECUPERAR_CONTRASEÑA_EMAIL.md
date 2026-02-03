# Recuperar contraseña: no llega el email

Si en **Recuperar contraseña** pones tu correo, te dice "Email enviado" pero **no te llega ningún correo**, sigue estos pasos.

---

## 1. Revisar bandeja de entrada

- **Spam / Correo no deseado**
- **Promociones** (Gmail)
- **Otros** o **Social** (según tu cliente de correo)

El remitente por defecto de Supabase es `noreply@mail.app.supabase.io`. Busca ese nombre o "Supabase" en el asunto.

---

## 2. Configuración en Supabase (obligatoria)

El enlace del correo lleva primero a Supabase y luego redirige a tu sitio (`/auth/callback` → `/reset-password`). Si Supabase no tiene tu URL configurada, el email puede no enviarse o el enlace fallar.

1. Entra en **https://supabase.com/dashboard** y abre tu proyecto.
2. Menú **Authentication** → **URL Configuration**.
3. **Site URL:** debe ser la URL de tu app, por ejemplo:
   - Producción: `https://bear-beat2027.onrender.com`
   - Local: `http://localhost:3000`
4. **Redirect URLs:** debe incluir tu dominio con `/**`, por ejemplo:
   - `https://bear-beat2027.onrender.com/**`
   - (Opcional) `http://localhost:3000/**`
5. Guarda los cambios (**Save**).

Sin esto, el correo de recuperación puede no generarse bien o el enlace no abrir tu página de restablecer contraseña.

---

## 3. Plantillas de email en Supabase

Comprueba que los emails de Auth estén activos:

1. **Authentication** → **Email Templates**.
2. Abre la plantilla **"Reset Password"** (Recuperar contraseña).
3. Que esté **habilitada** y con el asunto y cuerpo por defecto (o personalizados). No desactives la plantilla.

Si alguna vez desactivaste "Enable Email Confirmations" o similares, revisa **Authentication** → **Providers** → **Email** y que el envío de correos esté permitido.

---

## 4. Mejor entrega: SMTP propio (opcional)

Por defecto Supabase envía desde `noreply@mail.app.supabase.io`. Esos correos a veces caen en spam. Para que lleguen mejor y desde tu dominio:

1. En Supabase: **Project Settings** (engranaje) → **Auth** → **SMTP Settings**.
2. Activa **Custom SMTP**.
3. Configura con un proveedor (Resend, SendGrid, etc.). Ejemplo con **Resend**:
   - Host: `smtp.resend.com`
   - Port: `465` (SSL) o `587` (TLS)
   - User: `resend`
   - Password: tu `RESEND_API_KEY`
   - Sender email: un correo verificado en Resend (ej. `noreply@bearbeat.mx`)

Así el correo de "Recuperar contraseña" sale desde tu dominio y suele llegar mejor a la bandeja de entrada.

---

## 5. Variable de entorno en producción

En tu hosting (p. ej. Render) define:

- **NEXT_PUBLIC_APP_URL** = `https://bear-beat2027.onrender.com` (sin barra final)

Así el enlace del correo apunta siempre a tu sitio en producción.

---

## Resumen

| Qué hacer | Dónde |
|-----------|--------|
| Site URL correcta | Supabase → Authentication → URL Configuration |
| Redirect URLs con `https://tudominio.com/**` | Mismo sitio |
| Plantilla "Reset Password" activa | Authentication → Email Templates |
| (Opcional) SMTP propio para menos spam | Project Settings → Auth → SMTP Settings |
| NEXT_PUBLIC_APP_URL en producción | Render / tu hosting → Environment |

Si tras esto el correo sigue sin llegar, revisa en Supabase **Logs** (Logs → Auth) si aparece algún error al enviar el email.
