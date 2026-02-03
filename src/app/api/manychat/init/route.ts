import { NextRequest, NextResponse } from 'next/server'
import {
  initializeManyChat,
  initializeBearBeatTags,
  initializeBearBeatCustomFields,
  getPageTags,
  getPageCustomFields,
  verifyConnection,
  BEAR_BEAT_TAGS,
  BEAR_BEAT_FIELDS,
} from '@/lib/manychat'

function isKeySet(): boolean {
  return (process.env.MANYCHAT_API_KEY || '').trim().length > 0
}

/**
 * POST /api/manychat/init
 * 
 * Inicializa todos los tags y custom fields necesarios en ManyChat
 * Ejecutar UNA VEZ para configurar ManyChat
 * 
 * Opciones:
 * - { action: 'all' } - Crear tags + custom fields (default)
 * - { action: 'tags' } - Solo crear tags
 * - { action: 'fields' } - Solo crear custom fields
 * - { action: 'status' } - Ver estado actual
 */
export async function POST(req: NextRequest) {
  try {
    console.log('ManyChat Key Presente:', !!process.env.MANYCHAT_API_KEY)
    const body = await req.json().catch(() => ({}))
    const action = body.action || 'all'

    if (['all', 'tags', 'fields'].includes(action)) {
      await verifyConnection()
    }

    let result: any = {}

    switch (action) {
      case 'all':
        result = await initializeManyChat()
        break

      case 'tags':
        result.tags = await initializeBearBeatTags()
        result.existingTags = await getPageTags()
        break

      case 'fields':
        result.customFields = await initializeBearBeatCustomFields()
        result.existingFields = await getPageCustomFields()
        break

      case 'status':
        // Solo obtener estado actual
        result.existingTags = await getPageTags()
        result.existingFields = await getPageCustomFields()
        result.requiredTags = BEAR_BEAT_TAGS
        result.requiredFields = BEAR_BEAT_FIELDS
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: all, tags, fields, or status' },
          { status: 400 }
        )
    }
    
    return NextResponse.json({
      success: true,
      action,
      ...result,
      message: action === 'status' 
        ? 'Current ManyChat configuration retrieved'
        : 'ManyChat initialization completed successfully',
    })
    
  } catch (error: any) {
    console.error('ManyChat init error:', error)
    const isProd = process.env.NODE_ENV === 'production'
    const hint = isProd
      ? 'Render: Environment → MANYCHAT_API_KEY. Después de añadirla, haz "Manual Deploy" para que cargue.'
      : 'Añade MANYCHAT_API_KEY en .env.local.'
    return NextResponse.json(
      {
        error: error.message || 'Initialization failed',
        hint,
        keySet: isKeySet(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/manychat/init
 * 
 * Obtiene el estado actual de la configuración de ManyChat
 */
export async function GET() {
  try {
    await verifyConnection()
    const existingTags = await getPageTags()
    const existingFields = await getPageCustomFields()
    
    // Verificar qué tags de Bear Beat ya existen
    const bearBeatTagNames = Object.values(BEAR_BEAT_TAGS)
    const existingTagNames = existingTags.map(t => t.name)
    
    const missingTags = bearBeatTagNames.filter(t => !existingTagNames.includes(t))
    const presentTags = bearBeatTagNames.filter(t => existingTagNames.includes(t))
    
    // Verificar qué custom fields ya existen
    const bearBeatFieldNames = Object.values(BEAR_BEAT_FIELDS)
    const existingFieldNames = existingFields.map(f => f.name)
    
    const missingFields = bearBeatFieldNames.filter(f => !existingFieldNames.includes(f))
    const presentFields = bearBeatFieldNames.filter(f => existingFieldNames.includes(f))
    
    const allConfigured = missingTags.length === 0 && missingFields.length === 0
    
    return NextResponse.json({
      success: true,
      status: allConfigured ? 'fully_configured' : 'needs_initialization',
      summary: {
        tagsConfigured: `${presentTags.length}/${bearBeatTagNames.length}`,
        fieldsConfigured: `${presentFields.length}/${bearBeatFieldNames.length}`,
      },
      tags: {
        required: bearBeatTagNames.length,
        present: presentTags.length,
        missing: missingTags,
        presentList: presentTags,
      },
      customFields: {
        required: bearBeatFieldNames.length,
        present: presentFields.length,
        missing: missingFields,
        presentList: presentFields,
      },
      allTags: existingTags,
      allFields: existingFields,
      hint: allConfigured 
        ? 'ManyChat is fully configured for Bear Beat!' 
        : 'Run POST /api/manychat/init to create missing tags and fields',
    })
    
  } catch (error: any) {
    console.error('ManyChat status error:', error)
    const isProd = process.env.NODE_ENV === 'production'
    const hint = isProd
      ? 'Render: Environment → MANYCHAT_API_KEY (valor = API Key de ManyChat → Settings → API). Después de añadirla, haz "Manual Deploy" para que cargue.'
      : 'Añade MANYCHAT_API_KEY en .env.local (API Key de ManyChat → Settings → API).'
    return NextResponse.json(
      {
        error: error.message || 'Failed to get status',
        hint,
        keySet: isKeySet(),
      },
      { status: 500 }
    )
  }
}
