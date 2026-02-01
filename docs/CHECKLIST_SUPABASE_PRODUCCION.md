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

---

## Paso 5 — Probar

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
