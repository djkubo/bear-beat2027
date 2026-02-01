-- Añade columnas key y bpm a videos para metadata desde nombre de archivo
-- Ejecutar: psql $DATABASE_URL -f supabase/migrations/20260131000000_add_videos_key_bpm.sql
-- O desde Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'videos' AND column_name = 'key') THEN
    ALTER TABLE public.videos ADD COLUMN key VARCHAR(20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'videos' AND column_name = 'bpm') THEN
    ALTER TABLE public.videos ADD COLUMN bpm VARCHAR(20);
  END IF;
END $$;
