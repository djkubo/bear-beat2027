-- =====================================================
-- SCHEMA DE BASE DE DATOS - VIDEO REMIXES DJ 2026
-- Modelo de Packs Mensuales
-- =====================================================

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USUARIOS
-- =====================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),  -- Formato E.164: +525512345678
  country_code VARCHAR(2) DEFAULT 'MX',
  role VARCHAR(20) DEFAULT 'user',  -- 'user', 'admin'
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_phone ON public.users(phone);
CREATE INDEX idx_users_role ON public.users(role);

-- =====================================================
-- PACKS (Productos mensuales)
-- =====================================================
CREATE TABLE public.packs (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Precios
  price_mxn DECIMAL(10,2) DEFAULT 350.00,
  price_usd DECIMAL(10,2) DEFAULT 18.00,
  
  -- Fecha de lanzamiento
  release_month VARCHAR(7) NOT NULL,  -- '2026-01'
  release_date DATE,
  
  -- Contenido
  total_videos INT DEFAULT 0,
  total_size_gb DECIMAL(10,2) DEFAULT 0,
  cover_image_url TEXT,
  
  -- Paths de almacenamiento
  r2_folder_path VARCHAR(255),
  ftp_folder_path VARCHAR(255),
  
  -- Estado
  status VARCHAR(20) DEFAULT 'draft',  -- draft, upcoming, available, archived
  featured BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_month UNIQUE(release_month)
);

CREATE INDEX idx_packs_status ON public.packs(status);
CREATE INDEX idx_packs_month ON public.packs(release_month DESC);
CREATE INDEX idx_packs_featured ON public.packs(featured) WHERE featured = true;

-- =====================================================
-- COMPRAS
-- =====================================================
CREATE TABLE public.purchases (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  pack_id INT REFERENCES public.packs(id) ON DELETE CASCADE,
  
  -- Información de pago
  amount_paid DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MXN',
  payment_provider VARCHAR(20),  -- stripe, paypal, conekta
  payment_id VARCHAR(255),
  
  -- Descuentos/bundles
  was_bundle BOOLEAN DEFAULT FALSE,
  bundle_id INT,
  discount_applied DECIMAL(10,2) DEFAULT 0,
  
  -- Acceso FTP
  ftp_username VARCHAR(100),
  ftp_password VARCHAR(255),
  
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, pack_id)
);

CREATE INDEX idx_purchases_user ON public.purchases(user_id);
CREATE INDEX idx_purchases_pack ON public.purchases(pack_id);
CREATE INDEX idx_purchases_date ON public.purchases(purchased_at DESC);

-- =====================================================
-- GÉNEROS
-- =====================================================
CREATE TABLE public.genres (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  video_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_genres_slug ON public.genres(slug);

-- =====================================================
-- VIDEOS
-- =====================================================
CREATE TABLE public.videos (
  id SERIAL PRIMARY KEY,
  pack_id INT REFERENCES public.packs(id) ON DELETE CASCADE,
  genre_id INT REFERENCES public.genres(id),
  
  title VARCHAR(500) NOT NULL,
  artist VARCHAR(255),
  duration INT,  -- segundos
  resolution VARCHAR(20) DEFAULT '1080p',  -- 1080p, 4K
  file_size BIGINT,  -- bytes
  file_path TEXT NOT NULL,
  thumbnail_url TEXT,
  preview_url TEXT,  -- preview 30s
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_videos_pack ON public.videos(pack_id);
CREATE INDEX idx_videos_genre ON public.videos(genre_id);
CREATE INDEX idx_videos_title ON public.videos USING gin(to_tsvector('spanish', title));

-- =====================================================
-- BUNDLES (Ofertas de múltiples packs)
-- =====================================================
CREATE TABLE public.bundles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Precios
  regular_price DECIMAL(10,2),
  bundle_price DECIMAL(10,2),
  savings DECIMAL(10,2),
  
  -- Packs incluidos
  pack_ids INT[],
  required_packs INT DEFAULT 3,
  
  -- Vigencia
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- NOTIFICACIONES
-- =====================================================
CREATE TABLE public.pack_notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  notify_on_new_pack BOOLEAN DEFAULT TRUE,
  notify_via_email BOOLEAN DEFAULT TRUE,
  notify_via_whatsapp BOOLEAN DEFAULT FALSE,
  notify_via_sms BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.notification_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  pack_id INT REFERENCES public.packs(id) ON DELETE CASCADE,
  notification_type VARCHAR(20),  -- new_pack, bundle_offer
  sent_via VARCHAR(20),  -- email, whatsapp, sms
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_history_user ON public.notification_history(user_id);
CREATE INDEX idx_notification_history_date ON public.notification_history(sent_at DESC);

-- =====================================================
-- HISTORIAL DE DESCARGAS (tracking)
-- =====================================================
CREATE TABLE public.downloads (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  pack_id INT REFERENCES public.packs(id) ON DELETE CASCADE,
  video_id INT REFERENCES public.videos(id) ON DELETE SET NULL,
  file_path TEXT,
  file_size BIGINT,
  download_method VARCHAR(20),  -- web, ftp
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_downloads_user ON public.downloads(user_id);
CREATE INDEX idx_downloads_pack ON public.downloads(pack_id);
CREATE INDEX idx_downloads_date ON public.downloads(downloaded_at DESC);

-- =====================================================
-- FUNCIONES RPC
-- =====================================================

-- Función: Obtener estadísticas de admin
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM users),
    'total_purchases', (SELECT COUNT(*) FROM purchases),
    'total_revenue', (SELECT SUM(amount_paid) FROM purchases WHERE currency = 'MXN'),
    'users_today', (SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURRENT_DATE),
    'purchases_today', (SELECT COUNT(*) FROM purchases WHERE DATE(purchased_at) = CURRENT_DATE),
    'revenue_today', (SELECT COALESCE(SUM(amount_paid), 0) FROM purchases WHERE DATE(purchased_at) = CURRENT_DATE AND currency = 'MXN'),
    'conversion_rate', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE purchased_at IS NOT NULL)::NUMERIC / NULLIF(COUNT(DISTINCT user_id), 0)) * 100,
        2
      )
      FROM users u
      LEFT JOIN purchases p ON u.id = p.user_id
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Función: Actualizar contador de videos por género
CREATE OR REPLACE FUNCTION update_genre_video_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE genres SET video_count = video_count + 1 WHERE id = NEW.genre_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE genres SET video_count = video_count - 1 WHERE id = OLD.genre_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.genre_id != OLD.genre_id THEN
    UPDATE genres SET video_count = video_count - 1 WHERE id = OLD.genre_id;
    UPDATE genres SET video_count = video_count + 1 WHERE id = NEW.genre_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_genre_count
AFTER INSERT OR UPDATE OR DELETE ON videos
FOR EACH ROW
EXECUTE FUNCTION update_genre_video_count();

-- Función: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packs_updated_at BEFORE UPDATE ON packs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Políticas para purchases
CREATE POLICY "Users can view own purchases"
ON purchases FOR SELECT
USING (auth.uid() = user_id);

-- Políticas para pack_notifications
CREATE POLICY "Users can manage own notifications"
ON pack_notifications FOR ALL
USING (auth.uid() = user_id);

-- Políticas para downloads
CREATE POLICY "Users can view own downloads"
ON downloads FOR SELECT
USING (auth.uid() = user_id);

-- Políticas públicas (sin autenticación)
CREATE POLICY "Public can view available packs"
ON packs FOR SELECT
USING (status = 'available');

CREATE POLICY "Public can view genres"
ON genres FOR SELECT
USING (true);

CREATE POLICY "Public can view active bundles"
ON bundles FOR SELECT
USING (active = true AND valid_until > NOW());

-- =====================================================
-- DATOS DE EJEMPLO (SEEDS)
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

-- Insertar usuario admin de ejemplo (IMPORTANTE: Cambiar email y password)
-- Este usuario se debe crear manualmente en Supabase Auth primero
-- Luego ejecutar este INSERT con el mismo ID
-- 
-- INSTRUCCIONES:
-- 1. Ir a Authentication > Users en Supabase Dashboard
-- 2. Crear un usuario con email: admin@bearbeat.com
-- 3. Copiar el UUID del usuario
-- 4. Ejecutar este INSERT con ese UUID:
--
-- INSERT INTO users (id, email, name, role) VALUES
-- ('TU-UUID-AQUI', 'admin@bearbeat.com', 'Administrador', 'admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Insertar pack de ejemplo (Enero 2026)
INSERT INTO packs (
  slug, name, description,
  price_mxn, price_usd,
  release_month, release_date,
  total_videos, total_size_gb,
  status, featured
) VALUES (
  'pack-enero-2026',
  'Pack Enero 2026',
  'Más de 3,000 videos HD/4K organizados por género. Lo mejor para arrancar el año con tu colección de DJ.',
  350.00, 18.00,
  '2026-01', '2026-01-01',
  3000, 500,
  'available', true
)
ON CONFLICT (slug) DO NOTHING;

-- Insertar bundle de ejemplo
INSERT INTO bundles (
  name, description,
  regular_price, bundle_price, savings,
  required_packs,
  valid_from, valid_until,
  active
) VALUES (
  '3 Packs por $900',
  'Compra 3 packs y ahorra $150. Oferta por tiempo limitado.',
  1050.00, 900.00, 150.00,
  3,
  NOW(), NOW() + INTERVAL '30 days',
  true
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON TABLE packs IS 'Packs mensuales de video remixes';
COMMENT ON TABLE purchases IS 'Historial de compras de usuarios';
COMMENT ON TABLE videos IS 'Videos individuales dentro de cada pack';
COMMENT ON TABLE bundles IS 'Ofertas de múltiples packs con descuento';
