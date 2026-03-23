import type { Metadata, Viewport } from 'next'
import { Barlow_Condensed, Barlow } from 'next/font/google'
import './globals.css'

// Display font — condensed, sporty, authoritative
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-display',
})

// Body font — readable, clean
const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f26522',
}

export const metadata: Metadata = {
  title: { default: 'Canestreet 3x3', template: '%s · Canestreet 3x3' },
  description: 'Il torneo estivo di basket 3x3 — Canestreet.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Canestreet 3x3',
  },
  formatDetection: { telephone: false },
  openGraph: {
    siteName: 'Canestreet 3x3',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${barlowCondensed.variable} ${barlow.variable}`}>
      <body className="bg-court-black text-court-white font-body antialiased">
        {children}
      </body>
    </html>
  )
}
