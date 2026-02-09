'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  name: string
}

export default function AdminMensajes() {
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [messageType, setMessageType] = useState<'email' | 'push' | 'all'>('email')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [linkUrl, setLinkUrl] = useState('/')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadUsers()
    const userId = searchParams.get('userId')
    if (userId) setSelectedUsers([userId])
  }, [])

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('id, email, name').order('created_at', { ascending: false })
      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const handleSendMessage = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Selecciona al menos un usuario')
      return
    }
    if (!message.trim()) {
      toast.error('Escribe un mensaje')
      return
    }
    if (messageType === 'email' && !subject.trim()) {
      toast.error('El asunto es requerido para emails')
      return
    }
    setSending(true)
    try {
      if (messageType === 'email' || messageType === 'all') {
        toast.info('Emails masivos: pendiente. Para reenviar accesos usa "Rescate pagos".')
      }
      if (messageType === 'push' || messageType === 'all') {
        const response = await fetch('/api/admin/send-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: subject || 'Mensaje de Bear Beat',
            body: message,
            url: linkUrl || '/',
            icon: '/favicon.png',
            userIds: selectedUsers,
          })
        })
        const data = await response.json()
        if (response.ok) {
          toast.success(`Push enviado: ${data.sent || 0}/${data.total || 0}`)
        } else {
          throw new Error(data.error || 'Error al enviar push')
        }
      }
      setSubject('')
      setMessage('')
      setLinkUrl('/')
      setSelectedUsers([])
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar mensaje')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-bear-blue/30 border-t-bear-blue rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="border-b border-white/5 bg-zinc-950/80">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <a href="/admin" className="text-sm text-bear-blue hover:underline mb-2 block font-medium">
            ← Volver al Panel
          </a>
          <h1 className="text-2xl md:text-3xl font-black text-white">✉️ Enviar Mensajes</h1>
          <p className="text-gray-400 text-sm mt-1">Comunicación con usuarios</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80">
              <h3 className="text-xl font-bold text-white mb-4">📱 Tipo de Mensaje</h3>
              <div className="flex gap-3">
                {(['email', 'push', 'all'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setMessageType(type)}
                    className={`flex-1 py-3 rounded-xl font-bold transition border ${
                      messageType === type
                        ? 'bg-bear-blue text-bear-black border-bear-blue'
                        : 'bg-zinc-800 border-white/5 text-gray-300 hover:bg-zinc-700'
                    }`}
                  >
                    {type === 'email' ? '📧 Email' : type === 'push' ? '📱 Push' : '🔔 Ambos'}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80">
              <label className="block text-sm font-bold text-white mb-2">
                {messageType === 'email' ? '📧 Asunto' : '📱 Título'}
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej: ¡Nuevo pack disponible!"
                className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-bear-blue"
              />
            </div>

            <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80">
              <label className="block text-sm font-bold text-white mb-2">🔗 URL al abrir</label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="/contenido"
                className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-bear-blue"
              />
              <p className="text-xs text-gray-500 mt-2">Tip: usa rutas internas como <code className="bg-zinc-800 px-1 rounded">/contenido</code> o <code className="bg-zinc-800 px-1 rounded">/dashboard</code>.</p>
            </div>

            <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80">
              <label className="block text-sm font-bold text-white mb-2">✏️ Mensaje</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe tu mensaje..."
                rows={10}
                className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-bear-blue resize-none"
              />
              <p className="text-sm text-gray-500 mt-2">{message.length} caracteres</p>
            </div>

            <button
              onClick={handleSendMessage}
              disabled={sending || selectedUsers.length === 0 || !message.trim()}
              className="w-full bg-bear-blue text-bear-black font-black text-lg py-4 rounded-xl hover:bg-bear-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {sending ? '⏳ Enviando...' : `📤 Enviar a ${selectedUsers.length} usuario(s)`}
            </button>
          </div>

          <div className="rounded-xl p-6 border border-white/5 bg-zinc-900/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">👥 Destinatarios</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUsers(users.map(u => u.id))}
                  className="text-xs px-3 py-1.5 rounded-lg bg-bear-blue/20 text-bear-blue font-bold hover:bg-bear-blue/30 border border-bear-blue/30"
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUsers([])}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-gray-400 hover:bg-white/5"
                >
                  Limpiar
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Seleccionados: <span className="text-bear-blue font-bold">{selectedUsers.length}</span> de {users.length}
            </p>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {users.map((user) => {
                const checked = selectedUsers.includes(user.id)
                return (
                  <label
                    key={user.id}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition border ${
                      checked
                        ? 'bg-bear-blue/15 border-bear-blue/40'
                        : 'bg-zinc-800/50 border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleUser(user.id)}
                      className="mt-0.5 h-4 w-4 rounded border-white/30 bg-zinc-900 text-bear-blue focus:ring-bear-blue/40"
                      aria-label={`Seleccionar ${user.email}`}
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-white truncate">{user.name || 'Sin nombre'}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
