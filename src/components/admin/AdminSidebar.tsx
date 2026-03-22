'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Users, BarChart2, Newspaper, Image, ShieldCheck, LogOut, Home, ExternalLink, Trophy, UserCircle } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'

const nav = [
  { href: '/admin',           label: 'Dashboard',  icon: Home },
  { href: '/admin/teams',     label: 'Squadre',    icon: Users },
  { href: '/admin/standings', label: 'Classifica', icon: BarChart2 },
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

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <aside className="w-56 shrink-0 bg-court-dark border-r border-court-border flex flex-col sticky top-0 h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-court-border">
        <p className="font-display font-extrabold uppercase tracking-widest text-brand-orange text-sm">
          Canestreet
        </p>
        <p className="text-court-muted text-xs mt-0.5 font-display uppercase tracking-wide">Backoffice</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
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
  )
}
