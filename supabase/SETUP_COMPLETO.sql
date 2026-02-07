-- =====================================================
-- 🐻 BEAR BEAT - SETUP COMPLETO DE BASE DE DATOS
-- =====================================================
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
-- 2. Ve a SQL Editor
-- 3. Copia y pega TODO este archivo
-- 4. Click en "Run"
--
-- INCLUYE: users, packs, genres, videos, purchases, pending_purchases,
-- user_events, push_subscriptions, push_notifications_history, ftp_pool,
-- conversations, messages | RLS y políticas para admin | is_admin(),
-- get_admin_stats() | géneros y pack Enero 2026.
-- Si ya lo ejecutaste antes, puedes volver a ejecutarlo (idempotente).
-- =====================================================

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- gen_random_uuid() (usado en varias tablas)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- pgvector para RAG (documents.embedding)
CREATE EXTENSION IF NOT EXISTS vector;

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
-- 3b. TABLA DE VIDEOS (catálogo para listado en web / FTP)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.videos (
  id SERIAL PRIMARY KEY,
  pack_id INT REFERENCES public.packs(id) ON DELETE CASCADE,
  genre_id INT REFERENCES public.genres(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  artist VARCHAR(255),
  duration INT,
  resolution VARCHAR(20) DEFAULT '1080p',
  file_size BIGINT,
  file_path TEXT NOT NULL,
  thumbnail_url TEXT,
  preview_url TEXT,
  key VARCHAR(20),
  bpm VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_pack ON public.videos(pack_id);
CREATE INDEX IF NOT EXISTS idx_videos_genre ON public.videos(genre_id);

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
-- 6b. HISTORIAL DE DESCARGAS (tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.downloads (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  pack_id INT REFERENCES public.packs(id) ON DELETE CASCADE,
  file_path TEXT,
  download_method VARCHAR(20), -- web, ftp
  ip_address VARCHAR(45),
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_downloads_user ON public.downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_pack ON public.downloads(pack_id);
CREATE INDEX IF NOT EXISTS idx_downloads_date ON public.downloads(downloaded_at DESC);

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
-- 7b. TABLA FTP POOL (credenciales FTP para asignar a compras)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ftp_pool (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  in_use BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7c. TABLAS CHATBOT (para /admin/chatbot)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manychat_subscriber_id VARCHAR(100) UNIQUE,
  user_id UUID REFERENCES public.users(id),
  phone VARCHAR(20),
  email VARCHAR(255),
  name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  current_intent VARCHAR(100),
  sentiment VARCHAR(20),
  total_messages INTEGER DEFAULT 0,
  bot_messages INTEGER DEFAULT 0,
  human_messages INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  needs_human BOOLEAN DEFAULT FALSE,
  is_vip BOOLEAN DEFAULT FALSE,
  has_purchased BOOLEAN DEFAULT FALSE,
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  last_bot_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type VARCHAR(50) DEFAULT 'text',
  direction VARCHAR(10) NOT NULL,
  sender_type VARCHAR(20) NOT NULL,
  manychat_message_id VARCHAR(100),
  manychat_subscriber_id VARCHAR(100),
  detected_intent VARCHAR(100),
  intent_confidence DECIMAL(3,2),
  detected_entities JSONB,
  sentiment VARCHAR(20),
  language VARCHAR(10) DEFAULT 'es',
  bot_response TEXT,
  bot_action_taken VARCHAR(100),
  bot_action_result JSONB,
  response_time_ms INTEGER,
  was_helpful BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);

-- =====================================================
-- 7d. RAG (Vector Knowledge Base)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding vector(3072),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.documents IS 'Fragmentos de conocimiento para RAG del chatbot Bear Beat (text-embedding-3-large)';

CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.documents d
  WHERE d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =====================================================
-- 7e. Chat Web (Widget BearBot)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  is_bot BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON public.chat_messages(user_id);

COMMENT ON TABLE public.chat_messages IS 'Mensajes del chat web (BearBot) para historial y panel admin';

-- =====================================================
-- 7f. Cron / Marketing Automation
-- =====================================================
CREATE TABLE IF NOT EXISTS public.drop_alerts_sent (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  drop_key TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, drop_key)
);

CREATE TABLE IF NOT EXISTS public.abandoned_cart_reminders (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. FUNCIONES ÚTILES
-- =====================================================

-- Función para saber si el usuario actual es admin (usada en RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- KPIs para el panel de admin
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM public.users),
    'total_purchases', (SELECT COUNT(*) FROM public.purchases),
    'total_revenue', (SELECT COALESCE(SUM(amount_paid), 0) FROM public.purchases WHERE currency = 'MXN'),
    'users_today', (SELECT COUNT(*) FROM public.users WHERE DATE(created_at) = CURRENT_DATE),
    'purchases_today', (SELECT COUNT(*) FROM public.purchases WHERE DATE(purchased_at) = CURRENT_DATE),
    'revenue_today', (SELECT COALESCE(SUM(amount_paid), 0) FROM public.purchases WHERE DATE(purchased_at) = CURRENT_DATE AND currency = 'MXN'),
    'conversion_rate', (
      SELECT ROUND(
        (SELECT COUNT(DISTINCT user_id) FROM public.purchases)::NUMERIC
        / NULLIF((SELECT COUNT(*) FROM public.users), 0) * 100,
        2
      )
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear/actualizar perfil en public.users cuando se crea un usuario Auth (evita inserts inseguros desde el cliente)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name TEXT;
  phone_text TEXT;
  country_code_text TEXT;
BEGIN
  display_name := NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data->>'name', '')), '');
  phone_text := NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  country_code_text := NULLIF(UPPER(BTRIM(COALESCE(NEW.raw_user_meta_data->>'country_code', ''))), '');
  IF country_code_text IS NOT NULL AND LENGTH(country_code_text) <> 2 THEN
    country_code_text := NULL;
  END IF;

  INSERT INTO public.users (id, email, name, phone, country_code, created_at, updated_at)
  VALUES (NEW.id, NEW.email, display_name, phone_text, country_code_text, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, public.users.name),
      phone = COALESCE(EXCLUDED.phone, public.users.phone),
      country_code = COALESCE(EXCLUDED.country_code, public.users.country_code),
      updated_at = NOW();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

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
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ftp_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE drop_alerts_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE abandoned_cart_reminders ENABLE ROW LEVEL SECURITY;

-- Políticas para users (usuario ve su perfil; admin ve todos)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT TO authenticated
  USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can do everything on users" ON users;
CREATE POLICY "Service role can do everything on users"
  ON users FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Políticas para purchases (usuario ve sus compras; admin ve todas)
DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
CREATE POLICY "Users can view own purchases"
  ON purchases FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all purchases" ON purchases;
CREATE POLICY "Admins can view all purchases"
  ON purchases FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Service role can do everything on purchases" ON purchases;
CREATE POLICY "Service role can do everything on purchases"
  ON purchases FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- pending_purchases (checkout inserta/actualiza; admin lee; service role todo)
DROP POLICY IF EXISTS "Allow insert pending_purchases" ON pending_purchases;
DROP POLICY IF EXISTS "Allow update pending_purchases" ON pending_purchases;

DROP POLICY IF EXISTS "Admins can view pending purchases" ON pending_purchases;
CREATE POLICY "Admins can view pending purchases"
  ON pending_purchases FOR SELECT TO authenticated
  USING (public.is_admin());
DROP POLICY IF EXISTS "Service role can do everything on pending_purchases" ON pending_purchases;
CREATE POLICY "Service role can do everything on pending_purchases"
  ON pending_purchases FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- user_events (cualquiera puede insertar para tracking; admin puede leer)
DROP POLICY IF EXISTS "Allow insert user_events" ON user_events;
CREATE POLICY "Allow insert user_events"
  ON user_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can view user_events" ON user_events;
CREATE POLICY "Admins can view user_events"
  ON user_events FOR SELECT TO authenticated
  USING (public.is_admin());
DROP POLICY IF EXISTS "Service role can do everything on user_events" ON user_events;
CREATE POLICY "Service role can do everything on user_events"
  ON user_events FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- push_notifications_history (admin puede leer; service role todo)
DROP POLICY IF EXISTS "Admins can view push history" ON push_notifications_history;
CREATE POLICY "Admins can view push history"
  ON push_notifications_history FOR SELECT TO authenticated
  USING (public.is_admin());
DROP POLICY IF EXISTS "Service role can do everything on push_notifications_history" ON push_notifications_history;
CREATE POLICY "Service role can do everything on push_notifications_history"
  ON push_notifications_history FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ftp_pool: sin política para anon (solo el backend con service role puede acceder; service role bypasses RLS)

-- conversations y messages (admin puede leer para /admin/chatbot)
DROP POLICY IF EXISTS "Admins can view conversations" ON conversations;
CREATE POLICY "Admins can view conversations"
  ON conversations FOR SELECT TO authenticated
  USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can view messages" ON messages;
CREATE POLICY "Admins can view messages"
  ON messages FOR SELECT TO authenticated
  USING (public.is_admin());
DROP POLICY IF EXISTS "Service role can do everything on conversations" ON conversations;
CREATE POLICY "Service role can do everything on conversations"
  ON conversations FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Service role can do everything on messages" ON messages;
CREATE POLICY "Service role can do everything on messages"
  ON messages FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Políticas para packs (público)
DROP POLICY IF EXISTS "Public can view available packs" ON packs;
CREATE POLICY "Public can view available packs" ON packs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can do everything on packs" ON packs;
CREATE POLICY "Service role can do everything on packs"
  ON packs FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Políticas para genres y videos (lectura pública para listado en web)
DROP POLICY IF EXISTS "Public can view genres" ON genres;
CREATE POLICY "Public can view genres" ON genres FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can view videos" ON videos;
CREATE POLICY "Public can view videos" ON videos FOR SELECT USING (true);

-- Políticas para push
DROP POLICY IF EXISTS "Anyone can subscribe to push" ON push_subscriptions;
CREATE POLICY "Anyone can subscribe to push"
  ON push_subscriptions FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can do everything on push" ON push_subscriptions;
CREATE POLICY "Service role can do everything on push"
  ON push_subscriptions FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- downloads (usuarios ven/insertan solo sus descargas; admin ve todo)
DROP POLICY IF EXISTS "Users can view own downloads" ON downloads;
CREATE POLICY "Users can view own downloads"
  ON downloads FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own downloads" ON downloads;
CREATE POLICY "Users can insert own downloads"
  ON downloads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view downloads" ON downloads;
CREATE POLICY "Admins can view downloads"
  ON downloads FOR SELECT TO authenticated
  USING (public.is_admin());
DROP POLICY IF EXISTS "Service role can do everything on downloads" ON downloads;
CREATE POLICY "Service role can do everything on downloads"
  ON downloads FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- documents (solo admin/service_role; match_documents expone fragments vía SECURITY DEFINER)
DROP POLICY IF EXISTS "Admins can manage documents" ON documents;
CREATE POLICY "Admins can manage documents"
  ON documents FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Service role can do everything on documents" ON documents;
CREATE POLICY "Service role can do everything on documents"
  ON documents FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- chat_messages (insert público; solo admin lee)
DROP POLICY IF EXISTS "Allow insert chat_messages" ON chat_messages;
CREATE POLICY "Allow insert chat_messages"
  ON chat_messages FOR INSERT TO anon, authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can read chat_messages" ON chat_messages;
CREATE POLICY "Admin can read chat_messages"
  ON chat_messages FOR SELECT TO authenticated
  USING (public.is_admin());
DROP POLICY IF EXISTS "Service role can do everything on chat_messages" ON chat_messages;
CREATE POLICY "Service role can do everything on chat_messages"
  ON chat_messages FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Cron tables (solo backend; admin lectura opcional)
DROP POLICY IF EXISTS "Admins can view drop_alerts_sent" ON drop_alerts_sent;
CREATE POLICY "Admins can view drop_alerts_sent"
  ON drop_alerts_sent FOR SELECT TO authenticated
  USING (public.is_admin());
DROP POLICY IF EXISTS "Service role can do everything on drop_alerts_sent" ON drop_alerts_sent;
CREATE POLICY "Service role can do everything on drop_alerts_sent"
  ON drop_alerts_sent FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view abandoned_cart_reminders" ON abandoned_cart_reminders;
CREATE POLICY "Admins can view abandoned_cart_reminders"
  ON abandoned_cart_reminders FOR SELECT TO authenticated
  USING (public.is_admin());
DROP POLICY IF EXISTS "Service role can do everything on abandoned_cart_reminders" ON abandoned_cart_reminders;
CREATE POLICY "Service role can do everything on abandoned_cart_reminders"
  ON abandoned_cart_reminders FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

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
