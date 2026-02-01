-- CREAR TODO DESDE CERO
-- Este SQL crea TODO lo que necesitas sin importar qué exista

-- 1. ELIMINAR PACK VIEJO (si existe)
DELETE FROM packs WHERE slug = 'enero-2026';

-- 2. CREAR PACK ENERO 2026 NUEVO
INSERT INTO packs (slug, name, description, price_mxn, price_usd, release_month, is_active)
VALUES (
  'enero-2026',
  'Pack Enero 2026',
  'Video Remixes para DJs - Enero 2026',
  350.00,
  19.00,
  '2026-01',
  true
);

-- 3. VER EL ID DEL PACK RECIEN CREADO
SELECT id, slug, name, price_mxn FROM packs WHERE slug = 'enero-2026';

-- 4. CREAR TU PERFIL (si no existe ya)
INSERT INTO users (id, email, name, role)
VALUES (
  '462f9e64-1f5b-47f6-8d10-4a2fbdbcb243',
  'test@bearbeat.com',
  'Test User Admin',
  'admin'
)
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', name = 'Test User Admin';

-- 5. CREAR TU COMPRA
-- IMPORTANTE: Reemplaza X con el ID del pack que te mostró el paso 3
INSERT INTO purchases (user_id, pack_id, amount_paid, currency, payment_method, payment_status)
VALUES (
  '462f9e64-1f5b-47f6-8d10-4a2fbdbcb243',
  1,
  350.00,
  'MXN',
  'setup',
  'completed'
);

-- 6. VERIFICACION FINAL
SELECT 'CONFIGURACION COMPLETA' as resultado;

SELECT 
  u.id,
  u.email,
  u.role,
  COUNT(p.id) as compras,
  SUM(p.amount_paid) as total_gastado
FROM users u
LEFT JOIN purchases p ON u.id = p.user_id
WHERE u.email = 'test@bearbeat.com'
GROUP BY u.id, u.email, u.role;

-- Ver tus compras
SELECT 
  p.id,
  p.amount_paid,
  pk.name as pack,
  p.purchased_at
FROM purchases p
LEFT JOIN packs pk ON p.pack_id = pk.id
WHERE p.user_id = '462f9e64-1f5b-47f6-8d10-4a2fbdbcb243';
