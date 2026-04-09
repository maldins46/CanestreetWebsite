'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

// ─── Layout constants (desktop bracket) ───────────────────────────────────────

const CARD_W = 192   // px — card width (w-48)
const CARD_H = 74    // px — two rows of py-2 + text-sm + inner border
const SLOT   = 90    // px — CARD_H + 16px vertical gap between cards in first round
const COL_GAP = 48   // px — horizontal space between columns (connector lines drawn here)
const LINE_COLOR = '#3a3a3a'

/** Top offset of match `i` in round index `r` (0 = leftmost / most matches) */
function matchTop(r: number, i: number): number {
  const step = Math.pow(2, r)
  return i * step * SLOT + (step - 1) * SLOT / 2
}

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
    <div className="card overflow-hidden text-sm">
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

// ─── Desktop bracket (absolute positioning + SVG connectors) ──────────────────

interface DesktopBracketProps {
  rounds: BracketRound[]
  byRound: Map<BracketRound, MatchWithTeams[]>
}

function DesktopBracket({ rounds, byRound }: DesktopBracketProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [availableWidth, setAvailableWidth] = useState(0)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setAvailableWidth(el.getBoundingClientRect().width))
    ro.observe(el)
    setAvailableWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  const numRounds = rounds.length
  const firstRoundCount = Math.pow(2, numRounds - 1)

  const minW = numRounds * CARD_W + (numRounds - 1) * COL_GAP
  const totalW = availableWidth > minW ? availableWidth : minW
  const gap = numRounds > 1 ? (totalW - numRounds * CARD_W) / (numRounds - 1) : COL_GAP
  const totalH = firstRoundCount * SLOT - (SLOT - CARD_H)

  return (
    <div ref={wrapperRef} className="w-full">
      {/* Round headers — flex row aligned to columns */}
      <div
        className="flex mb-3"
        style={{ gap, width: totalW }}
      >
        {rounds.map(round => (
          <h3
            key={round}
            className="font-display font-bold uppercase tracking-wide text-xs text-brand-orange whitespace-nowrap"
            style={{ width: CARD_W, flexShrink: 0 }}
          >
            {roundLabels[round]}
          </h3>
        ))}
      </div>

      {/* Bracket area: cards + SVG connector overlay */}
      <div style={{ position: 'relative', width: totalW, height: totalH }}>
        {/* SVG connector lines */}
        <svg
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          width={totalW}
          height={totalH}
        >
          {rounds.slice(0, -1).map((round, rIdx) => {
            const matches = byRound.get(round) ?? []
            const nextMatches = byRound.get(rounds[rIdx + 1]) ?? []

            const x1   = rIdx * (CARD_W + gap) + CARD_W
            const x2   = (rIdx + 1) * (CARD_W + gap)
            const xMid = (x1 + x2) / 2

            const pairs = Math.ceil(matches.length / 2)

            return Array.from({ length: pairs }, (_, k) => {
              const topMatch    = matches[2 * k]
              const bottomMatch = matches[2 * k + 1]
              const nextMatch   = nextMatches[k]

              if (!topMatch || !nextMatch) return null

              const yTop = matchTop(rIdx, 2 * k) + CARD_H / 2
              const yMid = matchTop(rIdx + 1, k) + CARD_H / 2

              if (!bottomMatch) {
                // Bye: single straight connector
                return (
                  <line
                    key={k}
                    x1={x1} y1={yTop} x2={x2} y2={yTop}
                    stroke={LINE_COLOR} strokeWidth={1.5}
                  />
                )
              }

              const yBottom = matchTop(rIdx, 2 * k + 1) + CARD_H / 2

              return (
                <g key={k}>
                  {/* Horizontal out of top match */}
                  <line x1={x1} y1={yTop} x2={xMid} y2={yTop} stroke={LINE_COLOR} strokeWidth={1.5} />
                  {/* Vertical bracket arm */}
                  <line x1={xMid} y1={yTop} x2={xMid} y2={yBottom} stroke={LINE_COLOR} strokeWidth={1.5} />
                  {/* Horizontal out of bottom match */}
                  <line x1={x1} y1={yBottom} x2={xMid} y2={yBottom} stroke={LINE_COLOR} strokeWidth={1.5} />
                  {/* Horizontal into next-round match */}
                  <line x1={xMid} y1={yMid} x2={x2} y2={yMid} stroke={LINE_COLOR} strokeWidth={1.5} />
                </g>
              )
            })
          })}
        </svg>

        {/* Absolutely positioned match cards */}
        {rounds.map((round, rIdx) => {
          const matches = byRound.get(round) ?? []
          const x = rIdx * (CARD_W + gap)

          return matches.map((match, mIdx) => (
            <div
              key={match.id}
              style={{
                position: 'absolute',
                top: matchTop(rIdx, mIdx),
                left: x,
                width: CARD_W,
              }}
            >
              <BracketMatchCard match={match} />
            </div>
          ))
        })}
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
    <>
      {/* Desktop: visual bracket with connecting lines */}
      <div className="hidden md:block overflow-x-auto pb-4">
        <DesktopBracket rounds={rounds} byRound={byRound} />
      </div>

      {/* Mobile: vertical stack, full-width cards */}
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
    </>
  )
}

// ─── BracketSection (with category filter) ────────────────────────────────────

const categoryLabels: Record<TeamCategory, string> = {
  open_m: 'Open M',
  open_f: 'Open F',
  u18_m: 'U18 M',
  u16_m: 'U16 M',
  u14_m: 'U14 M',
}

const categoryOrder: TeamCategory[] = ['open_m', 'open_f', 'u18_m', 'u16_m', 'u14_m']

interface BracketSectionProps {
  matches: MatchWithTeams[]
}

export default function BracketSection({ matches }: BracketSectionProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const catParam = searchParams.get('cat') as TeamCategory | null
  const selectedCat: TeamCategory = catParam && (categoryOrder as string[]).includes(catParam)
    ? catParam as TeamCategory
    : 'open_m'

  function setSelectedCat(value: TeamCategory) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('cat', value)
    router.replace(`/torneo?${params}`)
  }

  const bracketMatches = matches.filter(m => m.phase === 'bracket')
  const filteredMatches = bracketMatches.filter(m => m.category === selectedCat)

  return (
    <div>
      {/* Category pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {categoryOrder.map(cat => (
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
