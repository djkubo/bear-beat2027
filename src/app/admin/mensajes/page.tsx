'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

// ==========================================
// PANEL ADMIN - MENSAJES A USUARIOS
// ==========================================

interface User {
  id: string
  email: string
  name: string
}

export default function AdminMensajes() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [messageType, setMessageType] = useState<'email' | 'push' | 'all'>('email')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    checkAdmin()
    loadUsers()

    // Si viene un userId en la URL, preseleccionarlo
    const userId = searchParams.get('userId')
    if (userId) {
      setSelectedUsers([userId])
    }
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      router.push('/')
    }
  }

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name')
        .order('created_at', { ascending: false })

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
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const selectAll = () => {
    setSelectedUsers(users.map(u => u.id))
  }

  const clearSelection = () => {
    setSelectedUsers([])
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
        // Aquí implementarías el envío de emails
        // Por ahora solo mostramos un mensaje de éxito
        toast.info('Función de emails en desarrollo - Integrar con Resend')
      }

      if (messageType === 'push' || messageType === 'all') {
        // Enviar push notifications
        const response = await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: subject || 'Mensaje de Bear Beat',
            body: message,
            url: '/',
            target: 'specific_users',
            userIds: selectedUsers
          })
        })

        const data = await response.json()

        if (response.ok) {
          toast.success(`Push enviado a ${data.sent || 0} usuarios`)
        } else {
          throw new Error(data.error || 'Error al enviar push')
        }
      }

      // Limpiar formulario
      setSubject('')
      setMessage('')
      setSelectedUsers([])

    } catch (error: any) {
      console.error('Error sending message:', error)
      toast.error(error.message || 'Error al enviar mensaje')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">✉️ Enviar Mensajes</h1>
            <p className="text-sm text-gray-400">Comunicación con usuarios</p>
          </div>
          <Link href="/admin/dashboard">
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
              ← Volver al Dashboard
            </button>
          </Link>
        </div>
      </header>

      {/* Navegación Admin */}
      <nav className="bg-gray-800/50 border-b border-gray-700 px-6">
        <div className="max-w-7xl mx-auto flex gap-4 overflow-x-auto py-2">
          <Link href="/admin/dashboard">
            <div className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg whitespace-nowrap">
              📊 Dashboard
            </div>
          </Link>
          <Link href="/admin/usuarios">
            <div className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg whitespace-nowrap">
              👥 Usuarios
            </div>
          </Link>
          <Link href="/admin/ventas">
            <div className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg whitespace-nowrap">
              💰 Ventas
            </div>
          </Link>
          <Link href="/admin/metricas">
            <div className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg whitespace-nowrap">
              📈 Métricas
            </div>
          </Link>
          <Link href="/admin/mensajes">
            <div className="px-4 py-2 bg-blue-600 rounded-lg font-bold whitespace-nowrap">
              ✉️ Mensajes
            </div>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Formulario de Mensaje */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tipo de Mensaje */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <h3 className="text-xl font-black mb-4">📱 Tipo de Mensaje</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => setMessageType('email')}
                  className={`flex-1 py-3 rounded-xl font-bold transition ${
                    messageType === 'email'
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  📧 Email
                </button>
                <button
                  onClick={() => setMessageType('push')}
                  className={`flex-1 py-3 rounded-xl font-bold transition ${
                    messageType === 'push'
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  📱 Push
                </button>
                <button
                  onClick={() => setMessageType('all')}
                  className={`flex-1 py-3 rounded-xl font-bold transition ${
                    messageType === 'all'
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  🔔 Ambos
                </button>
              </div>
            </div>

            {/* Asunto */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <label className="block text-lg font-black mb-3">
                {messageType === 'email' ? '📧 Asunto del Email' : '📱 Título de la Notificación'}
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej: ¡Nuevo pack disponible!"
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Mensaje */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <label className="block text-lg font-black mb-3">✏️ Mensaje</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                rows={10}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-blue-500"
              />
              <p className="text-sm text-gray-400 mt-2">{message.length} caracteres</p>
            </div>

            {/* Botón Enviar */}
            <button
              onClick={handleSendMessage}
              disabled={sending || selectedUsers.length === 0 || !message.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-black text-xl py-6 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {sending ? '⏳ Enviando...' : `📤 Enviar a ${selectedUsers.length} usuario(s)`}
            </button>
          </div>

          {/* Lista de Usuarios */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black">👥 Destinatarios</h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
                >
                  Todos
                </button>
                <button
                  onClick={clearSelection}
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              Seleccionados: <span className="text-green-400 font-bold">{selectedUsers.length}</span> de {users.length}
            </p>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={`p-3 rounded-lg cursor-pointer transition ${
                    selectedUsers.includes(user.id)
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <p className="font-bold text-sm">{user.name || 'Sin nombre'}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
