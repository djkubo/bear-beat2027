-- Atribución First-Touch: fuente de tráfico por compra (para Admin Panel)
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100);
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100);
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(255);
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS traffic_source VARCHAR(100);
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS is_ad_traffic BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_purchases_utm_source ON public.purchases(utm_source);
