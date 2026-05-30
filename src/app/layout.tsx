import type { Metadata, Viewport } from 'next'
import { Rajdhani, Nunito_Sans, Teko } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ServiceWorkerCleanup } from '@/components/ServiceWorkerCleanup'
import './globals.css'

// Display font — condensed geometric, more open than Barlow Condensed
const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
})

// Hero font — bold slab-like impact
const teko = Teko({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hero',
})

// Body font — rounded, warm, very readable at all sizes
const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
}

export const metadata: Metadata = {
  title: { default: 'Canestreet 3×3', template: '%s · Canestreet 3×3' },
  description: 'A FIP 3×3 Summer Tournament. In the heart of Jesi.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Canestreet 3×3',
  },
  formatDetection: { telephone: false },
  icons: {
    apple: [
      { url: '/icons/apple-icon.png', sizes: '180x180' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#0a0a0a',
    'msapplication-TileImage': '/icons/ms-icon-144x144.png',
    'msapplication-config': '/browserconfig.xml',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://canestreet3x3.vercel.app'),
  openGraph: {
    siteName: 'Canestreet 3×3',
    type: 'website',
    images: [{ url: '/icons/android-icon-512x512.png', width: 512, height: 512 }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning data-scroll-behavior="smooth" className={`${rajdhani.variable} ${teko.variable} ${nunitoSans.variable}`}>
      <body className="bg-court-black text-court-white font-body antialiased">
        <ServiceWorkerCleanup />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
