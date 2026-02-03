-- ==========================================
-- Anuncios globales (estilo Intercom) para el chat
-- El frontend puede consumir los activos y mostrarlos proactivamente
-- ==========================================

CREATE TABLE IF NOT EXISTS public.global_announcements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_global_announcements_active ON public.global_announcements(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_global_announcements_created ON public.global_announcements(created_at DESC);

COMMENT ON TABLE public.global_announcements IS 'Anuncios globales para el chat (tipo Intercom); solo is_active = true se muestran';

-- RLS: solo servicio/admin puede escribir; lectura pública para la API que sirve al chat
ALTER TABLE public.global_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read active announcements" ON public.global_announcements;
CREATE POLICY "Allow read active announcements"
  ON public.global_announcements FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admin can manage announcements" ON public.global_announcements;
CREATE POLICY "Admin can manage announcements"
  ON public.global_announcements FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
