import { redirect } from 'next/navigation'

/**
 * /preview era una página legacy con datos/demo assets de ejemplo (no reales).
 * Para evitar una UX rota, redirigimos al catálogo real (/contenido).
 */
export default function PreviewPage() {
  redirect('/contenido')
}

