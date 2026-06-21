'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import type { TpcCategory, TpcContestFull, TpcRoundWithEntries } from '@/types'

interface Props {
  contests: TpcContestFull[]
}

const CATEGORIES: { key: TpcCategory; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'under', label: 'Under' },
]

export default function ThreePointContestSection({ contests }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const catParam = searchParams.get('cat') as TpcCategory | null
  const validTpcCats: TpcCategory[] = ['open', 'under']
  const activeCategory: TpcCategory = catParam && validTpcCats.includes(catParam) ? catParam : 'open'

  function setActiveCategory(value: TpcCategory) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('cat', value)
    router.replace(`/tournament?${params}`)
  }

  const contest = contests.find(c => c.category === activeCategory) ?? null
  const sortedRounds = contest
    ? [...contest.tpc_rounds].sort((a, b) => a.round_number - b.round_number)
    : []

  return (
    <div>
      {/* Category pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={clsx(
              'px-4 py-1.5 font-display uppercase tracking-wide text-xs border transition-colors',
              activeCategory === cat.key
                ? 'bg-brand-orange border-brand-orange text-white'
                : 'border-court-border text-court-muted hover:border-court-muted hover:text-court-white'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {!contest ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray font-body">La gara sarà disponibile durante il torneo.</p>
        </div>
      ) : sortedRounds.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray font-body">I risultati saranno disponibili durante il torneo.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedRounds.map(round => (
            <RoundCard key={round.id} round={round} />
          ))}
        </div>
      )}
    </div>
  )
}

function RoundCard({ round }: { round: TpcRoundWithEntries }) {
  const sortedEntries = [...round.tpc_entries].sort((a, b) => a.sort_order - b.sort_order)

  if (sortedEntries.length === 0) return null

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-court-border bg-court-dark">
        <span className="font-display font-bold uppercase tracking-wide text-sm text-court-white">
          {round.name}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-court-border">
              <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center w-px px-3 py-2 whitespace-nowrap">
                #
              </th>
              <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2 whitespace-nowrap">
                Giocatore
              </th>
              <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center w-px px-3 py-2 whitespace-nowrap">
                Punti
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((entry, idx) => (
              <tr
                key={entry.id}
                className={clsx(
                  'border-b border-court-border last:border-b-0 transition-colors hover:bg-white/[0.02]',
                  entry.is_live && 'bg-red-500/5',
                  entry.is_qualified && !entry.is_live && 'bg-brand-orange/10',
                )}
              >
                <td className="text-center px-3 py-2.5 w-px whitespace-nowrap">
                  <span
                    className={clsx(
                      'font-display font-bold text-xs',
                      entry.is_live ? 'text-red-400' : entry.is_qualified ? 'text-brand-orange' : 'text-court-muted',
                    )}
                  >
                    {idx + 1}
                  </span>
                </td>
                <td className="text-left px-3 py-2.5 whitespace-nowrap">
                  <span className="font-body text-court-white text-sm flex items-center gap-2">
                    {entry.tpc_players.name}
                    {entry.is_qualified && (
                      <span className="text-xs text-brand-orange font-display uppercase tracking-wide shrink-0">
                        Qualificato
                      </span>
                    )}
                    {entry.is_live && (
                      <span className="inline-flex items-center gap-1 text-xs text-red-400 font-display uppercase tracking-wide">
                        <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse shrink-0" />
                        Live
                      </span>
                    )}
                  </span>
                </td>
                <td className="text-center px-3 py-2.5 w-px whitespace-nowrap">
                  {entry.score !== null ? (
                    <span className="font-body font-semibold text-court-white">{entry.score}</span>
                  ) : (
                    <span className="text-court-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
