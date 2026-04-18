'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Menu, ClipboardList } from 'lucide-react'
import clsx from 'clsx'
import MobileDrawer from './MobileDrawer'

const links = [
  { href: '/',             label: 'Home' },
  { href: '/news',         label: 'News' },
  { href: '/tournament',   label: 'Torneo' },
  { href: '/editions',     label: 'Edizioni' },
  { href: '/about',        label: 'Chi siamo' },
  { href: '/rules',        label: 'Regolamento' },
  { href: '/sponsor',      label: 'Sponsor' },
  { href: '/register',     label: 'Iscriviti',  accent: true },
]

export default function PublicNav() {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  return (
    <>
      <header className="safe-area-top sticky top-0 z-50 border-b border-court-border bg-court-black/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center md:justify-between">

          {/* ── Mobile layout ── */}
          {/* Hamburger — left */}
          <button
            className="md:hidden text-court-gray hover:text-court-white transition-colors p-1 shrink-0"
            onClick={() => setDrawerOpen(true)}
            aria-label="Apri menu"
            aria-expanded={drawerOpen}
          >
            <Menu size={24} />
          </button>

          {/* Brand lockup — centered (absolute on mobile, normal flow on desktop) */}
          <Link
            href="/"
            className="
              md:hidden
              absolute left-1/2 -translate-x-1/2
              flex items-center gap-2
            "
          >
            <Image
              src="/canestreet-vector.svg"
              alt="Canestreet"
              width={126}
              height={20}
              className="h-5 w-auto brightness-0 invert"
              priority
            />
          </Link>

          {/* Iscriviti tab — right (mobile only) */}
          <Link
            href="/register"
            className="md:hidden ml-auto flex flex-col items-center gap-0.5 text-brand-orange px-1"
          >
            <ClipboardList size={20} strokeWidth={1.8} />
            <span
              className="font-display font-semibold uppercase tracking-wide leading-none"
              style={{ fontSize: '9px' }}
            >
              Iscriviti
            </span>
          </Link>

          {/* ── Desktop layout ── */}
          {/* Logo — left */}
          <Link href="/" className="hidden md:flex items-center shrink-0">
            <Image src="/lion.png" alt="Canestreet 3×3" width={32} height={41} className="h-10 shrink-0" priority />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0">
            {links.map(({ href, label, accent }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'px-3 py-2 font-display font-semibold uppercase tracking-wide text-sm transition-colors whitespace-nowrap',
                  accent
                    ? 'bg-brand-orange hover:bg-brand-light text-white ml-2'
                    : pathname === href
                    ? 'text-court-white'
                    : 'text-court-gray hover:text-court-white'
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

        </div>
      </header>

      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
