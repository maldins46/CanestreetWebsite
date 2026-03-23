import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Canestreet 3x3',
    short_name: 'Canestreet',
    description: 'Il torneo estivo di basket 3x3 — Canestreet.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    orientation: 'portrait',
    icons: [
      { src: '/icons/android-icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/android-icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
