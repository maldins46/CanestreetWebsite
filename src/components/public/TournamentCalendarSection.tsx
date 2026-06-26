'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import MatchCard from './MatchCard'
import EventCard from './EventCard'
import type { MatchWithTeams, TeamCategory, CalendarioEvent } from '@/types'
import { CATEGORY_LABELS } from '@/types'
import clsx from 'clsx'

interface Props {
  matches: MatchWithTeams[]
  events: CalendarioEvent[]
}

type FilterCat = TeamCategory | 'all' | 'evento'

const categories: { value: FilterCat; label: string }[] = [
  { value: 'all',    label: 'Tutte' },
  { value: 'open_m', label: 'Open M' },
  { value: 'open_f', label: 'Open F' },
  { value: 'u18_m',  label: 'U18 M' },
  { value: 'u16_m',  label: 'U16 M' },
  { value: 'u14_m',  label: 'U14 M' },
  { value: 'evento', label: 'Eventi' },
]

const STATUS_ORDER: Record<string, number> = { completed: 0, in_progress: 1, scheduled: 2 }

const roundLabels: Record<string, string> = {
  round_of_16: 'Ottavi',
  quarterfinal: 'Quarti',
  semifinal: 'Semifinali',
  final: 'Finale',
}

function getPhaseLabel(m: MatchWithTeams): string {
  if (m.phase === 'group' && m.group) return `Girone ${m.group.name}`
  return m.bracket_round ? (roundLabels[m.bracket_round] ?? '') : ''
}

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
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })
}

type CalendarioRow =
  | { type: 'match'; data: MatchWithTeams }
  | { type: 'event'; data: CalendarioEvent }

export default function TournamentCalendarSection({ matches, events }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [search, setSearch] = useState('')

  const catParam = searchParams.get('cat') as FilterCat | null
  const validValues = categories.map(c => c.value)
  const cat: FilterCat = catParam && validValues.includes(catParam) ? catParam : 'all'

  function setCat(value: FilterCat) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('cat', value)
    router.replace(`/tournament?${params}`)
  }

  const q = search.trim().toLowerCase()

  let rows: CalendarioRow[]
  if (cat === 'evento') {
    rows = events
      .filter(e => !q || e.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const da = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Infinity
        const db = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Infinity
        if (da !== db) return da - db
        return (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
      })
      .map(e => ({ type: 'event', data: e }))
  } else {
    const filteredMatches = (cat === 'all' ? matches : matches.filter(m => m.category === cat))
      .filter(m => {
        if (!q) return true
        return (
          m.team_home?.name.toLowerCase().includes(q) ||
          m.team_away?.name.toLowerCase().includes(q) ||
          CATEGORY_LABELS[m.category].toLowerCase().includes(q) ||
          getPhaseLabel(m).toLowerCase().includes(q)
        )
      })
    const filteredEvents = cat === 'all'
      ? events.filter(e => !q || e.name.toLowerCase().includes(q))
      : []

    const allItems: CalendarioRow[] = [
      ...filteredMatches.map(m => ({ type: 'match' as const, data: m })),
      ...filteredEvents.map(e => ({ type: 'event' as const, data: e })),
    ]
    rows = allItems.sort((a, b) => {
      const da = a.data.scheduled_at ? new Date(a.data.scheduled_at).getTime() : Infinity
      const db = b.data.scheduled_at ? new Date(b.data.scheduled_at).getTime() : Infinity
      if (da !== db) return da - db
      const sa = STATUS_ORDER[a.data.status] ?? 99
      const sb = STATUS_ORDER[b.data.status] ?? 99
      if (sa !== sb) return sa - sb
      if (a.type === 'match' && b.type === 'match') {
        return getPhaseLabel(a.data).localeCompare(getPhaseLabel(b.data))
      }
      return 0
    })
  }

  // Group by day
  const days = new Map<string, CalendarioRow[]>()
  for (const row of rows) {
    const key = getDayKey(row.data.scheduled_at)
    if (!days.has(key)) days.set(key, [])
    days.get(key)!.push(row)
  }

  function getDayLabel(dayKey: string, dayRows: CalendarioRow[]): string {
    if (dayKey === 'non-programmata') return 'Non programmata'
    const firstIso = dayRows[0].data.scheduled_at
    return firstIso ? formatDay(firstIso) : 'Non programmata'
  }

  return (
    <div>
      {/* Search + category pills */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex gap-2 flex-wrap order-last sm:order-first">
          {categories.map(opt => (
            <button
              key={opt.value}
              onClick={() => setCat(opt.value)}
              className={clsx(
                'px-4 py-1.5 font-display uppercase tracking-wide text-xs border transition-colors',
                cat === opt.value
                  ? opt.value === 'evento'
                    ? 'bg-teal-500 border-teal-500 text-white'
                    : 'bg-brand-orange border-brand-orange text-white'
                  : 'border-court-border text-court-muted hover:border-court-muted hover:text-court-white',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="relative order-first sm:order-last sm:ml-auto">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-court-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca…"
            className="input pl-7 pr-3 py-1.5 text-xs w-full sm:w-52"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray">
            {q
              ? `Nessun risultato per "${search}".`
              : cat === 'evento'
                ? 'Nessun evento programmato ancora.'
                : `Nessuna partita programmata${cat !== 'all' ? ` per la categoria ${categories.find(c => c.value === cat)?.label ?? cat}` : ' ancora'}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(days.entries()).map(([dayKey, dayRows]) => (
            <div key={dayKey} className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-court-border bg-court-dark">
                <h3
                  className="font-display font-bold uppercase tracking-wide text-sm text-court-white"
                  suppressHydrationWarning
                >
                  {getDayLabel(dayKey, dayRows)}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-court-border">
                      <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2 whitespace-nowrap w-px">Ora</th>
                      <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2 whitespace-nowrap w-px">Categoria</th>
                      <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2 whitespace-nowrap w-px">Turno</th>
                      <th className="font-display uppercase tracking-wide text-xs text-court-muted text-right px-3 py-2 whitespace-nowrap">Squadra casa</th>
                      <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2 whitespace-nowrap">Pts</th>
                      <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2 whitespace-nowrap">Pts</th>
                      <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2 whitespace-nowrap">Squadra ospite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayRows.map(row =>
                      row.type === 'match'
                        ? <MatchCard key={`match-${row.data.id}`} match={row.data} />
                        : <EventCard key={`event-${row.data.id}`} event={row.data} />
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
