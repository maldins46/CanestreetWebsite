'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { TeamCategory } from '@/types'
import { Search } from 'lucide-react'

const options: { value: TeamCategory | 'all' | 'evento'; label: string }[] = [
  { value: 'all',    label: 'Tutte' },
  { value: 'open_m', label: 'Open M' },
  { value: 'open_f', label: 'Open F' },
  { value: 'u14_m',  label: 'U14 M' },
  { value: 'u16_m',  label: 'U16 M' },
  { value: 'u18_m',  label: 'U18 M' },
  { value: 'evento', label: 'Eventi' },
]

export default function CategoryFilter({ showSearch = false, searchPlaceholder = 'Cerca squadra o giocatore…', hideAll = false }: { showSearch?: boolean; searchPlaceholder?: string; hideAll?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('category') ?? 'all'
  const initialSearch = searchParams.get('search') ?? ''

  const [searchValue, setSearchValue] = useState(initialSearch)

  // Sync local state if URL param changes externally (e.g. browser back)
  useEffect(() => {
    setSearchValue(searchParams.get('search') ?? '')
  }, [searchParams])

  // Debounced push for search
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const trimmed = searchValue.trim()
    if (trimmed) params.set('search', trimmed)
    else params.delete('search')
    params.delete('page')

    const timer = setTimeout(() => {
      router.push(`${pathname}?${params.toString()}`)
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  function selectCategory(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') params.delete('category')
    else params.set('category', value)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {options.filter(opt => !(hideAll && opt.value === 'all')).map(opt => (
        <button
          key={opt.value}
          onClick={() => selectCategory(opt.value)}
          className={`px-3 py-1.5 font-display uppercase tracking-wide text-xs border transition-colors ${
            current === opt.value
              ? 'bg-brand-orange border-brand-orange text-court-dark'
              : 'border-court-border text-court-muted hover:border-court-muted hover:text-court-white'
          }`}
        >
          {opt.label}
        </button>
      ))}

      {showSearch && (
        <div className="ml-auto flex items-center gap-3">
          {searchParams.get('mode') === 'checkin' && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={searchParams.get('unpaid') === '1'}
                onChange={e => {
                  const params = new URLSearchParams(searchParams.toString())
                  if (e.target.checked) params.set('unpaid', '1')
                  else params.delete('unpaid')
                  params.delete('page')
                  router.push(`${pathname}?${params.toString()}`)
                }}
                className="accent-brand-orange w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-xs text-court-muted font-display uppercase tracking-wide">Non pagati</span>
            </label>
          )}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-court-muted pointer-events-none" />
            <input
              type="text"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              placeholder={searchPlaceholder}
              className="input pl-7 pr-3 py-1.5 text-xs w-52"
            />
          </div>
        </div>
      )}
    </div>
  )
}
