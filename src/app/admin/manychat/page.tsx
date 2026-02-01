'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

interface ManyChatStatus {
  success: boolean
  status: 'fully_configured' | 'needs_initialization'
  summary: {
    tagsConfigured: string
    fieldsConfigured: string
  }
  tags: {
    required: number
    present: number
    missing: string[]
    presentList: string[]
  }
  customFields: {
    required: number
    present: number
    missing: string[]
    presentList: string[]
  }
  hint: string
}

export default function AdminManyChat() {
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(false)
  const [status, setStatus] = useState<ManyChatStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [initResult, setInitResult] = useState<any>(null)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/manychat/init')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener estado')
      }
      
      setStatus(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInitialize = async (action: 'all' | 'tags' | 'fields') => {
    setInitializing(true)
    setError(null)
    setInitResult(null)
    
    try {
      const response = await fetch('/api/manychat/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al inicializar')
      }
      
      setInitResult(data)
      
      // Refrescar estado
      await fetchStatus()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setInitializing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bear-blue/5 via-background to-bear-black/5">
      {/* Header */}
      <div className="bg-card border-b-2 border-bear-blue/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/admin" className="text-sm text-bear-blue hover:underline mb-2 block">
            ← Volver al Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold">🤖 Configuración ManyChat</h1>
          <p className="text-muted-foreground">
            Inicializa y gestiona la integración con ManyChat
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Estado Actual */}
        <div className="bg-card rounded-2xl p-6 border-2 border-bear-blue/30 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-extrabold">📊 Estado de Configuración</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStatus}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-bear-blue" />
              <span className="ml-3">Verificando configuración...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-2 border-red-500 rounded-xl p-6 text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="font-bold text-red-700 mb-2">Error de Conexión</p>
              <p className="text-red-600">{error}</p>
              <p className="text-sm text-red-500 mt-2">
                Verifica que MANYCHAT_API_KEY esté configurado en .env.local
              </p>
            </div>
          ) : status ? (
            <>
              {/* Status Badge */}
              <div className={`rounded-xl p-6 mb-6 text-center ${
                status.status === 'fully_configured' 
                  ? 'bg-green-50 border-2 border-green-500' 
                  : 'bg-yellow-50 border-2 border-yellow-500'
              }`}>
                {status.status === 'fully_configured' ? (
                  <>
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <p className="text-2xl font-extrabold text-green-700">
                      ✅ Completamente Configurado
                    </p>
                    <p className="text-green-600 mt-2">{status.hint}</p>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">⚠️</div>
                    <p className="text-2xl font-extrabold text-yellow-700">
                      Requiere Inicialización
                    </p>
                    <p className="text-yellow-600 mt-2">{status.hint}</p>
                  </>
                )}
              </div>

              {/* Resumen */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Tags */}
                <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-300">
                  <h3 className="text-xl font-bold mb-4 text-purple-700">
                    🏷️ Tags ({status.summary.tagsConfigured})
                  </h3>
                  
                  {status.tags.missing.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-bold text-red-600 mb-2">Faltan crear:</p>
                      <div className="flex flex-wrap gap-2">
                        {status.tags.missing.map(tag => (
                          <span key={tag} className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {status.tags.presentList.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-green-600 mb-2">Ya creados:</p>
                      <div className="flex flex-wrap gap-2">
                        {status.tags.presentList.map(tag => (
                          <span key={tag} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                            ✓ {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Fields */}
                <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-300">
                  <h3 className="text-xl font-bold mb-4 text-blue-700">
                    📊 Custom Fields ({status.summary.fieldsConfigured})
                  </h3>
                  
                  {status.customFields.missing.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-bold text-red-600 mb-2">Faltan crear:</p>
                      <div className="flex flex-wrap gap-2">
                        {status.customFields.missing.map(field => (
                          <span key={field} className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {status.customFields.presentList.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-green-600 mb-2">Ya creados:</p>
                      <div className="flex flex-wrap gap-2">
                        {status.customFields.presentList.map(field => (
                          <span key={field} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                            ✓ {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Acciones de Inicialización */}
        <div className="bg-card rounded-2xl p-6 border-2 border-bear-blue/30 shadow-xl">
          <h2 className="text-2xl font-extrabold mb-6">🚀 Inicializar ManyChat</h2>
          
          <p className="text-muted-foreground mb-6">
            Haz clic para crear automáticamente todos los tags y custom fields necesarios en ManyChat.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <Button
              className="h-auto py-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              onClick={() => handleInitialize('all')}
              disabled={initializing}
            >
              {initializing ? (
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
              ) : (
                <span className="text-2xl mr-2">🎯</span>
              )}
              <div className="text-left">
                <div className="font-bold">Inicializar TODO</div>
                <div className="text-xs opacity-80">Tags + Custom Fields</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-6 border-purple-500 text-purple-700 hover:bg-purple-50"
              onClick={() => handleInitialize('tags')}
              disabled={initializing}
            >
              {initializing ? (
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
              ) : (
                <span className="text-2xl mr-2">🏷️</span>
              )}
              <div className="text-left">
                <div className="font-bold">Solo Tags</div>
                <div className="text-xs opacity-80">Crear tags faltantes</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-6 border-blue-500 text-blue-700 hover:bg-blue-50"
              onClick={() => handleInitialize('fields')}
              disabled={initializing}
            >
              {initializing ? (
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
              ) : (
                <span className="text-2xl mr-2">📊</span>
              )}
              <div className="text-left">
                <div className="font-bold">Solo Fields</div>
                <div className="text-xs opacity-80">Crear campos faltantes</div>
              </div>
            </Button>
          </div>

          {/* Resultado de Inicialización */}
          {initResult && (
            <div className="mt-6 bg-green-50 border-2 border-green-500 rounded-xl p-6">
              <h3 className="font-bold text-green-700 mb-4">✅ Inicialización Completada</h3>
              
              {initResult.tags && (
                <div className="mb-4">
                  <p className="text-sm font-bold">Tags:</p>
                  <p className="text-sm text-green-600">
                    Creados: {initResult.tags.created.length} | 
                    Ya existían: {initResult.tags.failed.length}
                  </p>
                </div>
              )}
              
              {initResult.customFields && (
                <div>
                  <p className="text-sm font-bold">Custom Fields:</p>
                  <p className="text-sm text-green-600">
                    Creados: {initResult.customFields.created.length} | 
                    Ya existían: {initResult.customFields.failed.length}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Información de Uso */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 shadow-xl text-white">
          <h2 className="text-2xl font-extrabold mb-4">💡 Cómo Funciona</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold mb-2">Tags Automáticos</h3>
              <p className="text-sm opacity-90">
                Cuando un usuario realiza una acción (visita, clic, compra), 
                automáticamente se le asigna el tag correspondiente en ManyChat.
              </p>
              <ul className="text-sm mt-2 space-y-1">
                <li>• <code className="bg-white/20 px-1 rounded">bb_visitor</code> → Visitó el sitio</li>
                <li>• <code className="bg-white/20 px-1 rounded">bb_lead</code> → Dio sus datos</li>
                <li>• <code className="bg-white/20 px-1 rounded">bb_customer</code> → Compró</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold mb-2">Flujos Automáticos</h3>
              <p className="text-sm opacity-90">
                Crea flujos en ManyChat usando estos tags como triggers 
                para automatizar la comunicación.
              </p>
              <ul className="text-sm mt-2 space-y-1">
                <li>• Tag <code className="bg-white/20 px-1 rounded">bb_payment_success</code> → Enviar confirmación</li>
                <li>• Tag <code className="bg-white/20 px-1 rounded">bb_started_checkout</code> → Recuperar carrito</li>
                <li>• Tag <code className="bg-white/20 px-1 rounded">bb_registered</code> → Bienvenida</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
