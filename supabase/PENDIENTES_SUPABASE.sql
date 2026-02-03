-- =====================================================
-- Tablas que usa la app y NO están en SETUP_COMPLETO.sql
-- Ejecutar en Supabase → SQL Editor si ves "relation downloads does not exist"
-- =====================================================

-- Historial de descargas (web/FTP) – usado por /api/download y /api/files
CREATE TABLE IF NOT EXISTS public.downloads (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  pack_id INT REFERENCES public.packs(id) ON DELETE CASCADE,
  video_id INT REFERENCES public.videos(id) ON DELETE SET NULL,
  file_path TEXT,
  file_size BIGINT,
  download_method VARCHAR(20),
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_downloads_user ON public.downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_pack ON public.downloads(pack_id);
CREATE INDEX IF NOT EXISTS idx_downloads_date ON public.downloads(downloaded_at DESC);

ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Usuario ve solo sus descargas; puede insertar solo las suyas (el backend usa service role y hace bypass RLS)
DROP POLICY IF EXISTS "Users can view own downloads" ON public.downloads;
CREATE POLICY "Users can view own downloads"
  ON public.downloads FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own downloads" ON public.downloads;
CREATE POLICY "Users can insert own downloads"
  ON public.downloads FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin puede ver todas (para reportes)
DROP POLICY IF EXISTS "Admins can view all downloads" ON public.downloads;
CREATE POLICY "Admins can view all downloads"
  ON public.downloads FOR SELECT USING (public.is_admin());
