-- =====================================================
-- 🐻 BEAR BEAT - SETUP COMPLETO DE BASE DE DATOS
-- =====================================================
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
-- 2. Ve a SQL Editor
-- 3. Copia y pega TODO este archivo
-- 4. Click en "Run"
-- =====================================================

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TABLA DE USUARIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  country_code VARCHAR(2) DEFAULT 'MX',
  role VARCHAR(20) DEFAULT 'user',
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  first_utm_source VARCHAR(100),
  first_utm_medium VARCHAR(100),
  first_utm_campaign VARCHAR(255),
  first_landing_page VARCHAR(500),
  first_referrer VARCHAR(500),
  device_type VARCHAR(20),
  signup_source VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- =====================================================
-- 2. TABLA DE PACKS (Productos)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.packs (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_mxn DECIMAL(10,2) DEFAULT 350.00,
  price_usd DECIMAL(10,2) DEFAULT 19.00,
  release_month VARCHAR(7) NOT NULL,
  release_date DATE,
  total_videos INT DEFAULT 0,
  total_size_gb DECIMAL(10,2) DEFAULT 0,
  cover_image_url TEXT,
  r2_folder_path VARCHAR(255),
  ftp_folder_path VARCHAR(255),
  status VARCHAR(20) DEFAULT 'draft',
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packs_status ON public.packs(status);
CREATE INDEX IF NOT EXISTS idx_packs_slug ON public.packs(slug);

-- =====================================================
-- 3. TABLA DE GÉNEROS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.genres (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  video_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. TABLA DE COMPRAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.purchases (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  pack_id INT REFERENCES public.packs(id) ON DELETE CASCADE,
  amount_paid DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MXN',
  payment_provider VARCHAR(20),
  payment_id VARCHAR(255),
  was_bundle BOOLEAN DEFAULT FALSE,
  bundle_id INT,
  discount_applied DECIMAL(10,2) DEFAULT 0,
  ftp_username VARCHAR(100),
  ftp_password VARCHAR(255),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(255),
  traffic_source VARCHAR(100),
  is_ad_traffic BOOLEAN DEFAULT FALSE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pack_id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_pack ON public.purchases(pack_id);

-- =====================================================
-- 5. TABLA DE COMPRAS PENDIENTES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pending_purchases (
  id SERIAL PRIMARY KEY,
  stripe_session_id VARCHAR(255) UNIQUE,
  stripe_payment_intent VARCHAR(255),
  pack_id INT REFERENCES public.packs(id),
  amount_paid DECIMAL(10,2),
  currency VARCHAR(3),
  payment_provider VARCHAR(20) DEFAULT 'stripe',
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'awaiting_completion',
  payment_status VARCHAR(20) DEFAULT 'paid',
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_stripe_session ON public.pending_purchases(stripe_session_id);

-- =====================================================
-- 6. TABLA DE EVENTOS (Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_events (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  event_name VARCHAR(255),
  event_data JSONB,
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address VARCHAR(45),
  country_code VARCHAR(2),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),
  fbclid VARCHAR(255),
  gclid VARCHAR(255),
  ttclid VARCHAR(255),
  device_type VARCHAR(20),
  browser VARCHAR(50),
  os VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_session ON public.user_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_user ON public.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.user_events(event_type);

-- =====================================================
-- 7. TABLA DE PUSH NOTIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT UNIQUE NOT NULL,
  keys JSONB NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_agent TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(active);

CREATE TABLE IF NOT EXISTS public.push_notifications_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  icon TEXT,
  target TEXT DEFAULT 'all',
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  sent_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. FUNCIONES ÚTILES
-- =====================================================

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_packs_updated_at ON packs;
CREATE TRIGGER update_packs_updated_at BEFORE UPDATE ON packs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas para users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can do everything on users" ON users;
CREATE POLICY "Service role can do everything on users" ON users FOR ALL USING (true);

-- Políticas para purchases
DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
CREATE POLICY "Users can view own purchases" ON purchases FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can do everything on purchases" ON purchases;
CREATE POLICY "Service role can do everything on purchases" ON purchases FOR ALL USING (true);

-- Políticas para packs (público)
DROP POLICY IF EXISTS "Public can view available packs" ON packs;
CREATE POLICY "Public can view available packs" ON packs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can do everything on packs" ON packs;
CREATE POLICY "Service role can do everything on packs" ON packs FOR ALL USING (true);

-- Políticas para push
DROP POLICY IF EXISTS "Anyone can subscribe to push" ON push_subscriptions;
CREATE POLICY "Anyone can subscribe to push" ON push_subscriptions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can do everything on push" ON push_subscriptions;
CREATE POLICY "Service role can do everything on push" ON push_subscriptions FOR ALL USING (true);

-- =====================================================
-- 10. DATOS INICIALES
-- =====================================================

-- Insertar géneros
INSERT INTO genres (name, slug, video_count) VALUES
('Reggaeton', 'reggaeton', 450),
('EDM', 'edm', 380),
('Hip Hop', 'hip-hop', 420),
('Pop', 'pop', 390),
('Rock', 'rock', 280),
('Electro House', 'electro-house', 350),
('Banda', 'banda', 220),
('Cumbia', 'cumbia', 180),
('Latin', 'latin', 300),
('House', 'house', 250),
('Trap', 'trap', 310),
('Salsa', 'salsa', 160)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 🎁 PACK DE PRUEBA (ENERO 2026)
-- =====================================================
-- Pack Enero 2026 (compatible con unique(slug) o unique(release_month))
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM packs WHERE release_month = '2026-01') THEN
    UPDATE packs SET slug = 'enero-2026', name = 'Pack Enero 2026', description = 'Más de 3,000 videos HD/4K organizados por género. Lo mejor para arrancar el año con tu colección de DJ.', price_mxn = 350.00, price_usd = 19.00, release_date = '2026-01-01', total_videos = 3000, total_size_gb = 500, status = 'available', featured = true WHERE release_month = '2026-01';
  ELSIF EXISTS (SELECT 1 FROM packs WHERE slug = 'enero-2026') THEN
    UPDATE packs SET name = 'Pack Enero 2026', description = 'Más de 3,000 videos HD/4K organizados por género. Lo mejor para arrancar el año con tu colección de DJ.', price_mxn = 350.00, price_usd = 19.00, release_date = '2026-01-01', total_videos = 3000, total_size_gb = 500, status = 'available', featured = true WHERE slug = 'enero-2026';
  ELSE
    INSERT INTO packs (slug, name, description, price_mxn, price_usd, release_month, release_date, total_videos, total_size_gb, status, featured)
    VALUES ('enero-2026', 'Pack Enero 2026', 'Más de 3,000 videos HD/4K organizados por género. Lo mejor para arrancar el año con tu colección de DJ.', 350.00, 19.00, '2026-01', '2026-01-01', 3000, 500, 'available', true);
  END IF;
END $$;

-- =====================================================
-- ✅ SETUP COMPLETO
-- =====================================================
-- Ahora ve a Authentication > Users en Supabase
-- Y crea tu usuario de prueba manualmente
-- =====================================================
