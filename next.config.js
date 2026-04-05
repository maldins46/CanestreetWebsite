// Patch the default runtime cache: swap NetworkFirst+24h for NetworkOnly on
// dynamic page routes so the service worker never caches server-rendered HTML
// or RSC payloads. Without this, the SW caches the minimal RSC prefetch skeleton
// (no DB data) and serves it for full navigations, making all DB-driven sections
// appear empty until the 24-hour TTL expires.
const { runtimeCaching: defaultCache } = require('@ducanh2912/next-pwa')

const DYNAMIC_CACHE_NAMES = new Set([
  'pages-rsc-prefetch', // minimal prefetch skeleton — must never be served as full page
  'pages-rsc',          // full RSC navigation payloads — contain live DB data
  'pages',              // full HTML responses
  'next-data',          // _next/data JSON (pages router)
])

const patchedCache = defaultCache.map((entry) => {
  if (DYNAMIC_CACHE_NAMES.has(entry.options?.cacheName)) {
    return {
      ...entry,
      handler: 'NetworkOnly',
      options: { cacheName: entry.options.cacheName },
    }
  }
  return entry
})

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  // runtimeCaching must live inside workboxOptions (library internal requirement)
  workboxOptions: {
    runtimeCaching: patchedCache,
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Local Supabase dev instance
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = withPWA(nextConfig)
