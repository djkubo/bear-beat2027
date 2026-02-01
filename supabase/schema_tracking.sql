-- =====================================================
-- TRACKING Y EVENTOS - BEAR BEAT
-- Sistema de tracking completo de acciones del usuario
-- =====================================================

-- TABLA DE EVENTOS (Tracking completo)
CREATE TABLE IF NOT EXISTS public.user_events (
  id SERIAL PRIMARY KEY,
  
  -- Identificación
  session_id VARCHAR(255),  -- Session UUID del navegador
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Evento
  event_type VARCHAR(50) NOT NULL,  -- page_view, click_cta, start_checkout, payment_intent, etc.
  event_name VARCHAR(255),  -- Nombre descriptivo del evento
  event_data JSONB,  -- Datos adicionales del evento
  
  -- Contexto
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address VARCHAR(45),
  country_code VARCHAR(2),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_session ON public.user_events(session_id);
CREATE INDEX idx_events_user ON public.user_events(user_id);
CREATE INDEX idx_events_type ON public.user_events(event_type);
CREATE INDEX idx_events_date ON public.user_events(created_at DESC);

-- TABLA DE COMPRAS PENDIENTES (Pagos sin completar datos)
CREATE TABLE IF NOT EXISTS public.pending_purchases (
  id SERIAL PRIMARY KEY,
  
  -- Identificación del pago
  stripe_session_id VARCHAR(255) UNIQUE,
  stripe_payment_intent VARCHAR(255),
  
  -- Info del pago
  pack_id INT REFERENCES public.packs(id),
  amount_paid DECIMAL(10,2),
  currency VARCHAR(3),
  payment_provider VARCHAR(20) DEFAULT 'stripe',
  
  -- Email del checkout (si proporcionó)
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  
  -- Estado
  status VARCHAR(20) DEFAULT 'awaiting_completion',  -- awaiting_completion, completed, expired
  payment_status VARCHAR(20) DEFAULT 'paid',  -- paid, failed, refunded
  
  -- Usuario asignado (cuando complete)
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  
  -- Expiración (si no completa en 24h)
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pending_stripe_session ON public.pending_purchases(stripe_session_id);
CREATE INDEX idx_pending_status ON public.pending_purchases(status);
CREATE INDEX idx_pending_email ON public.pending_purchases(customer_email);

-- COMENTARIOS
COMMENT ON TABLE user_events IS 'Tracking completo de todas las acciones del usuario';
COMMENT ON TABLE pending_purchases IS 'Pagos exitosos pendientes de completar datos del usuario';

-- FUNCIÓN: Limpiar compras pendientes expiradas (cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_pending_purchases()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE pending_purchases
  SET status = 'expired'
  WHERE status = 'awaiting_completion'
    AND expires_at < NOW();
END;
$$;

-- FUNCIÓN: Obtener journey completo de un usuario
CREATE OR REPLACE FUNCTION get_user_journey(p_user_id UUID)
RETURNS TABLE (
  event_time TIMESTAMPTZ,
  event_type VARCHAR,
  event_name VARCHAR,
  event_data JSONB,
  page_url TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    created_at,
    user_events.event_type,
    user_events.event_name,
    user_events.event_data,
    user_events.page_url
  FROM user_events
  WHERE user_id = p_user_id
  ORDER BY created_at ASC;
END;
$$;

-- FUNCIÓN: Estadísticas de conversión en el funnel
CREATE OR REPLACE FUNCTION get_funnel_stats()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'page_views', (SELECT COUNT(*) FROM user_events WHERE event_type = 'page_view' AND page_url = '/'),
    'clicked_cta', (SELECT COUNT(DISTINCT session_id) FROM user_events WHERE event_type = 'click_cta'),
    'started_checkout', (SELECT COUNT(DISTINCT session_id) FROM user_events WHERE event_type = 'start_checkout'),
    'payment_intent', (SELECT COUNT(DISTINCT session_id) FROM user_events WHERE event_type = 'payment_intent'),
    'payment_success', (SELECT COUNT(*) FROM purchases),
    'conversion_rate', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE event_type = 'payment_success')::NUMERIC / 
         NULLIF(COUNT(*) FILTER (WHERE event_type = 'page_view'), 0)) * 100,
        2
      )
      FROM user_events
    )
  ) INTO result;
  
  RETURN result;
END;
$$;
