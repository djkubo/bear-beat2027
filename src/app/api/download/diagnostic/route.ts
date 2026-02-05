/**
 * GET /api/download/diagnostic
 * Diagnóstico de por qué no descarga: sesión, compras, FTP, Bunny.
 * Abre esta URL en la misma pestaña donde estás logueado para ver el estado.
 */
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isFtpConfigured } from '@/lib/ftp-stream'
import { isBunnyConfigured, getBunnyConfigStatus } from '@/lib/bunny'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerClient()
  let { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) session = { user } as typeof session
  }
  const user = session?.user

  const ftpConfigured = isFtpConfigured()
  const bunnyConfigured = isBunnyConfigured()
  const bunnyStatus = getBunnyConfigStatus()

  if (!user) {
    return NextResponse.json({
      ok: false,
      loggedIn: false,
      hasPurchases: false,
      ftpConfigured,
      bunnyConfigured,
      bunnyStatus,
      nextStep: 'Inicia sesión. Si ya lo hiciste, revisa en Supabase que Site URL y Redirect URLs incluyan tu dominio de producción.',
    })
  }

  const { data: purchases, error } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', user.id)

  const hasPurchases = !error && !!purchases && purchases.length > 0

  let nextStep: string
  if (!hasPurchases) {
    nextStep = 'No tienes ninguna compra. Solo usuarios con pack comprado pueden descargar.'
  } else if (!ftpConfigured && !bunnyConfigured) {
    nextStep = 'En Render no hay FTP ni Bunny configurado. Añade FTP_HOST, FTP_USER, FTP_PASSWORD o BUNNY_CDN_URL + BUNNY_TOKEN_KEY.'
  } else if (!bunnyStatus.ok) {
    nextStep = 'Bunny está a medias: ' + [...bunnyStatus.missing, ...bunnyStatus.invalid].join('; ') + '. ' + (bunnyStatus.hints?.join(' ') || '')
  } else {
    nextStep = 'Todo configurado. Si aun así no descarga: revisa los Logs en Render (busca [download]) o que el path del archivo exista en FTP/Bunny.'
  }

  return NextResponse.json({
    ok: hasPurchases && (ftpConfigured || bunnyConfigured) && bunnyStatus.ok,
    loggedIn: true,
    hasPurchases,
    ftpConfigured,
    bunnyConfigured,
    bunnyStatus,
    nextStep,
  })
}
