-- =====================================================
-- HACER ADMIN a test@bearbeat.com (solo rol, sin compras)
-- =====================================================
-- Ejecutar en Supabase: Dashboard > SQL Editor > New query > Pegar > Run
--
-- Requisito: El usuario test@bearbeat.com debe existir en Auth.
-- Si no existe: Authentication > Users > Add user (email: test@bearbeat.com + contraseña).
-- =====================================================

-- 1) Crear/actualizar fila en public.users con role = admin
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

-- 2) Comprobar: debe devolver una fila con role = 'admin'
SELECT id, email, role, updated_at
FROM public.users
WHERE email = 'test@bearbeat.com';
