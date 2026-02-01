-- =====================================================
-- FIJAR test@bearbeat.com: ADMIN + COMPRA (para probar)
-- =====================================================
-- Ejecutar en Supabase: SQL Editor > Pegar > Run
--
-- 1) Sincroniza el usuario de Auth a public.users y le da role admin.
-- 2) Le asigna una compra del pack enero-2026 para poder descargar.
--
-- Si test@bearbeat.com no existe en Auth, créalo antes en:
-- Authentication > Users > Add user (email + password).
-- =====================================================

-- Sincronizar auth.users → public.users y poner role = admin
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

-- Darle compra del pack enero-2026 (para descargas y contenido)
INSERT INTO public.purchases (user_id, pack_id, amount_paid, currency, payment_provider)
SELECT u.id, p.id, 350, 'MXN', 'manual'
FROM public.users u
CROSS JOIN public.packs p
WHERE u.email = 'test@bearbeat.com' AND p.slug = 'enero-2026'
ON CONFLICT (user_id, pack_id) DO NOTHING;

-- Comprobar
SELECT u.id, u.email, u.role, (SELECT COUNT(*) FROM public.purchases WHERE user_id = u.id) AS purchases
FROM public.users u
WHERE u.email = 'test@bearbeat.com';

-- =====================================================
-- OPCIONAL: Trigger para que futuros usuarios de Auth
-- tengan fila en public.users (evita "no admin" / no compra)
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();
