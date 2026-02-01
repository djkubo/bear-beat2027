'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'

// ==========================================
// ADMIN - Panel de Notificaciones Push
// ==========================================

interface PushStats {
  total: number
  withUser: number
  anonymous: number
}

export default function AdminPushPage() {
  const [stats, setStats] = useState<PushStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  
  // Formulario
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('/')
  const [target, setTarget] = useState<'all' | 'users' | 'anonymous'>('all')

  // Plantillas predefinidas
  const templates = [
    {
      name: '🎉 Nuevo Pack',
      title: '¡Nuevo Pack Disponible!',
      body: 'Ya está listo el Pack de Febrero 2026 con +200 videos nuevos. ¡Descárgalo ahora!',
      url: '/contenido'
    },
    {
      name: '🔥 Oferta Flash',
      title: '⚡ Oferta Flash - Solo 24h',
      body: 'Acceso completo con 50% de descuento. ¡No te lo pierdas!',
      url: '/checkout?pack=enero-2026&discount=FLASH50'
    },
    {
      name: '💳 Recordatorio Pago',
      title: 'Tu pago está pendiente',
      body: 'Completa tu compra y obtén acceso inmediato a +3,000 videos.',
      url: '/checkout'
    },
    {
      name: '🎵 Tip para DJs',
      title: '💡 Tip de la semana',
      body: 'Aprende a mezclar videos como un pro. ¡Lee nuestro nuevo tutorial!',
      url: '/blog/tips'
    }
  ]

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const res = await fetch('/api/push/send')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Error cargando stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyTemplate = (template: typeof templates[0]) => {
    setTitle(template.title)
    setBody(template.body)
    setUrl(template.url)
  }

  const handleSend = async () => {
    if (!title.trim()) {
      toast.error('El título es requerido')
      return
    }

    setSending(true)

    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url, target })
      })

      const data = await res.json()

      if (data.success) {
        toast.success(`Notificación enviada a ${data.sent} usuarios`)
        if (data.failed > 0) {
          toast.warning(`${data.failed} envíos fallaron`)
        }
        // Limpiar formulario
        setTitle('')
        setBody('')
        setUrl('/')
      } else {
        toast.error(data.error || 'Error enviando notificación')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-bear-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-bear-blue hover:underline text-sm">
              ← Volver al Admin
            </Link>
            <h1 className="text-3xl font-black mt-2">🔔 Notificaciones Push</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bear-blue/20 border border-bear-blue/30 rounded-2xl p-6 text-center"
          >
            <p className="text-4xl font-black text-bear-blue">
              {loading ? '...' : stats?.total || 0}
            </p>
            <p className="text-sm text-gray-400">Suscriptores totales</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-green-500/20 border border-green-500/30 rounded-2xl p-6 text-center"
          >
            <p className="text-4xl font-black text-green-400">
              {loading ? '...' : stats?.withUser || 0}
            </p>
            <p className="text-sm text-gray-400">Con cuenta</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-purple-500/20 border border-purple-500/30 rounded-2xl p-6 text-center"
          >
            <p className="text-4xl font-black text-purple-400">
              {loading ? '...' : stats?.anonymous || 0}
            </p>
            <p className="text-sm text-gray-400">Anónimos</p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Formulario */}
          <div className="bg-white/5 border border-bear-blue/20 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6">Enviar Notificación</h2>

            <div className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-sm font-bold mb-2">Título *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="¡Nueva actualización!"
                  className="w-full bg-white/10 border border-bear-blue/30 rounded-xl px-4 py-3 focus:outline-none focus:border-bear-blue"
                  maxLength={100}
                />
              </div>

              {/* Cuerpo */}
              <div>
                <label className="block text-sm font-bold mb-2">Mensaje</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Descripción de la notificación..."
                  rows={3}
                  className="w-full bg-white/10 border border-bear-blue/30 rounded-xl px-4 py-3 focus:outline-none focus:border-bear-blue resize-none"
                  maxLength={200}
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-bold mb-2">URL al hacer clic</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="/"
                  className="w-full bg-white/10 border border-bear-blue/30 rounded-xl px-4 py-3 focus:outline-none focus:border-bear-blue"
                />
              </div>

              {/* Target */}
              <div>
                <label className="block text-sm font-bold mb-2">Enviar a</label>
                <div className="flex gap-2">
                  {[
                    { value: 'all', label: 'Todos' },
                    { value: 'users', label: 'Solo usuarios' },
                    { value: 'anonymous', label: 'Solo anónimos' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTarget(opt.value as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                        target === opt.value
                          ? 'bg-bear-blue text-bear-black'
                          : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {title && (
                <div className="bg-black/30 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-2">Vista previa:</p>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-bear-blue/20 rounded-lg flex items-center justify-center">
                      🔔
                    </div>
                    <div>
                      <p className="font-bold text-sm">{title}</p>
                      <p className="text-xs text-gray-400">{body || 'Sin mensaje'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botón enviar */}
              <button
                onClick={handleSend}
                disabled={sending || !title.trim()}
                className="w-full bg-bear-blue text-bear-black font-black py-4 rounded-xl hover:bg-bear-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Enviando...' : `Enviar a ${stats?.total || 0} suscriptores`}
              </button>
            </div>
          </div>

          {/* Plantillas */}
          <div className="bg-white/5 border border-bear-blue/20 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6">Plantillas Rápidas</h2>
            
            <div className="space-y-3">
              {templates.map((template, i) => (
                <button
                  key={i}
                  onClick={() => applyTemplate(template)}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 text-left transition-colors"
                >
                  <p className="font-bold mb-1">{template.name}</p>
                  <p className="text-sm text-gray-400 truncate">{template.body}</p>
                </button>
              ))}
            </div>

            {/* Info */}
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <p className="text-yellow-400 font-bold text-sm mb-2">💡 Tips</p>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Usa emojis para mayor engagement</li>
                <li>• Mantén el título corto (máx 50 chars)</li>
                <li>• El mensaje debe ser claro y con CTA</li>
                <li>• No envíes más de 2-3 por semana</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
