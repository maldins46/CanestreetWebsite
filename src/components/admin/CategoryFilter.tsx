'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { TeamCategory } from '@/types'

const options: { value: TeamCategory | 'all'; label: string }[] = [
  { value: 'all',  label: 'Tutte' },
  { value: 'open', label: 'Open' },
  { value: 'u14',  label: 'U14' },
  { value: 'u16',  label: 'U16' },
  { value: 'u18',  label: 'U18' },
]

export default function CategoryFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('category') ?? 'all'

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') params.delete('category')
    else params.set('category', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => select(opt.value)}
          className={`px-3 py-1.5 font-display uppercase tracking-wide text-xs border transition-colors ${
            current === opt.value
              ? 'bg-brand-orange border-brand-orange text-court-dark'
              : 'border-court-border text-court-muted hover:border-court-muted hover:text-court-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
