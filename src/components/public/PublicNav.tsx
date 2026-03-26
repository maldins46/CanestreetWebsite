'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import clsx from 'clsx'

const links = [
  { href: '/',             label: 'Home' },
  { href: '/news',         label: 'News' },
  { href: '/torneo',       label: 'Torneo' },
  { href: '/editions',     label: 'Edizioni' },
  { href: '/chi-siamo',    label: 'Chi siamo' },
  { href: '/regolamento',  label: 'Regolamento' },
  { href: '/sponsor',      label: 'Sponsor' },
  { href: '/register',     label: 'Iscriviti',  accent: true },
]

export default function PublicNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-court-border bg-court-black/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <Image src="/lion.png" alt="Canestreet 3×3" width={40} height={40} className="h-10 w-auto" priority />
        </Link>

        {/* Mobile CTA — Iscriviti button, top-right */}
        <Link
          href="/register"
          className="md:hidden bg-brand-orange hover:bg-brand-light text-white font-display font-semibold uppercase tracking-wide text-xs px-4 py-2 transition-colors"
        >
          Iscriviti
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
  )
}
