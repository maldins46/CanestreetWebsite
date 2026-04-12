'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import MatchCard from './MatchCard'
import type { MatchWithTeams, TeamCategory } from '@/types'
import clsx from 'clsx'

interface Props {
  matches: MatchWithTeams[]
}

const categories: { value: TeamCategory | 'all'; label: string }[] = [
  { value: 'all',    label: 'Tutte' },
  { value: 'open_m', label: 'Open M' },
  { value: 'open_f', label: 'Open F' },
  { value: 'u18_m',  label: 'U18 M' },
  { value: 'u16_m',  label: 'U16 M' },
  { value: 'u14_m',  label: 'U14 M' },
]

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Rome',
  })
}

function getDayKey(iso: string | null): string {
  if (!iso) return 'non-programmata'
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' }) // yields YYYY-MM-DD in Rome tz
}

export default function TournamentCalendarSection({ matches }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const catParam = searchParams.get('cat') as TeamCategory | 'all' | null
  const validValues = categories.map(c => c.value)
  const cat: TeamCategory | 'all' = catParam && validValues.includes(catParam) ? catParam : 'all'

  function setCat(value: TeamCategory | 'all') {
    const params = new URLSearchParams(searchParams.toString())
    params.set('cat', value)
    router.replace(`/tournament?${params}`)
  }

  const filtered = cat === 'all' ? matches : matches.filter(m => m.category === cat)

  // Group by day
  const days = new Map<string, MatchWithTeams[]>()
  for (const m of filtered) {
    const key = getDayKey(m.scheduled_at)
    if (!days.has(key)) days.set(key, [])
    days.get(key)!.push(m)
  }

  return (
    <div>
      {/* Category pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {categories.map(opt => (
          <button
            key={opt.value}
            onClick={() => setCat(opt.value)}
            className={clsx(
              'px-4 py-1.5 rounded-full font-display uppercase tracking-wide text-xs border transition-colors',
              cat === opt.value
                ? 'bg-brand-orange border-brand-orange text-white'
                : 'border-court-border text-court-muted hover:border-court-muted hover:text-court-white',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray">
            Nessuna partita programmata
            {cat !== 'all' ? ` per la categoria ${categories.find(c => c.value === cat)?.label ?? cat}` : ' ancora'}.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(days.entries()).map(([dayKey, dayMatches]) => (
            <div key={dayKey}>
              {dayKey !== 'non-programmata' && (
                <h3 className="font-display uppercase text-xs tracking-widest text-brand-orange mb-3" suppressHydrationWarning>
                  {formatDay(dayMatches[0].scheduled_at!)}
                </h3>
              )}
              <div className="space-y-1.5">
                {dayMatches.map(m => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
