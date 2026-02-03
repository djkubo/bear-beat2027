'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="border-b border-white/5 bg-zinc-950/80">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/admin" className="text-sm text-bear-blue hover:underline mb-2 block font-medium">
            ← Volver al Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-black text-white">🤖 Configuración ManyChat</h1>
          <p className="text-gray-400 text-sm mt-1">
            Inicializa y gestiona la integración con ManyChat
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">📊 Estado de Configuración</h2>
            <button
              type="button"
              onClick={fetchStatus}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-bear-blue/30 bg-bear-blue/10 text-bear-blue font-bold text-sm hover:bg-bear-blue/20 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin text-bear-blue" />
              <span className="ml-3">Verificando configuración...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl p-6 border border-red-500/30 bg-red-500/10 text-center">
              <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="font-bold text-red-400 mb-2">Error de Conexión</p>
              <p className="text-red-300 text-sm">{error}</p>
              <p className="text-xs text-gray-500 mt-2">
                Verifica MANYCHAT_API_KEY en .env.local
              </p>
            </div>
          ) : status ? (
            <>
              <div className={`rounded-xl p-6 mb-6 text-center ${
                status.status === 'fully_configured'
                  ? 'border border-emerald-500/30 bg-emerald-500/10'
                  : 'border border-amber-500/30 bg-amber-500/10'
              }`}>
                {status.status === 'fully_configured' ? (
                  <>
                    <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                    <p className="text-xl font-bold text-emerald-400">✅ Completamente Configurado</p>
                    <p className="text-sm text-gray-400 mt-2">{status.hint}</p>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">⚠️</div>
                    <p className="text-xl font-bold text-amber-400">Requiere Inicialización</p>
                    <p className="text-sm text-gray-400 mt-2">{status.hint}</p>
                  </>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="rounded-xl p-6 border border-white/5 bg-zinc-800/50">
                  <h3 className="text-lg font-bold text-white mb-4">🏷️ Tags ({status.summary.tagsConfigured})</h3>
                  {status.tags.missing.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-bold text-red-400 mb-2">Faltan:</p>
                      <div className="flex flex-wrap gap-2">
                        {status.tags.missing.map(tag => (
                          <span key={tag} className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs border border-red-500/30">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {status.tags.presentList.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-emerald-400 mb-2">Creados:</p>
                      <div className="flex flex-wrap gap-2">
                        {status.tags.presentList.map(tag => (
                          <span key={tag} className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs border border-emerald-500/30">✓ {tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="rounded-xl p-6 border border-white/5 bg-zinc-800/50">
                  <h3 className="text-lg font-bold text-white mb-4">📊 Custom Fields ({status.summary.fieldsConfigured})</h3>
                  {status.customFields.missing.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-bold text-red-400 mb-2">Faltan:</p>
                      <div className="flex flex-wrap gap-2">
                        {status.customFields.missing.map(field => (
                          <span key={field} className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs border border-red-500/30">{field}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {status.customFields.presentList.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-emerald-400 mb-2">Creados:</p>
                      <div className="flex flex-wrap gap-2">
                        {status.customFields.presentList.map(field => (
                          <span key={field} className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs border border-emerald-500/30">✓ {field}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80">
          <h2 className="text-xl font-bold text-white mb-6">🚀 Inicializar ManyChat</h2>
          <p className="text-gray-400 text-sm mb-6">
            Crear automáticamente tags y custom fields en ManyChat.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => handleInitialize('all')}
              disabled={initializing}
              className="h-auto py-6 rounded-xl bg-bear-blue text-bear-black font-bold hover:bg-bear-blue/90 disabled:opacity-50 flex flex-col items-center justify-center gap-2"
            >
              {initializing ? <Loader2 className="h-6 w-6 animate-spin" /> : <span className="text-2xl">🎯</span>}
              <span>Inicializar TODO</span>
              <span className="text-xs opacity-80">Tags + Fields</span>
            </button>
            <button
              type="button"
              onClick={() => handleInitialize('tags')}
              disabled={initializing}
              className="h-auto py-6 rounded-xl border border-bear-blue/30 bg-bear-blue/10 text-bear-blue font-bold hover:bg-bear-blue/20 disabled:opacity-50 flex flex-col items-center justify-center gap-2"
            >
              {initializing ? <Loader2 className="h-6 w-6 animate-spin" /> : <span className="text-2xl">🏷️</span>}
              <span>Solo Tags</span>
            </button>
            <button
              type="button"
              onClick={() => handleInitialize('fields')}
              disabled={initializing}
              className="h-auto py-6 rounded-xl border border-white/20 bg-zinc-800 text-white font-bold hover:bg-zinc-700 disabled:opacity-50 flex flex-col items-center justify-center gap-2"
            >
              {initializing ? <Loader2 className="h-6 w-6 animate-spin" /> : <span className="text-2xl">📊</span>}
              <span>Solo Fields</span>
            </button>
          </div>
          {initResult && (
            <div className="mt-6 rounded-xl p-6 border border-emerald-500/30 bg-emerald-500/10">
              <h3 className="font-bold text-emerald-400 mb-4">✅ Inicialización Completada</h3>
              {initResult.tags && (
                <p className="text-sm text-gray-300 mb-2">Tags: {initResult.tags.created.length} creados, {initResult.tags.failed.length} ya existían</p>
              )}
              {initResult.customFields && (
                <p className="text-sm text-gray-300">Fields: {initResult.customFields.created.length} creados, {initResult.customFields.failed.length} ya existían</p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl p-6 border border-bear-blue/30 bg-gradient-to-br from-bear-blue/10 to-transparent">
          <h2 className="text-xl font-bold text-white mb-4">💡 Cómo Funciona</h2>
          
          <div className="grid md:grid-cols-2 gap-6 text-gray-300">
            <div>
              <h3 className="font-bold text-white mb-2">Tags Automáticos</h3>
              <p className="text-sm">
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
              <h3 className="font-bold text-white mb-2">Flujos Automáticos</h3>
              <p className="text-sm">
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
