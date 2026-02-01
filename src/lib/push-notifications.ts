// ==========================================
// SISTEMA DE PUSH NOTIFICATIONS
// ==========================================

// VAPID Keys - Generar: npx web-push generate-vapid-keys. Sin clave no se registran push.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

/**
 * Verificar si el navegador soporta notificaciones
 */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 
         'serviceWorker' in navigator && 
         'PushManager' in window &&
         'Notification' in window
}

/**
 * Obtener estado del permiso
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

/**
 * Registrar Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) {
    console.warn('Push notifications no soportadas')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service Worker registrado:', registration.scope)
    return registration
  } catch (error) {
    console.error('Error registrando Service Worker:', error)
    return null
  }
}

/**
 * Solicitar permiso para notificaciones
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    return 'denied'
  }

  const permission = await Notification.requestPermission()
  console.log('Permiso de notificaciones:', permission)
  return permission
}

/**
 * Suscribir al usuario a push notifications
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!VAPID_PUBLIC_KEY) return null
  try {
    // Registrar SW si no está
    const registration = await navigator.serviceWorker.ready

    // Verificar si ya está suscrito
    let subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      console.log('Ya suscrito a push:', subscription)
      return subscription
    }

    // Crear nueva suscripción
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
    })

    console.log('Nueva suscripción push:', subscription)

    // Guardar en el servidor
    await saveSubscription(subscription)

    return subscription
  } catch (error) {
    console.error('Error suscribiendo a push:', error)
    return null
  }
}

/**
 * Desuscribir de push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      await subscription.unsubscribe()
      await removeSubscription(subscription)
      console.log('Desuscrito de push')
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error desuscribiendo:', error)
    return false
  }
}

/**
 * Guardar suscripción en el servidor
 */
async function saveSubscription(subscription: PushSubscription): Promise<void> {
  try {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON()
      })
    })
  } catch (error) {
    console.error('Error guardando suscripción:', error)
  }
}

/**
 * Eliminar suscripción del servidor
 */
async function removeSubscription(subscription: PushSubscription): Promise<void> {
  try {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    })
  } catch (error) {
    console.error('Error eliminando suscripción:', error)
  }
}

/**
 * Enviar notificación de prueba local
 */
export async function sendLocalNotification(title: string, options?: NotificationOptions): Promise<void> {
  if (Notification.permission !== 'granted') {
    console.warn('No hay permiso para notificaciones')
    return
  }

  const registration = await navigator.serviceWorker.ready
  await registration.showNotification(title, {
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200],
    ...options
  } as Parameters<ServiceWorkerRegistration['showNotification']>[1])
}

/**
 * Convertir VAPID key a Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  
  return outputArray
}
