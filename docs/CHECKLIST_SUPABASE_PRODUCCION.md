# Configurar Supabase para que el login funcione en producción

**Problema:** Entras con tu usuario en bear-beat2027.onrender.com y te vuelve a mandar al login.  
**Causa:** Supabase no tiene puesta la URL de tu sitio.  
**Solución:** Hacer estos pasos **una sola vez** (5 minutos). No hace falta saber programar.

---

## Paso 1 — Abre Supabase

1. Abre el navegador.
2. Entra aquí: **https://supabase.com/dashboard**
3. Inicia sesión si te lo pide.
4. Haz clic en el **proyecto** que usa tu web (el mismo que tiene la base de datos de Bear Beat).

---

## Paso 2 — Ir a la configuración de URLs

1. En el menú de la **izquierda**, haz clic en **Authentication**.
2. Luego haz clic en **URL Configuration**.

Ahora deberías ver una página con **Site URL** y **Redirect URLs**.

---

## Paso 3 — Cambiar Site URL

1. En el cuadro **Site URL** borra lo que haya (por ejemplo `http://localhost:3000`).
2. Escribe o pega **exactamente** esto:
   ```
   https://bear-beat2027.onrender.com
   ```
3. Haz clic en **Save** (abajo de esa sección).

---

## Paso 4 — Añadir Redirect URLs

1. En **Redirect URLs** mira si ya está esta línea:
   ```
   https://bear-beat2027.onrender.com/**
   ```
2. Si **no** está:
   - En el cuadro de texto escribe: `https://bear-beat2027.onrender.com/**`
   - Haz clic en **Add** (o el botón para añadir).
3. Si quieres poder probar en tu ordenador, añade también:
   ```
   http://localhost:3000/**
   ```
4. Haz clic en **Save**.

**Importante:** Si el enlace del email de confirmación te llevaba a `https://0.0.0.0:10000/login`, era porque **Site URL** estaba mal (o vacía y Supabase usaba otra). Con **Site URL** = `https://bear-beat2027.onrender.com` y **NEXT_PUBLIC_APP_URL** en Render con el mismo valor, el enlace del email irá a tu web en producción.

---

## Paso 5 — Personalizar el email de confirmación (opcional)

El email por defecto de Supabase ("Confirm your signup", de noreply@mail.app.supabase.io) se puede cambiar para que se vea con tu marca.

1. En Supabase: **Authentication** → **Email Templates**.
2. Elige **Confirm signup**.
3. Puedes editar:
   - **Subject:** por ejemplo: `Bear Beat – Confirma tu correo`
   - **Body (HTML):** el texto y el enlace. El enlace de confirmación debe quedarse como `{{ .ConfirmationURL }}` (es una variable que Supabase reemplaza).

**Ejemplo de cuerpo** (más limpio, en español):

```html
<h2>¡Hola!</h2>
<p>Gracias por registrarte en Bear Beat.</p>
<p>Haz clic en el siguiente enlace para confirmar tu correo y activar tu cuenta:</p>
<p><a href="{{ .ConfirmationURL }}" style="background:#08E1F7;color:#000;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">Confirmar mi correo</a></p>
<p>Si no te registraste en Bear Beat, puedes ignorar este mensaje.</p>
<p>— El equipo Bear Beat</p>
```

4. Guarda los cambios. Los próximos emails de confirmación usarán esta plantilla.

**Para que los emails salgan desde tu propio dominio** (ej. noreply@bearbeat.mx) en lugar de noreply@mail.app.supabase.io, configura **Custom SMTP** en **Project Settings** → **Auth** → **SMTP Settings** (con Resend, SendGrid, etc.).

---

## Paso 6 — Probar

1. Abre: **https://bear-beat2027.onrender.com/login**
2. Inicia sesión con tu usuario (por ejemplo test@bearbeat.com).
3. Deberías ir al dashboard o a la página de después del login **sin** que te vuelva a sacar al login.

Si pasa eso, ya está todo bien.

---

## Resumen (por si lo necesitas)

| Dónde en Supabase | Qué poner |
|-------------------|-----------|
| Authentication → URL Configuration → **Site URL** | `https://bear-beat2027.onrender.com` |
| Authentication → URL Configuration → **Redirect URLs** | `https://bear-beat2027.onrender.com/**` (y opcional `http://localhost:3000/**`) |

Solo tienes que hacerlo una vez. Después el login en producción debería funcionar bien.

---

## Si aún no puedes entrar al panel admin

Si ya configuraste Supabase (Site URL + Redirect URLs) pero **al ir a /admin te manda otra vez al login o al dashboard**, usa el **acceso directo** (bypass). Funciona aunque la sesión no persista.

**Requisito:** En **Render** → tu servicio → **Environment** debe existir la variable **FIX_ADMIN_SECRET** con valor **bearbeat-admin-2027-secreto**. Si no está, añádela, guarda y espera el deploy.

**Pasos:**

1. Abre en el navegador **esta URL** (cópiala tal cual):
   ```
   https://bear-beat2027.onrender.com/fix-admin?token=bearbeat-admin-2027-secreto
   ```
2. Deberías ver un mensaje tipo "Admin asignado a test@bearbeat.com" y un botón **"Entrar al panel admin →"**.
3. Haz **clic** en ese botón.
4. Te llevará al panel admin. Tendrás acceso durante **15 minutos** sin tener que iniciar sesión de nuevo.

Si en el paso 1 ves "Token no válido", es que **FIX_ADMIN_SECRET** no está en Render o no coincide con `bearbeat-admin-2027-secreto`. Añádela en Environment y vuelve a intentar.

---

## Aplicar migraciones de base de datos (si faltan)

Si añadiste funcionalidades nuevas (atribución en compras, base vectorial para el chatbot RAG, etc.), asegúrate de que las migraciones estén aplicadas en tu proyecto de Supabase.

**Opción A — Desde Supabase Dashboard**

1. En Supabase: **SQL Editor** (menú izquierda).
2. Crea una nueva query y pega el contenido de cada archivo (en este orden):
   - `supabase/migrations/20260130000000_add_purchases_attribution.sql` (columnas utm en `purchases`)
   - `supabase/migrations/20260130200000_vector_knowledge.sql` (tabla `documents` y función `match_documents` para el chatbot)
   - `supabase/migrations/20260131000000_add_videos_key_bpm.sql` (si existe)
3. Ejecuta cada uno con **Run**. Si ya aplicaste alguna antes, puede salir error tipo "column already exists" o "table already exists"; en ese caso ignora y sigue con la siguiente.

**Opción B — Con Supabase CLI (si tienes el proyecto enlazado)**

```bash
supabase db push
```

Así se aplican todas las migraciones pendientes. Después del push, el chatbot RAG y el panel de Fuentes de tráfico en /admin usarán la base actualizada.
