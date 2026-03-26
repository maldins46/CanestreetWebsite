'use client'

import { useState } from 'react'
import clsx from 'clsx'
import type { BracketRound, MatchWithTeams, TeamCategory } from '@/types'

// ─── Round labels ──────────────────────────────────────────────────────────────

const roundLabels: Record<BracketRound, string> = {
  round_of_16: 'Ottavi di finale',
  quarterfinal: 'Quarti di finale',
  semifinal: 'Semifinali',
  final: 'Finale',
}

const roundOrder: BracketRound[] = ['round_of_16', 'quarterfinal', 'semifinal', 'final']

// ─── BracketMatchCard ──────────────────────────────────────────────────────────

interface BracketMatchCardProps {
  match: MatchWithTeams
}

function BracketMatchCard({ match }: BracketMatchCardProps) {
  const isDone = match.status === 'completed'
  const hasScore = isDone && match.score_home != null && match.score_away != null

  const homeWon = hasScore && match.score_home! > match.score_away!
  const awayWon = hasScore && match.score_away! > match.score_home!

  return (
    <div className="card w-48 overflow-hidden text-sm">
      {/* Home team row */}
      <div
        className={clsx(
          'flex items-center justify-between px-3 py-2 border-b border-court-border',
          homeWon && 'bg-brand-orange/10',
        )}
      >
        <span
          className={clsx(
            'font-body truncate mr-2 flex-1 min-w-0',
            homeWon ? 'font-bold text-court-white' : 'text-court-muted',
          )}
        >
          {match.team_home?.name ?? <span className="italic opacity-50">TBD</span>}
        </span>
        {hasScore && (
          <span
            className={clsx(
              'font-display font-bold shrink-0 tabular-nums',
              homeWon ? 'text-court-white' : 'text-court-muted',
            )}
          >
            {match.score_home}
          </span>
        )}
      </div>

      {/* Away team row */}
      <div
        className={clsx(
          'flex items-center justify-between px-3 py-2',
          awayWon && 'bg-brand-orange/10',
        )}
      >
        <span
          className={clsx(
            'font-body truncate mr-2 flex-1 min-w-0',
            awayWon ? 'font-bold text-court-white' : 'text-court-muted',
          )}
        >
          {match.team_away?.name ?? <span className="italic opacity-50">TBD</span>}
        </span>
        {hasScore && (
          <span
            className={clsx(
              'font-display font-bold shrink-0 tabular-nums',
              awayWon ? 'text-court-white' : 'text-court-muted',
            )}
          >
            {match.score_away}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── BracketView ───────────────────────────────────────────────────────────────

interface BracketViewProps {
  matches: MatchWithTeams[]
}

export function BracketView({ matches }: BracketViewProps) {
  const bracketMatches = matches.filter(m => m.phase === 'bracket')

  if (bracketMatches.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-court-gray font-body">
          Il tabellone sarà disponibile al termine dei gironi
        </p>
      </div>
    )
  }

  // Group by round, sort each round by bracket_position
  const byRound = new Map<BracketRound, MatchWithTeams[]>()
  for (const m of bracketMatches) {
    if (!m.bracket_round) continue
    if (!byRound.has(m.bracket_round)) byRound.set(m.bracket_round, [])
    byRound.get(m.bracket_round)!.push(m)
  }
  for (const arr of Array.from(byRound.values())) {
    arr.sort((a, b) => (a.bracket_position ?? 0) - (b.bracket_position ?? 0))
  }

  const rounds = roundOrder.filter(r => byRound.has(r))

  return (
    // overflow-x-auto for large brackets on mobile
    <div className="overflow-x-auto">
      {/* Desktop: horizontal flex (rounds as columns) */}
      <div className="hidden md:flex gap-8 items-start min-w-max pb-4">
        {rounds.map(round => (
          <div key={round} className="flex flex-col gap-4">
            {/* Round header */}
            <h3 className="font-display font-bold uppercase tracking-wide text-xs text-brand-orange mb-1 whitespace-nowrap">
              {roundLabels[round]}
            </h3>
            {/* Matches */}
            <div className="flex flex-col gap-3">
              {(byRound.get(round) ?? []).map(m => (
                <BracketMatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: vertical stack */}
      <div className="flex flex-col gap-8 md:hidden">
        {rounds.map(round => (
          <div key={round}>
            <h3 className="font-display font-bold uppercase tracking-wide text-xs text-brand-orange mb-3">
              {roundLabels[round]}
            </h3>
            <div className="flex flex-col gap-3">
              {(byRound.get(round) ?? []).map(m => (
                <BracketMatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── BracketSection (with category filter) ────────────────────────────────────

const categoryLabels: Record<TeamCategory, string> = {
  open: 'Open',
  u18: 'U18',
  u16: 'U16',
  u14: 'U14',
}

const categoryOrder: TeamCategory[] = ['open', 'u18', 'u16', 'u14']

interface BracketSectionProps {
  matches: MatchWithTeams[]
}

export default function BracketSection({ matches }: BracketSectionProps) {
  const bracketMatches = matches.filter(m => m.phase === 'bracket')

  // Determine which categories have bracket matches
  const availableCategories = categoryOrder.filter(cat =>
    bracketMatches.some(m => m.category === cat),
  )

  const [selectedCat, setSelectedCat] = useState<TeamCategory>(
    availableCategories[0] ?? 'open',
  )

  if (availableCategories.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-court-gray font-body">
          Il tabellone sarà disponibile al termine dei gironi
        </p>
      </div>
    )
  }

  const filteredMatches = bracketMatches.filter(m => m.category === selectedCat)

  return (
    <div>
      {/* Category pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {availableCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={clsx(
              'px-4 py-1.5 rounded-full font-display uppercase tracking-wide text-xs border transition-colors',
              selectedCat === cat
                ? 'bg-brand-orange border-brand-orange text-white'
                : 'border-court-border text-court-muted hover:border-court-muted hover:text-court-white',
            )}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      <BracketView matches={filteredMatches} />
    </div>
  )
}
