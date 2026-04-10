'use client'

import { useEffect } from 'react'

// One-time SW unregistration for users who had the old @ducanh2912/next-pwa
// service worker installed. Without this, existing users keep the old SW
// active indefinitely after it was removed from the codebase.
// This component can be removed once enough time has passed (a few months).
export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.getRegistrations().then((regs) =>
      regs.forEach((r) => r.unregister())
    )
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
    }
  }, [])

  return null
}
