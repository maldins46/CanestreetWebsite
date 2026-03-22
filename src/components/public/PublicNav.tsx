'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'
import clsx from 'clsx'

const links = [
  { href: '/',             label: 'Home' },
  { href: '/standings',    label: 'Classifica' },
  { href: '/news',         label: 'News' },
  { href: '/editions',     label: 'Edizioni' },
  { href: '/chi-siamo',    label: 'Chi siamo' },
  { href: '/regolamento',  label: 'Regolamento' },
  { href: '/register',     label: 'Iscriviti',  accent: true },
]

export default function PublicNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-court-border bg-court-black/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <Image src="/lion.png" alt="Canestreet 3×3" width={40} height={40} className="h-10 w-auto" priority />
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

        {/* Mobile toggle */}
        <button
          className="md:hidden text-court-gray hover:text-court-white p-2"
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="md:hidden border-t border-court-border bg-court-dark animate-slide-down">
          {links.map(({ href, label, accent }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={clsx(
                'block px-6 py-4 font-display font-semibold uppercase tracking-wide border-b border-court-border/50',
                accent ? 'text-brand-orange' : 'text-court-light hover:text-court-white'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
