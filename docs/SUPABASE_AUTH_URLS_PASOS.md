# Supabase: configurar URLs para que el login funcione en producción

Para que **iniciar sesión** y los **redirects** funcionen en tu app en producción, Supabase tiene que saber cuál es la URL de tu sitio.

---

## Pasos (2 minutos)

1. Entra en **[Supabase Dashboard](https://supabase.com/dashboard)** y abre tu proyecto (el que usa `mthumshmwzmkwjulpbql`).

2. En el menú izquierdo: **Authentication** → **URL Configuration**.

3. Rellena:
   - **Site URL:**  
     `https://bear-beat2027.onrender.com`
   - **Redirect URLs:** (una por línea o separadas por coma)  
     `https://bear-beat2027.onrender.com/**`  
     `http://localhost:3000/**`

4. Guarda (**Save**).

Con eso, cuando un usuario inicie sesión en producción, Supabase redirigirá bien a tu app y no dará error de redirect.

---

## Opción por script (si tienes token)

Si en `.env.local` añades **SUPABASE_ACCESS_TOKEN** (desde [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) → Create token), puedes ejecutar:

```bash
npm run supabase:set-auth-urls
```

y el script configurará Site URL y Redirect URLs por API. Si ya lo hiciste a mano arriba, no hace falta.
