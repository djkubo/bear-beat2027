-- ==========================================
-- Chat Web Propio: mensajes del widget (BearBot)
-- Para que el Panel de Admin muestre conversaciones del chat en la web.
-- Vector + documents + match_documents ya existen en 20260130200001_vector_knowledge_fix.sql
-- ==========================================

-- Función is_admin (por si no existe de SETUP_COMPLETO)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON public.chat_messages(user_id);

COMMENT ON TABLE public.chat_messages IS 'Mensajes del chat web (BearBot) para historial y panel admin';

-- RLS: API inserta con service role o sesión; solo admin lee en el panel
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert chat_messages" ON public.chat_messages;
CREATE POLICY "Allow insert chat_messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can read chat_messages" ON public.chat_messages;
CREATE POLICY "Admin can read chat_messages"
  ON public.chat_messages FOR SELECT
  USING (public.is_admin());
