self.addEventListener('install', event => event.waitUntil(self.skipWaiting()))
self.addEventListener('activate', event => event.waitUntil(clients.claim()))

self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Cane Street', {
      body: data.body ?? '',
      icon: '/icons/android-icon-192x192.png',
      badge: '/icons/android-icon-72x72.png',
      tag: data.tag ?? `canestreet-${Date.now()}`,
      data: { url: data.url ?? '/' },
      requireInteraction: true,
    }),
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
