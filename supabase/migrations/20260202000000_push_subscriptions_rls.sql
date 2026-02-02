-- ==========================================
-- Push Subscriptions: columna subscription (jsonb) y RLS
-- Usuarios insertan su suscripción; solo Admin puede leer todas.
-- ==========================================

-- Añadir columna subscription (objeto completo: endpoint, keys) si no existe
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS subscription JSONB;

-- Backfill: subscription = { endpoint, keys } desde columnas existentes
UPDATE public.push_subscriptions
SET subscription = jsonb_build_object('endpoint', endpoint, 'keys', keys)
WHERE subscription IS NULL AND endpoint IS NOT NULL;

-- RLS: reemplazar políticas para que usuarios solo inserten su suscripción y solo admin lea todas
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can subscribe to push" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Service role can do everything on push" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can manage own subscription" ON public.push_subscriptions;

-- Usuarios pueden insertar solo su propia suscripción (o anónima: user_id null)
CREATE POLICY "Users can insert own subscription"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Solo admin puede leer todas (para el panel de notificaciones)
CREATE POLICY "Admin can read all subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
