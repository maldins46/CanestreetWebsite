'use client'
import { useState } from 'react'
import MatchCard from './MatchCard'
import type { MatchWithTeams, TeamCategory } from '@/types'
import clsx from 'clsx'

interface Props {
  matches: MatchWithTeams[]
}

const categories: { value: TeamCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Tutte' },
  { value: 'open', label: 'Open' },
  { value: 'u18', label: 'U18' },
  { value: 'u16', label: 'U16' },
  { value: 'u14', label: 'U14' },
]

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function getDayKey(iso: string | null): string {
  if (!iso) return 'non-programmata'
  return new Date(iso).toISOString().slice(0, 10)
}

export default function TournamentCalendarSection({ matches }: Props) {
  const [cat, setCat] = useState<TeamCategory | 'all'>('all')

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
            {cat !== 'all' ? ` per la categoria ${cat.toUpperCase()}` : ' ancora'}.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(days.entries()).map(([dayKey, dayMatches]) => (
            <div key={dayKey}>
              {dayKey !== 'non-programmata' && (
                <h3 className="font-display uppercase text-xs tracking-widest text-brand-orange mb-3">
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
