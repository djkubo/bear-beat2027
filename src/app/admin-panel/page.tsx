import { redirect } from 'next/navigation'

/**
 * Redirige al panel de admin canónico.
 * El panel completo está en /admin (usuarios, compras, packs, tracking, chatbot, push, etc.).
 */
export default function AdminPanelRedirect() {
  redirect('/admin')
}
