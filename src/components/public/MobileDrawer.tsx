'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { X, ClipboardList } from 'lucide-react'
import clsx from 'clsx'

const navLinks = [
  { href: '/',             label: 'Home' },
  { href: '/news',         label: 'News' },
  { href: '/tournament',   label: 'Torneo' },
  { href: '/editions',     label: 'Edizioni' },
  { href: '/about',        label: 'Chi siamo' },
  { href: '/rules',        label: 'Regolamento' },
  { href: '/sponsor',      label: 'Sponsor' },
]

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname()

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on route change
  useEffect(() => {
    onClose()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 z-[99] bg-black/60 md:hidden transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-[100] w-4/5 max-w-xs flex flex-col bg-court-dark md:hidden',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Menu di navigazione"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-court-border shrink-0"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <Link href="/" className="flex items-center gap-2" onClick={onClose}>
            <Image src="/lion.png" alt="" width={32} height={32} className="h-8 w-auto" />
            <Image src="/canestreet-vector.svg" alt="Canestreet" width={120} height={19} className="h-[19px] w-auto brightness-0 invert" />
          </Link>
          <button
            onClick={onClose}
            className="text-court-gray hover:text-court-white transition-colors p-1"
            aria-label="Chiudi menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul>
            {navLinks.map(({ href, label }) => {
              const isActive = href === '/' ? pathname === href : pathname.startsWith(href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={clsx(
                      'block px-6 py-3 font-display font-semibold uppercase tracking-wider text-sm transition-colors',
                      isActive ? 'text-brand-orange' : 'text-court-light hover:text-court-white'
                    )}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Iscriviti CTA */}
          <div className="px-5 pt-3 pb-2">
            <Link
              href="/register"
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-3 bg-brand-orange hover:bg-brand-light text-white font-display font-bold uppercase tracking-wider text-sm transition-colors"
            >
              <ClipboardList size={16} />
              Iscriviti
            </Link>
          </div>
        </nav>

        {/* Footer */}
        <div className="px-5 py-5 border-t border-court-border shrink-0 space-y-4">
          {/* Socials */}
          <div className="flex gap-5">
            <a href="https://www.instagram.com/canestreet3x3" target="_blank" rel="noopener noreferrer"
               className="text-court-gray hover:text-brand-orange transition-colors" aria-label="Instagram">
              <InstagramIcon />
            </a>
            <a href="https://www.facebook.com/thecanestreet" target="_blank" rel="noopener noreferrer"
               className="text-court-gray hover:text-brand-orange transition-colors" aria-label="Facebook">
              <FacebookIcon />
            </a>
            <a href="https://www.youtube.com/channel/UCtluwkHf-ghko6Ut-Y6PvRg" target="_blank" rel="noopener noreferrer"
               className="text-court-gray hover:text-brand-orange transition-colors" aria-label="YouTube">
              <YouTubeIcon />
            </a>
          </div>

          <div className="space-y-1">
            <Link href="/privacy" onClick={onClose}
              className="block text-court-muted hover:text-court-white text-xs transition-colors">
              Privacy Policy
            </Link>
            <p className="text-court-muted text-xs">
              Another Comepaolo Production, made with love by{' '}
              <a href="https://riccardomaldini.it" target="_blank" rel="noopener noreferrer"
                 className="underline hover:text-brand-orange transition-colors">
                Riccardo Maldini
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
