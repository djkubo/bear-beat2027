# Hacer admin a test@bearbeat.com en Supabase

Si al entrar a `/admin` te redirige a login o al dashboard aunque ya hayas iniciado sesión con **test@bearbeat.com**, el panel está comprobando que tu usuario tenga **role = 'admin'** en la tabla `public.users` de Supabase. Si no hay fila o el rol no es `admin`, no podrás acceder.

## 1. Comprobar si ya eres admin

En **Supabase Dashboard** del proyecto que usa tu app:

1. Ve a **SQL Editor**.
2. Ejecuta:

```sql
-- Ver si existe el usuario y su rol
SELECT u.id, u.email, u.role
FROM public.users u
WHERE u.email = 'test@bearbeat.com';
```

- Si **no devuelve filas**: el usuario no está en `public.users` (o no existe en Auth). Hay que crearlo/sincronizarlo y darle `admin`.
- Si devuelve una fila con **role = 'user'** (u otro distinto de `admin`): hay que actualizar a `admin`.
- Si devuelve **role = 'admin'**: ya eres admin; si aun así te echa, el problema puede ser de sesión/cookies o de proyecto (por ejemplo, que la app apunte a otro proyecto de Supabase).

## 2. Comprobar que el usuario existe en Auth

El usuario debe existir en **Authentication > Users**. Si no está:

1. **Authentication** → **Users** → **Add user**.
2. Email: `test@bearbeat.com`, contraseña la que uses para iniciar sesión en la app.
3. Guardar.

Sin usuario en Auth, el script de abajo no insertará nada en `public.users`.

## 3. Hacer admin a test@bearbeat.com

En **SQL Editor**, ejecuta el contenido del archivo:

**`supabase/HACER_ADMIN_TEST_BEARBEAT.sql`**

O pega y ejecuta esto:

```sql
INSERT INTO public.users (id, email, name, role)
SELECT
  id,
  email,
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    split_part(email, '@', 1)
  ),
  'admin'
FROM auth.users
WHERE email = 'test@bearbeat.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  email = EXCLUDED.email,
  name = COALESCE(EXCLUDED.name, public.users.name),
  updated_at = NOW();
```

Luego comprueba de nuevo con el `SELECT` del apartado 1: debe salir **role = 'admin'**.

## 4. Si sigue sin dejarte entrar

- Cierra sesión en la app, vuelve a iniciar sesión con test@bearbeat.com y prueba otra vez `/admin`.
- Comprueba que la app en producción usa las variables de entorno del **mismo** proyecto de Supabase donde ejecutaste el SQL.
- Revisa en el navegador que las cookies de sesión se envían al dominio de la app (sin bloqueos de terceros, mismo dominio que la app).

## Script completo (admin + compra de prueba)

Si además quieres que test@bearbeat.com tenga una compra del pack para probar descargas/contenido, usa el script completo:

**`supabase/FIX_TEST_USER_ADMIN_AND_PURCHASE.sql`**

Ese script hace admin + compra del pack `enero-2026` y opcionalmente el trigger para que los nuevos usuarios de Auth tengan fila en `public.users`.
