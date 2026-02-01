import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Almacenamiento temporal de códigos de verificación
// En producción, usar Redis o Upstash
const verificationCodes = new Map<string, { code: string, expiresAt: number }>()

export async function POST(req: NextRequest) {
  try {
    const { phone, action } = await req.json()
    
    if (!phone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 })
    }
    
    if (action === 'send') {
      // Generar código de 6 dígitos
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      
      // Guardar código con expiración de 10 minutos
      verificationCodes.set(phone, {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutos
      })
      
      // Enviar código por SMS (si Twilio está configurado)
      if (process.env.TWILIO_ACCOUNT_SID) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: phone,
              message: `🐻 Bear Beat - Tu código de verificación es: ${code}\n\nVálido por 10 minutos.`,
            }),
          })
        } catch (error) {
          console.error('Error sending SMS:', error)
        }
      }
      
      // En desarrollo, mostrar el código en consola
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 CÓDIGO DE VERIFICACIÓN PARA ${phone}: ${code}`)
      }
      
      return NextResponse.json({
        success: true,
        message: 'Código enviado',
        // En desarrollo, devolver el código para testing
        ...(process.env.NODE_ENV === 'development' && { code }),
      })
    }
    
    if (action === 'verify') {
      const { code } = await req.json()
      
      if (!code) {
        return NextResponse.json({ error: 'Code required' }, { status: 400 })
      }
      
      const stored = verificationCodes.get(phone)
      
      if (!stored) {
        return NextResponse.json({ error: 'No code found' }, { status: 404 })
      }
      
      if (Date.now() > stored.expiresAt) {
        verificationCodes.delete(phone)
        return NextResponse.json({ error: 'Código expirado' }, { status: 400 })
      }
      
      if (stored.code !== code) {
        return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 })
      }
      
      // Código válido, eliminarlo
      verificationCodes.delete(phone)
      
      return NextResponse.json({
        success: true,
        verified: true,
      })
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
