// ==========================================
// SERVICE WORKER - Para Push Notifications
// ==========================================

const CACHE_NAME = 'bear-beat-v1'

// Instalación
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...')
  self.skipWaiting()
})

// Activación
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activado')
  event.waitUntil(clients.claim())
})

// No cachear /api/ para que portadas y datos en tiempo real siempre vengan frescos
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }))
  }
})

// Recibir notificación push
self.addEventListener('push', (event) => {
  console.log('[SW] Push recibido:', event)

  let data = {
    title: 'Bear Beat',
    body: '¡Tienes una nueva notificación!',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: 'bear-beat-notification',
    data: { url: '/' }
  }

  // Si viene data del servidor
  if (event.data) {
    try {
      const payload = event.data.json()
      data = { ...data, ...payload }
    } catch (e) {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.png',
    badge: data.badge || '/favicon.png',
    tag: data.tag || 'bear-beat',
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [
      { action: 'open', title: 'Ver más' },
      { action: 'close', title: 'Cerrar' }
    ],
    data: data.data || { url: '/' }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificación clickeada:', event)
  
  event.notification.close()

  const action = event.action
  const url = event.notification.data?.url || '/'

  if (action === 'close') {
    return
  }

  // Abrir o enfocar la ventana
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url.includes('bearbeat') && 'focus' in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        // Si no, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})

// Cerrar notificación
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificación cerrada')
})
