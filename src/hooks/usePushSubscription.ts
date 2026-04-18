'use client'

import { useEffect, useState } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

export function usePushSubscription() {
  const [supported, setSupported] = useState(false)
  const [ready, setReady] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [denied, setDenied] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setSupported(true)

    if (Notification.permission === 'denied') {
      setDenied(true)
      setReady(true)
      return
    }

    navigator.serviceWorker.register('/sw.js').then(async reg => {
      // Wait for the SW to be fully active before proceeding —
      // serviceWorker.ready has a Chrome bug where it doesn't resolve
      // even when controller is already activated.
      if (!reg.active) {
        await new Promise<void>(resolve => {
          const sw = reg.installing ?? reg.waiting
          if (!sw) { resolve(); return }
          sw.addEventListener('statechange', function handler() {
            if ((sw as ServiceWorker).state === 'activated') {
              sw.removeEventListener('statechange', handler)
              resolve()
            }
          })
        })
      }

      const existing = await reg.pushManager.getSubscription()
      setSubscribed(!!existing)
      setReady(true)
    }).catch(err => {
      console.error('[push] register failed:', err)
      setReady(true)
    })
  }, [])

  async function subscribe() {
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'denied') { setDenied(true); return }
      if (permission !== 'granted') return

      // Re-register is idempotent — returns existing reg if already active
      const reg = await navigator.serviceWorker.register('/sw.js')
      if (!reg.active) {
        await new Promise<void>(resolve => {
          const sw = reg.installing ?? reg.waiting
          if (!sw) { resolve(); return }
          sw.addEventListener('statechange', function handler() {
            if ((sw as ServiceWorker).state === 'activated') {
              sw.removeEventListener('statechange', handler)
              resolve()
            }
          })
        })
      }
      // Evict any stale subscription (mismatched VAPID key → storage error)
      const stale = await reg.pushManager.getSubscription()
      if (stale) await stale.unsubscribe()

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      })

      const json = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      })

      setSubscribed(true)
    } catch (err) {
      console.error('[push] subscribe failed:', err)
    } finally {
      setBusy(false)
    }
  }

  async function unsubscribe() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch (err) {
      console.error('[push] unsubscribe failed:', err)
    } finally {
      setBusy(false)
    }
  }

  return { supported, ready, subscribed, denied, busy, subscribe, unsubscribe }
}
