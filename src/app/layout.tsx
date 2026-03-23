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
  themeColor: '#0a0a0a',
}

export const metadata: Metadata = {
  title: { default: 'Canestreet 3x3', template: '%s · Canestreet 3x3' },
  description: 'A FIP 3x3 Summer Tournament. In the heart of Jesi.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Canestreet 3x3',
  },
  formatDetection: { telephone: false },
  icons: {
    apple: [
      { url: '/icons/apple-icon.png', sizes: '180x180' },
    ],
  },
  other: {
    'msapplication-TileColor': '#0a0a0a',
    'msapplication-TileImage': '/icons/ms-icon-144x144.png',
    'msapplication-config': '/browserconfig.xml',
  },
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
