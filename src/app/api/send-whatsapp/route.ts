import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

export async function POST(req: NextRequest) {
  try {
    const { to, message } = await req.json()
    
    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Verificar que Twilio esté configurado
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
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
    
    // WhatsApp requiere formato: whatsapp:+525512345678
    const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
    
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_WHATSAPP_NUMBER || `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
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
