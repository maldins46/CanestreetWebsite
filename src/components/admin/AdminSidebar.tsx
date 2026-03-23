'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Users, Newspaper, Image, ShieldCheck, LogOut, Home, ExternalLink, Trophy, UserCircle, Menu, X } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'

const nav = [
  { href: '/admin',           label: 'Dashboard',  icon: Home },
  { href: '/admin/teams',     label: 'Squadre',    icon: Users },
  { href: '/admin/editions',  label: 'Edizioni',   icon: Trophy },
  { href: '/admin/news',      label: 'News',       icon: Newspaper },
  { href: '/admin/staff',     label: 'Staff',      icon: UserCircle },
  { href: '/admin/media',     label: 'Media',      icon: Image },
  { href: '/admin/admins',    label: 'Admins',     icon: ShieldCheck },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-court-dark border-b border-court-border flex items-center justify-between px-4">
        <p className="font-display font-extrabold uppercase tracking-widest text-brand-orange text-sm">
          Canestreet <span className="text-court-muted font-normal">/ Backoffice</span>
        </p>
        <button
          onClick={() => setOpen(true)}
          className="text-court-gray hover:text-court-white p-1"
          aria-label="Apri menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — fixed drawer on mobile, in-flow on desktop */}
      <aside
        className={clsx(
          'flex flex-col bg-court-dark border-r border-court-border',
          // Mobile: fixed full-height drawer, slides in from left
          'fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
          // Desktop: in-flow sticky sidebar
          'md:relative md:translate-x-0 md:w-56 md:shrink-0 md:sticky md:top-0 md:h-screen md:z-auto md:transition-none'
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-court-border flex items-center justify-between">
          <div>
            <p className="font-display font-extrabold uppercase tracking-widest text-brand-orange text-sm">
              Canestreet
            </p>
            <p className="text-court-muted text-xs mt-0.5 font-display uppercase tracking-wide">Backoffice</p>
          </div>
          <button
            className="md:hidden text-court-gray hover:text-court-white p-1"
            onClick={() => setOpen(false)}
            aria-label="Chiudi menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-6 py-3 text-sm font-display uppercase tracking-wide transition-colors',
                  active
                    ? 'text-brand-orange bg-brand-orange/5 border-r-2 border-brand-orange'
                    : 'text-court-gray hover:text-court-white hover:bg-court-surface'
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-court-border space-y-1">
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-2 py-2 text-xs text-court-muted hover:text-court-white font-display uppercase tracking-wide transition-colors"
          >
            <ExternalLink size={14} />
            Vedi il sito
          </a>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-2 py-2 text-xs text-court-muted hover:text-red-400 font-display uppercase tracking-wide transition-colors w-full text-left"
          >
            <LogOut size={14} />
            Esci
          </button>
        </div>
      </aside>
    </>
  )
}
