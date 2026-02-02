-- Índice único para upsert en sync-db (scripts/maintenance/sync-db.ts).
-- Permite ON CONFLICT (pack_id, file_path) DO UPDATE.
CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_pack_file_path ON public.videos(pack_id, file_path);

-- Opcional: columna active para marcar videos que ya no están en FTP.
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
