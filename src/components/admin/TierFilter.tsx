'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { SponsorTier } from '@/types'

const options: { value: SponsorTier | 'all'; label: string }[] = [
  { value: 'all',    label: 'Tutti' },
  { value: 'main',   label: 'Main' },
  { value: 'gold',   label: 'Gold' },
  { value: 'silver', label: 'Silver' },
  { value: 'bronze', label: 'Bronze' },
]

export default function TierFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('tier') ?? 'all'

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') params.delete('tier')
    else params.set('tier', value)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
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
