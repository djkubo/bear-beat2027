-- ================================================
-- SCHEMA DE ATRIBUCIÓN - Bear Beat
-- Ejecutar en Supabase SQL Editor
-- ================================================

-- Agregar campos de atribución a user_events
ALTER TABLE user_events 
ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(255),
ADD COLUMN IF NOT EXISTS utm_content VARCHAR(255),
ADD COLUMN IF NOT EXISTS utm_term VARCHAR(255),
ADD COLUMN IF NOT EXISTS fbclid VARCHAR(255),
ADD COLUMN IF NOT EXISTS gclid VARCHAR(255),
ADD COLUMN IF NOT EXISTS ttclid VARCHAR(255),
ADD COLUMN IF NOT EXISTS device_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS browser VARCHAR(50),
ADD COLUMN IF NOT EXISTS os VARCHAR(50);

-- Crear índices para queries de atribución
CREATE INDEX IF NOT EXISTS idx_user_events_utm_source ON user_events(utm_source);
CREATE INDEX IF NOT EXISTS idx_user_events_utm_medium ON user_events(utm_medium);
CREATE INDEX IF NOT EXISTS idx_user_events_utm_campaign ON user_events(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_user_events_device_type ON user_events(device_type);

-- Agregar campos de atribución a users para guardar primera fuente
ALTER TABLE users
ADD COLUMN IF NOT EXISTS first_utm_source VARCHAR(100),
ADD COLUMN IF NOT EXISTS first_utm_medium VARCHAR(100),
ADD COLUMN IF NOT EXISTS first_utm_campaign VARCHAR(255),
ADD COLUMN IF NOT EXISTS first_landing_page VARCHAR(500),
ADD COLUMN IF NOT EXISTS first_referrer VARCHAR(500),
ADD COLUMN IF NOT EXISTS device_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS signup_source VARCHAR(100);

-- Agregar campos de atribución a purchases
ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(255),
ADD COLUMN IF NOT EXISTS traffic_source VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_ad_traffic BOOLEAN DEFAULT FALSE;

-- Crear índice para purchases por fuente
CREATE INDEX IF NOT EXISTS idx_purchases_utm_source ON purchases(utm_source);
CREATE INDEX IF NOT EXISTS idx_purchases_traffic_source ON purchases(traffic_source);

-- ================================================
-- FUNCIONES PARA ANALYTICS DE ATRIBUCIÓN
-- ================================================

-- Obtener estadísticas por fuente de tráfico
CREATE OR REPLACE FUNCTION get_traffic_stats(days_ago INTEGER DEFAULT 30)
RETURNS TABLE (
  source TEXT,
  medium TEXT,
  visits BIGINT,
  unique_sessions BIGINT,
  conversions BIGINT,
  revenue NUMERIC,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(e.utm_source, 'direct') as source,
    COALESCE(e.utm_medium, 'none') as medium,
    COUNT(*) as visits,
    COUNT(DISTINCT e.session_id) as unique_sessions,
    COUNT(DISTINCT CASE WHEN e.event_type = 'payment_success' THEN e.session_id END) as conversions,
    COALESCE(SUM(CASE WHEN e.event_type = 'payment_success' THEN (e.event_data->>'amount')::NUMERIC END), 0) as revenue,
    ROUND(
      COUNT(DISTINCT CASE WHEN e.event_type = 'payment_success' THEN e.session_id END)::NUMERIC / 
      NULLIF(COUNT(DISTINCT e.session_id), 0) * 100, 
      2
    ) as conversion_rate
  FROM user_events e
  WHERE e.created_at >= NOW() - (days_ago || ' days')::INTERVAL
  GROUP BY COALESCE(e.utm_source, 'direct'), COALESCE(e.utm_medium, 'none')
  ORDER BY visits DESC;
END;
$$ LANGUAGE plpgsql;

-- Obtener top campañas
CREATE OR REPLACE FUNCTION get_top_campaigns(days_ago INTEGER DEFAULT 30, limit_rows INTEGER DEFAULT 10)
RETURNS TABLE (
  campaign TEXT,
  source TEXT,
  medium TEXT,
  visits BIGINT,
  conversions BIGINT,
  revenue NUMERIC,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.utm_campaign as campaign,
    COALESCE(e.utm_source, 'direct') as source,
    COALESCE(e.utm_medium, 'none') as medium,
    COUNT(*) as visits,
    COUNT(DISTINCT CASE WHEN e.event_type = 'payment_success' THEN e.session_id END) as conversions,
    COALESCE(SUM(CASE WHEN e.event_type = 'payment_success' THEN (e.event_data->>'amount')::NUMERIC END), 0) as revenue,
    ROUND(
      COUNT(DISTINCT CASE WHEN e.event_type = 'payment_success' THEN e.session_id END)::NUMERIC / 
      NULLIF(COUNT(DISTINCT e.session_id), 0) * 100, 
      2
    ) as conversion_rate
  FROM user_events e
  WHERE e.created_at >= NOW() - (days_ago || ' days')::INTERVAL
    AND e.utm_campaign IS NOT NULL
  GROUP BY e.utm_campaign, COALESCE(e.utm_source, 'direct'), COALESCE(e.utm_medium, 'none')
  ORDER BY conversions DESC, visits DESC
  LIMIT limit_rows;
END;
$$ LANGUAGE plpgsql;

-- Obtener journey de un usuario (todas sus sesiones y fuentes)
CREATE OR REPLACE FUNCTION get_user_journey(p_user_id UUID)
RETURNS TABLE (
  visit_date TIMESTAMPTZ,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  landing_page TEXT,
  events_count BIGINT,
  converted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    MIN(e.created_at) as visit_date,
    COALESCE(e.utm_source, 'direct') as source,
    COALESCE(e.utm_medium, 'none') as medium,
    e.utm_campaign as campaign,
    MIN(e.page_url) as landing_page,
    COUNT(*) as events_count,
    BOOL_OR(e.event_type = 'payment_success') as converted
  FROM user_events e
  WHERE e.user_id = p_user_id OR e.session_id IN (
    SELECT DISTINCT session_id FROM user_events WHERE user_id = p_user_id
  )
  GROUP BY e.session_id, COALESCE(e.utm_source, 'direct'), COALESCE(e.utm_medium, 'none'), e.utm_campaign
  ORDER BY visit_date;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- VISTA PARA DASHBOARD DE ATRIBUCIÓN
-- ================================================

CREATE OR REPLACE VIEW v_attribution_dashboard AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  COALESCE(utm_source, 'direct') as source,
  COALESCE(utm_medium, 'none') as medium,
  COUNT(*) as total_events,
  COUNT(DISTINCT session_id) as unique_visitors,
  COUNT(DISTINCT CASE WHEN event_type = 'click_cta' THEN session_id END) as cta_clicks,
  COUNT(DISTINCT CASE WHEN event_type = 'start_checkout' THEN session_id END) as checkouts_started,
  COUNT(DISTINCT CASE WHEN event_type = 'payment_success' THEN session_id END) as purchases,
  COALESCE(SUM(CASE WHEN event_type = 'payment_success' THEN (event_data->>'amount')::NUMERIC END), 0) as revenue
FROM user_events
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at), COALESCE(utm_source, 'direct'), COALESCE(utm_medium, 'none');

-- ================================================
-- COMENTARIOS
-- ================================================

COMMENT ON COLUMN user_events.utm_source IS 'Fuente de tráfico: facebook, google, tiktok, direct, etc.';
COMMENT ON COLUMN user_events.utm_medium IS 'Medio: cpc, social, organic, email, referral, etc.';
COMMENT ON COLUMN user_events.utm_campaign IS 'Nombre de la campaña de marketing';
COMMENT ON COLUMN user_events.fbclid IS 'Facebook Click ID para atribución';
COMMENT ON COLUMN user_events.gclid IS 'Google Click ID para atribución';
COMMENT ON COLUMN user_events.ttclid IS 'TikTok Click ID para atribución';
