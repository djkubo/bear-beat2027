'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  isPushSupported, 
  getNotificationPermission, 
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPush
} from '@/lib/push-notifications'

// ==========================================
// PROMPT PARA ACTIVAR NOTIFICACIONES PUSH
// ==========================================

export function PushPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [permission, setPermission] = useState<string>('default')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Registrar service worker al cargar
    registerServiceWorker()

    // Verificar si debemos mostrar el prompt
    const checkPermission = () => {
      if (!isPushSupported()) return

      const perm = getNotificationPermission()
      setPermission(perm)

      // Mostrar prompt si:
      // 1. El permiso es 'default' (no ha decidido)
      // 2. No lo ha cerrado antes (localStorage)
      // 3. Ha pasado tiempo desde que lo cerró
      const dismissed = localStorage.getItem('push_prompt_dismissed')
      const dismissedAt = localStorage.getItem('push_prompt_dismissed_at')
      
      if (perm === 'default' && !dismissed) {
        // Esperar 10 segundos antes de mostrar
        setTimeout(() => setShowPrompt(true), 10000)
      } else if (dismissed && dismissedAt) {
        // Si lo cerró hace más de 7 días, mostrar de nuevo
        const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24)
        if (daysSinceDismissed > 7) {
          localStorage.removeItem('push_prompt_dismissed')
          setTimeout(() => setShowPrompt(true), 10000)
        }
      }
    }

    checkPermission()
  }, [])

  const handleEnable = async () => {
    setLoading(true)
    
    try {
      const perm = await requestNotificationPermission()
      setPermission(perm)

      if (perm === 'granted') {
        await subscribeToPush()
        setShowPrompt(false)
      }
    } catch (error) {
      console.error('Error activando notificaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('push_prompt_dismissed', 'true')
    localStorage.setItem('push_prompt_dismissed_at', Date.now().toString())
  }

  if (!isPushSupported() || permission === 'granted' || permission === 'denied') {
    return null
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-96 z-40"
        >
          <div className="bg-bear-black border-2 border-bear-blue/50 rounded-2xl p-5 shadow-2xl shadow-bear-blue/20">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="text-4xl">🔔</div>
              <div>
                <h3 className="font-bold text-lg">¿Activar notificaciones?</h3>
                <p className="text-sm text-gray-400">
                  Te avisamos cuando haya nuevos packs o promociones exclusivas
                </p>
              </div>
            </div>

            {/* Beneficios */}
            <ul className="text-sm text-gray-300 space-y-1 mb-4 pl-2">
              <li>✅ Nuevos packs disponibles</li>
              <li>✅ Ofertas y descuentos</li>
              <li>✅ Tips para DJs</li>
            </ul>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={handleEnable}
                disabled={loading}
                className="flex-1 bg-bear-blue text-bear-black font-bold py-3 rounded-xl hover:bg-bear-blue/90 disabled:opacity-50"
              >
                {loading ? 'Activando...' : 'Sí, activar'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-3 text-gray-400 hover:text-white"
              >
                Ahora no
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Componente para el toggle en configuración
export function NotificationToggle() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    setSupported(isPushSupported())
    setEnabled(getNotificationPermission() === 'granted')
  }, [])

  const handleToggle = async () => {
    if (!supported) return

    setLoading(true)
    
    try {
      if (!enabled) {
        const perm = await requestNotificationPermission()
        if (perm === 'granted') {
          await subscribeToPush()
          setEnabled(true)
        }
      } else {
        // No se puede desactivar programáticamente, solo desde configuración del navegador
        alert('Para desactivar las notificaciones, ve a la configuración de tu navegador.')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!supported) {
    return (
      <div className="text-sm text-gray-500">
        Tu navegador no soporta notificaciones push
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
      <div>
        <p className="font-bold">Notificaciones push</p>
        <p className="text-sm text-gray-400">
          {enabled ? 'Activadas' : 'Desactivadas'}
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`relative w-14 h-8 rounded-full transition-colors ${
          enabled ? 'bg-bear-blue' : 'bg-gray-600'
        }`}
      >
        <div 
          className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
            enabled ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
