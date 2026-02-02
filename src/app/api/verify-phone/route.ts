import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

// ==========================================
// VERIFICACIÓN DE TELÉFONO – Twilio Verify API (SMS / WhatsApp)
// Fallback: códigos en memoria si Twilio Verify no está configurado
// ==========================================

const verificationCodes = new Map<string, { code: string; expiresAt: number }>()

const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID // ej: VA71b8f5db6c57dd1ab1eb3eb24422b9c4
const USE_TWILIO_VERIFY =
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  TWILIO_VERIFY_SERVICE_SID

function getTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
}

/** Normaliza teléfono a E.164 para Twilio */
function toE164(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('52') && !phone.startsWith('+')) return `+${cleaned}`
  if (phone.startsWith('+')) return phone
  return `+${cleaned}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, action, code: userCode, channel = 'sms' } = body

    if (!phone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 })
    }

    const toE164Phone = toE164(phone)

    if (action === 'send') {
      // Canal: 'sms' o 'whatsapp' (Twilio Verify)
      const channelType = channel === 'whatsapp' ? 'whatsapp' : 'sms'

      if (USE_TWILIO_VERIFY) {
        const client = getTwilioClient()
        if (!client) {
          return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 })
        }
        await client.verify.v2
          .services(TWILIO_VERIFY_SERVICE_SID!)
          .verifications.create({
            to: toE164Phone,
            channel: channelType,
          })
        return NextResponse.json({
          success: true,
          message: channelType === 'whatsapp' ? 'Código enviado por WhatsApp' : 'Código enviado por SMS',
        })
      }

      // Fallback sin Twilio Verify: generar código y opcionalmente enviar por send-sms
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      verificationCodes.set(toE164Phone, {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000,
      })
      if (process.env.TWILIO_ACCOUNT_SID) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/api/send-sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: toE164Phone,
              message: `🐻 Bear Beat - Tu código de verificación es: ${code}\n\nVálido por 10 minutos.`,
            }),
          })
        } catch (err) {
          console.error('Error sending SMS fallback:', err)
        }
      }
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 CÓDIGO VERIFICACIÓN ${toE164Phone}: ${code}`)
      }
      return NextResponse.json({
        success: true,
        message: 'Código enviado',
        ...(process.env.NODE_ENV === 'development' && { code }),
      })
    }

    if (action === 'verify') {
      if (!userCode || typeof userCode !== 'string') {
        return NextResponse.json({ error: 'Code required' }, { status: 400 })
      }
      const code = userCode.replace(/\D/g, '').trim()

      if (USE_TWILIO_VERIFY) {
        const client = getTwilioClient()
        if (!client) {
          return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 })
        }
        try {
          const check = await client.verify.v2
            .services(TWILIO_VERIFY_SERVICE_SID!)
            .verificationChecks.create({
              to: toE164Phone,
              code,
            })
          if (check.status === 'approved') {
            return NextResponse.json({ success: true, verified: true })
          }
          return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 })
        } catch (err: any) {
          const msg = err?.message || ''
          if (msg.includes('pending') || msg.includes('404') || msg.includes('invalid')) {
            return NextResponse.json({ error: 'Código incorrecto o expirado' }, { status: 400 })
          }
          throw err
        }
      }

      const stored = verificationCodes.get(toE164Phone)
      if (!stored) {
        return NextResponse.json({ error: 'No hay código enviado para este número' }, { status: 404 })
      }
      if (Date.now() > stored.expiresAt) {
        verificationCodes.delete(toE164Phone)
        return NextResponse.json({ error: 'Código expirado' }, { status: 400 })
      }
      if (stored.code !== code) {
        return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 })
      }
      verificationCodes.delete(toE164Phone)
      return NextResponse.json({ success: true, verified: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error in verify-phone:', error)
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
