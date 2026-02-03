/**
 * Configuración centralizada de OpenAI para Bear Beat.
 * Chat: GPT-5.2 (gpt-5.2). Ver https://platform.openai.com/docs/guides/latest-model
 * Embeddings: text-embedding-3-large (3072 dims).
 */

/** Modelo de chat: GPT-5.2; override con OPENAI_CHAT_MODEL si aplica */
export const OPENAI_CHAT_MODEL_DEFAULT = 'gpt-5.2'

export function getOpenAIChatModel(): string {
  return process.env.OPENAI_CHAT_MODEL || OPENAI_CHAT_MODEL_DEFAULT
}

/** Modelo de embeddings para RAG (match_documents en Supabase) */
export const EMBEDDING_MODEL = 'text-embedding-3-large'
export const EMBEDDING_DIMENSIONS = 3072
