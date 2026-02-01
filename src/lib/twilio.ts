// Configuración de Twilio para SMS y WhatsApp

interface SendSMSParams {
  to: string
  message: string
}

interface SendWhatsAppParams {
  to: string
  message: string
}

/**
 * Envía un SMS usando Twilio
 */
export async function sendSMS({ to, message }: SendSMSParams) {
  try {
    const response = await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message }),
    })
    
    if (!response.ok) {
      throw new Error('Failed to send SMS')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error sending SMS:', error)
    throw error
  }
}

/**
 * Envía un mensaje de WhatsApp usando Twilio
 */
export async function sendWhatsApp({ to, message }: SendWhatsAppParams) {
  try {
    const response = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message }),
    })
    
    if (!response.ok) {
      throw new Error('Failed to send WhatsApp')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error sending WhatsApp:', error)
    throw error
  }
}

/**
 * Envía código de verificación por SMS
 */
export async function sendVerificationCode(phone: string): Promise<string> {
  // Generar código de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  
  const message = `Tu código de verificación de Bear Beat es: ${code}\n\nEste código expira en 10 minutos.`
  
  await sendSMS({ to: phone, message })
  
  return code
}

/**
 * Envía código de verificación por WhatsApp
 */
export async function sendVerificationCodeWhatsApp(phone: string): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  
  const message = `🐻 *Bear Beat - Código de Verificación*\n\nTu código es: *${code}*\n\n⏰ Válido por 10 minutos.\n\n¿No solicitaste este código? Ignora este mensaje.`
  
  await sendWhatsApp({ to: phone, message })
  
  return code
}
