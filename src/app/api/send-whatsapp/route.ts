import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

const TWILIO_WHATSAPP_ENV_KEYS = [
  'TWILIO_WHATSAPP_NUMBER',
  'TWILIO_PHONE_NUMBER',
  'TWILIO_WHATSAPP_SENDER',
  'TWILIO_WHATSAPP_FROM',
  'TWILIO_FROM_NUMBER',
] as const

function getTwilioWhatsAppFromNumber(): string {
  for (const key of TWILIO_WHATSAPP_ENV_KEYS) {
    const v = (process.env[key] || '').trim()
    if (v) return v
  }
  return ''
}

export async function POST(req: NextRequest) {
  try {
    const { to, message } = await req.json()
    
    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const fromNumber = getTwilioWhatsAppFromNumber()
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !fromNumber) {
      console.warn('Twilio not configured, skipping WhatsApp')
      return NextResponse.json({ 
        success: true, 
        message: 'WhatsApp skipped (Twilio not configured)' 
      })
    }
    
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
    
    const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
    const from = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`
    
    const result = await client.messages.create({
      body: message,
      from,
      to: whatsappTo,
    })
    
    return NextResponse.json({
      success: true,
      messageId: result.sid,
    })
  } catch (error: any) {
    console.error('Error sending WhatsApp:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send WhatsApp' },
      { status: 500 }
    )
  }
}
