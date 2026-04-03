'use client'
import { Sun, Moon, Monitor } from 'lucide-react'
import clsx from 'clsx'
import type { AdminTheme } from '@/hooks/useAdminTheme'

const OPTIONS: { value: AdminTheme; icon: React.ElementType; label: string }[] = [
  { value: 'light',  icon: Sun,     label: 'Chiaro' },
  { value: 'dark',   icon: Moon,    label: 'Scuro' },
  { value: 'system', icon: Monitor, label: 'Sistema' },
]

export default function AdminThemeToggle({
  theme,
  onThemeChange,
}: {
  theme: AdminTheme
  onThemeChange: (t: AdminTheme) => void
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <span className="text-xs text-court-muted font-display uppercase tracking-wider flex-1">
        Tema
      </span>
      <div className="flex items-center border border-court-border rounded overflow-hidden">
        {OPTIONS.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => onThemeChange(value)}
            title={label}
            aria-label={label}
            aria-pressed={theme === value}
            className={clsx(
              'p-1.5 transition-colors',
              theme === value
                ? 'bg-brand-orange text-white'
                : 'text-court-muted hover:text-court-white hover:bg-court-surface'
            )}
          >
            <Icon size={13} />
          </button>
        ))}
      </div>
    </div>
  )
}
