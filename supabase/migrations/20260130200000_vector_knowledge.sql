-- =====================================================
-- BASE DE CONOCIMIENTOS VECTORIAL (RAG Chatbot)
-- text-embedding-3-large = 3072 dimensiones
-- =====================================================

-- Activar extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla de documentos para RAG
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(3072),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_embedding ON public.documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

COMMENT ON TABLE public.documents IS 'Fragmentos de conocimiento para RAG del chatbot Bear Beat (text-embedding-3-large)';

-- RPC: búsqueda por similitud (cosine)
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.documents d
  WHERE d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
