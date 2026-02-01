import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getFtpHostForUsername } from '@/lib/ftp-pool'

/**
 * Devuelve las credenciales FTP del usuario: una cuenta por compra (pool Hetzner).
 */
export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: purchases } = await supabase
      .from('purchases')
      .select('id, ftp_username, ftp_password')
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false })

    if (!purchases?.length) {
      return NextResponse.json(
        { error: 'Necesitas una compra activa para acceder al FTP' },
        { status: 403 }
      )
    }

    const withFtp = purchases.find(p => p.ftp_username && p.ftp_password)
    if (withFtp?.ftp_username && withFtp?.ftp_password) {
      const host = getFtpHostForUsername(withFtp.ftp_username)
      const port = process.env.HETZNER_STORAGEBOX_PORT || '21'
      const useFtps = process.env.HETZNER_STORAGEBOX_USE_FTPS !== 'false'
      return NextResponse.json({
        configured: true,
        host,
        port,
        user: withFtp.ftp_username,
        password: withFtp.ftp_password,
        useFtps,
        readOnly: true,
        hint: useFtps
          ? 'En FileZilla usa Protocolo: FTPS (FTP sobre TLS). Solo descarga: no puedes subir ni borrar.'
          : 'En FileZilla usa Protocolo: FTP. Solo descarga: no puedes subir ni borrar.',
      })
    }

    const host = process.env.HETZNER_STORAGEBOX_HOST
    const ftpUser = process.env.HETZNER_STORAGEBOX_USER
    const ftpPassword = process.env.HETZNER_STORAGEBOX_PASSWORD
    const port = process.env.HETZNER_STORAGEBOX_PORT || '21'
    const useFtps = process.env.HETZNER_STORAGEBOX_USE_FTPS !== 'false'

    if (!host || !ftpUser || !ftpPassword) {
      return NextResponse.json(
        {
          configured: false,
          message:
            'No hay cuenta FTP asignada. Configura el pool (tabla ftp_pool) o HETZNER_STORAGEBOX_* en el servidor.',
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      configured: true,
      host,
      port: port,
      user: ftpUser,
      password: ftpPassword,
      useFtps,
      readOnly: true, // Cuenta de solo descarga: los clientes no pueden subir ni borrar, solo descargar.
      hint: useFtps
        ? 'En FileZilla usa Protocolo: FTPS (FTP sobre TLS). Solo descarga: no puedes subir ni borrar.'
        : 'En FileZilla usa Protocolo: FTP. Solo descarga: no puedes subir ni borrar.',
    })
  } catch (error: any) {
    console.error('FTP credentials error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener credenciales FTP' },
      { status: 500 }
    )
  }
}
