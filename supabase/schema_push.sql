-- ==========================================
-- SCHEMA: Push Notifications
-- Tablas para almacenar suscripciones push
-- ==========================================

-- Tabla de suscripciones push
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT UNIQUE NOT NULL,
  keys JSONB NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_agent TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(active);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Historial de notificaciones enviadas
CREATE TABLE IF NOT EXISTS push_notifications_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  icon TEXT,
  target TEXT DEFAULT 'all', -- 'all', 'users', 'anonymous'
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  sent_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_push_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscription_updated_at();

-- RLS Policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications_history ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede crear su suscripción
CREATE POLICY "Anyone can subscribe to push"
  ON push_subscriptions FOR INSERT
  WITH CHECK (true);

-- Política: Solo el usuario o admin puede ver/editar su suscripción
CREATE POLICY "Users can manage own subscription"
  ON push_subscriptions FOR ALL
  USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Política: Solo admins pueden ver historial
CREATE POLICY "Only admins can view notification history"
  ON push_notifications_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Política: Solo admins pueden crear historial
CREATE POLICY "Only admins can create notification history"
  ON push_notifications_history FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ==========================================
-- Función para limpiar suscripciones inactivas
-- ==========================================
CREATE OR REPLACE FUNCTION cleanup_inactive_push_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM push_subscriptions
  WHERE active = false AND updated_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Estadísticas de push
-- ==========================================
CREATE OR REPLACE FUNCTION get_push_stats()
RETURNS TABLE (
  total_subscriptions BIGINT,
  active_subscriptions BIGINT,
  subscriptions_with_user BIGINT,
  anonymous_subscriptions BIGINT,
  notifications_sent_today BIGINT,
  notifications_sent_week BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM push_subscriptions)::BIGINT as total_subscriptions,
    (SELECT COUNT(*) FROM push_subscriptions WHERE active = true)::BIGINT as active_subscriptions,
    (SELECT COUNT(*) FROM push_subscriptions WHERE active = true AND user_id IS NOT NULL)::BIGINT as subscriptions_with_user,
    (SELECT COUNT(*) FROM push_subscriptions WHERE active = true AND user_id IS NULL)::BIGINT as anonymous_subscriptions,
    (SELECT COALESCE(SUM(sent_count), 0) FROM push_notifications_history WHERE created_at > NOW() - INTERVAL '1 day')::BIGINT as notifications_sent_today,
    (SELECT COALESCE(SUM(sent_count), 0) FROM push_notifications_history WHERE created_at > NOW() - INTERVAL '7 days')::BIGINT as notifications_sent_week;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Comentarios
-- ==========================================
COMMENT ON TABLE push_subscriptions IS 'Suscripciones a notificaciones push del navegador';
COMMENT ON TABLE push_notifications_history IS 'Historial de notificaciones push enviadas';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'URL único del endpoint de push del navegador';
COMMENT ON COLUMN push_subscriptions.keys IS 'Claves de encriptación para web push (p256dh, auth)';
