import { NextRequest, NextResponse } from 'next/server'
import {
  upsertSubscriber,
  addTagByName,
  addMultipleTags,
  setCustomFieldByName,
  setMultipleCustomFields,
  findSubscriberByField,
  syncUserToManyChat,
  trackPurchaseInManyChat,
  trackEventInManyChat,
  sendFlow,
  BEAR_BEAT_TAGS,
  BEAR_BEAT_FIELDS,
} from '@/lib/manychat'

/**
 * API Route para operaciones de ManyChat desde el cliente
 * 
 * Acciones disponibles:
 * - sync_user: Sincronizar usuario completo
 * - track_event: Trackear evento
 * - track_purchase: Trackear compra
 * - add_tag: Agregar tag
 * - add_tags: Agregar múltiples tags
 * - set_field: Establecer custom field
 * - set_fields: Establecer múltiples custom fields
 * - send_flow: Enviar flujo/automation
 * - find_subscriber: Buscar suscriptor
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, ...data } = body
    
    if (!action) {
      return NextResponse.json(
        { error: 'Action required' },
        { status: 400 }
      )
    }
    
    let result: any = null
    
    switch (action) {
      // ==========================================
      // SINCRONIZAR USUARIO
      // ==========================================
      case 'sync_user': {
        const { email, phone, firstName, lastName, country, userId, referrer } = data
        
        if (!email && !phone) {
          return NextResponse.json(
            { error: 'Email or phone required' },
            { status: 400 }
          )
        }
        
        result = await syncUserToManyChat({
          email,
          phone,
          firstName,
          lastName,
          country,
          userId,
          referrer,
        })
        
        break
      }
      
      // ==========================================
      // TRACKEAR EVENTO
      // ==========================================
      case 'track_event': {
        const { email, phone, eventType, eventData } = data
        
        result = await trackEventInManyChat({
          email,
          phone,
          eventType,
          eventData,
        })
        
        break
      }
      
      // ==========================================
      // TRACKEAR COMPRA
      // ==========================================
      case 'track_purchase': {
        const { email, phone, packName, amount, currency, paymentMethod } = data
        
        if (!email) {
          return NextResponse.json(
            { error: 'Email required for purchase tracking' },
            { status: 400 }
          )
        }
        
        result = await trackPurchaseInManyChat({
          email,
          phone,
          packName,
          amount,
          currency,
          paymentMethod,
        })
        
        break
      }
      
      // ==========================================
      // AGREGAR TAG
      // ==========================================
      case 'add_tag': {
        const { subscriberId, tagName } = data
        
        if (!subscriberId || !tagName) {
          return NextResponse.json(
            { error: 'subscriberId and tagName required' },
            { status: 400 }
          )
        }
        
        result = await addTagByName(subscriberId, tagName)
        break
      }
      
      // ==========================================
      // AGREGAR MÚLTIPLES TAGS
      // ==========================================
      case 'add_tags': {
        const { subscriberId, tagNames } = data
        
        if (!subscriberId || !tagNames || !Array.isArray(tagNames)) {
          return NextResponse.json(
            { error: 'subscriberId and tagNames array required' },
            { status: 400 }
          )
        }
        
        result = await addMultipleTags(subscriberId, tagNames)
        break
      }
      
      // ==========================================
      // ESTABLECER CUSTOM FIELD
      // ==========================================
      case 'set_field': {
        const { subscriberId, fieldName, fieldValue } = data
        
        if (!subscriberId || !fieldName) {
          return NextResponse.json(
            { error: 'subscriberId and fieldName required' },
            { status: 400 }
          )
        }
        
        result = await setCustomFieldByName(subscriberId, fieldName, fieldValue)
        break
      }
      
      // ==========================================
      // ESTABLECER MÚLTIPLES CUSTOM FIELDS
      // ==========================================
      case 'set_fields': {
        const { subscriberId, fields } = data
        
        if (!subscriberId || !fields) {
          return NextResponse.json(
            { error: 'subscriberId and fields object required' },
            { status: 400 }
          )
        }
        
        result = await setMultipleCustomFields(subscriberId, fields)
        break
      }
      
      // ==========================================
      // ENVIAR FLUJO
      // ==========================================
      case 'send_flow': {
        const { subscriberId, flowNamespace } = data
        
        if (!subscriberId || !flowNamespace) {
          return NextResponse.json(
            { error: 'subscriberId and flowNamespace required' },
            { status: 400 }
          )
        }
        
        result = await sendFlow(subscriberId, flowNamespace)
        break
      }
      
      // ==========================================
      // BUSCAR SUSCRIPTOR
      // ==========================================
      case 'find_subscriber': {
        const { field, value } = data
        
        if (!field || !value) {
          return NextResponse.json(
            { error: 'field and value required' },
            { status: 400 }
          )
        }
        
        if (!['email', 'phone', 'whatsapp_phone'].includes(field)) {
          return NextResponse.json(
            { error: 'Invalid field. Use: email, phone, or whatsapp_phone' },
            { status: 400 }
          )
        }
        
        result = await findSubscriberByField(field as any, value)
        break
      }
      
      // ==========================================
      // CREAR/ACTUALIZAR SUSCRIPTOR
      // ==========================================
      case 'upsert_subscriber': {
        const { email, phone, whatsapp_phone, first_name, last_name } = data
        
        if (!email && !phone && !whatsapp_phone) {
          return NextResponse.json(
            { error: 'At least email, phone, or whatsapp_phone required' },
            { status: 400 }
          )
        }
        
        result = await upsertSubscriber({
          email,
          phone,
          whatsapp_phone,
          first_name,
          last_name,
        })
        break
      }
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
    
    return NextResponse.json({
      success: true,
      data: result,
    })
    
  } catch (error: any) {
    console.error('ManyChat API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint para verificar configuración y obtener info
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  
  // Retornar tags y fields disponibles
  if (action === 'config') {
    return NextResponse.json({
      tags: BEAR_BEAT_TAGS,
      fields: BEAR_BEAT_FIELDS,
    })
  }
  
  return NextResponse.json({
    message: 'ManyChat API ready',
    availableActions: [
      'sync_user',
      'track_event', 
      'track_purchase',
      'add_tag',
      'add_tags',
      'set_field',
      'set_fields',
      'send_flow',
      'find_subscriber',
      'upsert_subscriber',
    ],
  })
}
