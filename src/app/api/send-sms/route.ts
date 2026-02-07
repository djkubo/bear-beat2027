import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { sendBrevoSms, isBrevoSmsConfigured } from '@/lib/brevo-sms'
import { getAdminStatus } from '@/lib/admin-check'

export async function POST(req: NextRequest) {
  try {
    // En producción, este endpoint NO puede ser público (costos/spam).
    if (process.env.NODE_ENV === 'production') {
      const { user, isAdmin } = await getAdminStatus()
      if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
      if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { to, message } = await req.json()

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 1) Intentar Brevo SMS primero (transaccionales, seguimiento de envío/entrega)
    if (isBrevoSmsConfigured()) {
      const brevo = await sendBrevoSms(to, message)
      if (brevo.success) {
        return NextResponse.json({
          success: true,
          messageId: brevo.messageId,
          provider: 'brevo',
        })
      }
      console.warn('Brevo SMS failed, falling back to Twilio:', brevo.error)
    }

    // 2) Fallback: Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      )
      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      })
      return NextResponse.json({
        success: true,
        messageId: result.sid,
        provider: 'twilio',
      })
    }

    console.warn('No SMS provider configured (Brevo nor Twilio)')
    return NextResponse.json({
      success: false,
      error: 'SMS no configurado. Añade BREVO_API_KEY o Twilio en el servidor.',
    }, { status: 503 })
  } catch (error: unknown) {
    console.error('Error sending SMS:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send SMS' },
      { status: 500 }
    )
  }
}
