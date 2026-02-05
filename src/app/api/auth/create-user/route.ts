/**
 * POST: Crear usuario Auth con email_confirm: true (para flujo complete-purchase / registro).
 * Body: { email: string, password: string, name?: string, phone?: string }
 * Solo para uso desde complete-purchase; evita que el usuario quede con email no confirmado.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWelcomeRegistroEmail } from '@/lib/brevo-email'
import { sendSms } from '@/lib/brevo-sms'
import type { Database } from '@/types/database'

type UserInsert = Database['public']['Tables']['users']['Insert']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name, phone } = body as {
      email?: string
      password?: string
      name?: string
      phone?: string
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Email válido requerido' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: newAuth, error: createErr } = await (admin.auth as any).admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { name: name || undefined, phone: phone || undefined },
    })

    if (createErr) {
      const msg = (createErr.message || '').toLowerCase()
      if (msg.includes('already') || msg.includes('registered') || createErr.status === 422) {
        return NextResponse.json(
          { error: 'already_exists', message: 'Este email ya tiene cuenta. Inicia sesión o usa "Establecer contraseña".' },
          { status: 409 }
        )
      }
      console.error('create-user createUser error:', createErr)
      return NextResponse.json({ error: createErr.message || 'Error al crear cuenta' }, { status: 500 })
    }

    if (!newAuth?.user?.id) {
      return NextResponse.json({ error: 'No se devolvió el usuario' }, { status: 500 })
    }

    await (admin.from('users') as any).upsert(
      {
        id: newAuth.user.id,
        email: email.trim(),
        name: name ?? null,
        phone: phone ?? null,
      } as UserInsert,
      { onConflict: 'id' }
    )

    // --- EMAIL BIENVENIDA REGISTRO (plantilla "Modo Bestia") ---
    try {
      await sendWelcomeRegistroEmail({ to: email.trim(), name: name || undefined })
    } catch (mailErr) {
      console.error('create-user: welcome email failed', mailErr)
      // No fallar el registro si el email falla
    }

    // --- SMS BIENVENIDA (justo después de crear usuario) ---
    const phoneClean = typeof phone === 'string' ? phone.trim() : ''
    const hasValidPhone = phoneClean && phoneClean.replace(/\D/g, '').length >= 10
    if (hasValidPhone) {
      try {
        const smsBody =
          'BearBeat: Bienvenido a la Élite 🐺. Tus accesos están en tu email. Revísalo ya (incluso Spam). Vamos a romperla. 🔥'
        await sendSms(phoneClean, smsBody, undefined, { tag: 'welcome' })
        console.log('📱 SMS de bienvenida enviado a:', phoneClean)
      } catch (smsError) {
        console.error('❌ Error enviando SMS:', smsError)
        // No bloqueamos el flujo, solo reportamos
      }
    }

    return NextResponse.json({
      ok: true,
      userId: newAuth.user.id,
      email: newAuth.user.email,
    })
  } catch (e: any) {
    console.error('create-user error:', e)
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 })
  }
}
