'use client'
import { useState } from 'react'
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
  const [activeCategory, setActiveCategory] = useState<TpcCategory>('open')

  const contest = contests.find(c => c.category === activeCategory) ?? null
  const sortedRounds = contest
    ? [...contest.tpc_rounds].sort((a, b) => a.round_number - b.round_number)
    : []

  if (contests.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-court-gray font-body">
          La gara sarà disponibile durante il torneo.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Category pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={clsx(
              'px-4 py-1.5 rounded-full font-display uppercase tracking-wide text-xs border transition-colors',
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
          <p className="text-court-gray font-body">Nessuna gara disponibile per questa categoria.</p>
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
      <div className="px-4 py-3 border-b border-court-border">
        <span className="font-display font-bold uppercase tracking-wide text-court-white">
          {round.name}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-court-gray font-display uppercase tracking-wide text-xs border-b border-court-border">
              <th className="text-left px-4 py-2.5 w-10">#</th>
              <th className="text-left px-2 py-2.5">Giocatore</th>
              <th className="text-center px-2 py-2.5 w-24">Punti</th>
              <th className="text-center px-4 py-2.5 w-28">Stato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-court-border">
            {sortedEntries.map((entry, idx) => (
              <tr
                key={entry.id}
                className={clsx(
                  'transition-colors',
                  entry.is_live && 'border-red-500 bg-red-500/5',
                  entry.is_qualified && !entry.is_live && 'bg-brand-orange/10',
                )}
              >
                <td className="px-4 py-3 text-court-gray text-xs font-mono">{idx + 1}</td>
                <td className="px-2 py-3 text-court-white font-medium">
                  <span className="flex items-center gap-2">
                    {entry.tpc_players.name}
                    {entry.is_live && (
                      <span className="inline-flex items-center gap-1 text-xs text-red-500 font-display uppercase tracking-wide">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
                        Live
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-2 py-3 text-center">
                  {entry.score !== null ? (
                    <span className="font-display font-bold text-court-white text-base">{entry.score}</span>
                  ) : (
                    <span className="text-court-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {entry.is_qualified ? (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-display uppercase tracking-wide bg-brand-orange/20 text-brand-orange border border-brand-orange/30">
                      Qualificato
                    </span>
                  ) : entry.score !== null ? (
                    <span className="text-court-muted text-xs">—</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
