'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Newspaper, Trophy, Users, BookOpen } from 'lucide-react'
import clsx from 'clsx'

const tabs = [
  { href: '/',             label: 'Home',      Icon: Home },
  { href: '/news',         label: 'News',      Icon: Newspaper },
  { href: '/editions',     label: 'Edizioni',  Icon: Trophy },
  { href: '/chi-siamo',    label: 'Chi siamo', Icon: Users },
  { href: '/regolamento',  label: 'Regolam.',  Icon: BookOpen },
]

export default function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-court-dark border-t border-court-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {tabs.map(({ href, label, Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-2 relative transition-colors',
                isActive ? 'text-brand-orange' : 'text-court-gray hover:text-court-light'
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-2 right-2 h-[2px] bg-brand-orange rounded-b-full" />
              )}
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              <span
                className="font-display font-semibold uppercase tracking-wide leading-none"
                style={{ fontSize: '9px' }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
