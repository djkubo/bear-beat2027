/**
 * Configuración centralizada de OpenAI para Bear Beat.
 * Chat: GPT-5.2 (gpt-5.2). Embeddings: text-embedding-3-large (3072 dims).
 * Ver: https://platform.openai.com/docs/models/gpt-5.2
 */

/** Modelo de chat: GPT-5.2 (BearBot, webhook ManyChat, analyze-chat) */
export const OPENAI_CHAT_MODEL_DEFAULT = 'gpt-5.2'

export function getOpenAIChatModel(): string {
  return process.env.OPENAI_CHAT_MODEL || OPENAI_CHAT_MODEL_DEFAULT
}

/** Modelo de embeddings para RAG (match_documents en Supabase) */
export const EMBEDDING_MODEL = 'text-embedding-3-large'
export const EMBEDDING_DIMENSIONS = 3072
