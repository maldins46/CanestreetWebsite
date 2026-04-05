'use client'

import { useEffect } from 'react'

// Bump this string whenever the SW runtime cache strategy changes significantly,
// to force a one-time cleanup on every existing user's browser.
const CACHE_CLEAR_VERSION = 'v1'
const LS_KEY = 'sw-cache-cleared'

// Cache names that were written by the old NetworkFirst strategy and are now
// handled by NetworkOnly (so nothing new will be written, but old stale entries
// are still sitting in the user's browser until we explicitly delete them).
const STALE_CACHE_NAMES = ['pages-rsc', 'pages-rsc-prefetch', 'pages', 'next-data']

export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!('caches' in window)) return
    if (localStorage.getItem(LS_KEY) === CACHE_CLEAR_VERSION) return

    Promise.all(STALE_CACHE_NAMES.map((name) => caches.delete(name))).then(() => {
      localStorage.setItem(LS_KEY, CACHE_CLEAR_VERSION)
    })
  }, [])

  return null
}
