/**
 * POST: Solicitud de restablecimiento de contraseña.
 * Genera el link de recuperación con Supabase Admin y envía el email con plantilla
 * "Security Clearance" (Bear Beat Dark) vía Brevo, en lugar del correo por defecto de Supabase.
 *
 * Body: { email: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPasswordResetEmail } from '@/lib/brevo-email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email válido requerido' }, { status: 400 })
    }

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
    const redirectTo = baseUrl
      ? `${baseUrl}/auth/callback?next=${encodeURIComponent('/reset-password')}`
      : undefined

    const admin = createAdminClient()
    const { data, error } = await (admin.auth as any).admin.generateLink({
      type: 'recovery',
      email,
      options: redirectTo ? { redirectTo } : undefined,
    })

    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('user not found') || msg.includes('no user')) {
        return NextResponse.json(
          { error: 'No existe una cuenta con ese email. Revisa la dirección o regístrate.' },
          { status: 404 }
        )
      }
      console.error('[forgot-password] generateLink error:', error)
      return NextResponse.json(
        { error: error.message || 'Error al generar el enlace' },
        { status: 500 }
      )
    }

    const resetLink =
      (data?.properties as { action_link?: string })?.action_link ||
      (data as { action_link?: string })?.action_link
    if (!resetLink) {
      console.error('[forgot-password] No action_link in response:', data)
      return NextResponse.json(
        { error: 'No se pudo generar el enlace de recuperación' },
        { status: 500 }
      )
    }

    const sendResult = await sendPasswordResetEmail({ to: email, resetLink })
    if (!sendResult.success) {
      console.error('[forgot-password] Brevo send failed:', sendResult.error)
      return NextResponse.json(
        { error: sendResult.error || 'Error al enviar el correo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, message: 'Correo enviado' })
  } catch (e: unknown) {
    console.error('[forgot-password] error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    )
  }
}
