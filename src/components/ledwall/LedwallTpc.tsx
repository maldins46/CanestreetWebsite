'use client'

import { useEffect, useRef } from 'react'
import clsx from 'clsx'
import type { TpcContestFull, TpcCategory } from '@/types'

interface Props {
  contests: TpcContestFull[]
  contestCategory: TpcCategory
  roundId?: string
}

export default function LedwallTpc({ contests, contestCategory, roundId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contest = contests.find(c => c.category === contestCategory) ?? null

  const sortedRounds = contest ? [...contest.tpc_rounds].sort((a, b) => a.round_number - b.round_number) : []
  const round = roundId
    ? (sortedRounds.find(r => r.id === roundId) ?? sortedRounds[sortedRounds.length - 1])
    : sortedRounds[sortedRounds.length - 1]

  const entries = round ? [...round.tpc_entries].sort((a, b) => a.sort_order - b.sort_order) : []

  // Keep the live player centered — the ledwall is a passive display, nobody can scroll it manually.
  useEffect(() => {
    if (!containerRef.current) return
    const liveEntry = containerRef.current.querySelector('[data-is-live="true"]')
    if (liveEntry) {
      liveEntry.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [round])

  if (!contest) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-gray-400 font-display uppercase text-sm">Gara non disponibile</p>
      </div>
    )
  }

  if (!round) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-gray-400 font-display uppercase text-sm">Nessun turno disponibile</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 shrink-0">
        <h2 className="font-display font-bold uppercase text-sm tracking-wide text-brand-orange text-center">
          3-Point Contest {contestCategory === 'open' ? 'Open' : 'Under'} — {round.name}
        </h2>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto scrollbar-hide">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-center px-3 py-2 font-display uppercase text-xs text-gray-400 w-10">#</th>
              <th className="text-left px-3 py-2 font-display uppercase text-xs text-gray-400">Giocatore</th>
              <th className="text-center px-4 py-2 font-display uppercase text-xs text-gray-400 w-24">Punti</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr
                key={entry.id}
                data-is-live={entry.is_live || undefined}
                className={clsx(
                  'border-b border-gray-100 last:border-0',
                  entry.is_live && 'bg-red-50',
                  entry.is_qualified && !entry.is_live && 'bg-orange-50',
                )}
              >
                <td className="px-3 py-2.5 text-center w-10">
                  <span className={clsx(
                    'font-display font-bold',
                    entry.is_live ? 'text-red-600'
                      : entry.is_qualified ? 'text-brand-orange'
                      : 'text-gray-300',
                  )}>
                    {idx + 1}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-800 truncate">{entry.tpc_players.name}</span>
                    {entry.is_live && (
                      <span className="flex items-center gap-1 shrink-0">
                        <span className="w-2 h-2 rounded-full animate-pulse bg-red-500" />
                        <span className="text-xs font-display uppercase text-red-600">LIVE</span>
                      </span>
                    )}
                    {entry.is_qualified && !entry.is_live && (
                      <span className="text-xs font-display uppercase text-brand-orange shrink-0">
                        Qualificato
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-center w-24">
                  <span className={clsx(
                    'font-display font-bold text-2xl',
                    entry.is_live ? 'text-red-600'
                      : entry.is_qualified ? 'text-brand-orange'
                      : 'text-gray-700',
                  )}>
                    {entry.score ?? '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
