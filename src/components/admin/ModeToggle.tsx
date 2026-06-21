'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const modes = [
  { value: 'registration', label: 'Iscrizioni' },
  { value: 'checkin',      label: 'Check-in' },
]

export default function ModeToggle() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('mode') ?? 'registration'

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'registration') params.delete('mode')
    else params.set('mode', value)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex border border-court-border overflow-hidden shrink-0">
      {modes.map(m => (
        <button
          key={m.value}
          onClick={() => select(m.value)}
          className={`px-3 py-1.5 font-display uppercase tracking-wide text-xs transition-colors ${
            current === m.value
              ? 'bg-brand-orange text-court-dark'
              : 'text-court-muted hover:text-court-white'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
