'use client'

import { useRef, useState, useEffect } from 'react'
import clsx from 'clsx'
import type { BracketRound, MatchWithTeams, TeamCategory } from '@/types'

const ROUND_LABELS: Record<BracketRound, string> = {
  round_of_16:  'Ottavi',
  quarterfinal: 'Quarti',
  semifinal:    'Semifinali',
  final:        'Finale',
}

const ROUND_ORDER: BracketRound[] = ['round_of_16', 'quarterfinal', 'semifinal', 'final']

const CATEGORY_LABELS: Record<TeamCategory, string> = {
  open_m: 'Open M',
  open_f: 'Open F',
  u14_m:  'U14 M',
  u16_m:  'U16 M',
  u18_m:  'U18 M',
}

const CARD_H   = 52   // px — height of each match card
const LINE_COLOR = '#6b7280'  // gray-500 — good contrast on white

interface Props {
  matches: MatchWithTeams[]
  category: TeamCategory
}

// ─── Match card ───────────────────────────────────────────────────────────────

function MatchCard({ match }: { match: MatchWithTeams }) {
  const isDone   = match.status === 'completed'
  const isLive   = match.status === 'in_progress'
  const hasScore = isDone && match.score_home != null && match.score_away != null
  const homeWon  = hasScore && match.score_home! > match.score_away!
  const awayWon  = hasScore && match.score_away! > match.score_home!

  return (
    <div className={clsx(
      'border-2 overflow-hidden text-xs rounded h-full flex flex-col',
      isLive ? 'border-red-400' : 'border-gray-400',
    )}>
      <div className={clsx(
        'flex items-center justify-between px-2 flex-1 border-b border-gray-300',
        homeWon && 'bg-orange-50',
        isLive  && 'bg-red-50',
      )}>
        <span className={clsx('truncate flex-1 mr-1', homeWon ? 'font-bold text-gray-900' : 'text-gray-500')}>
          {match.team_home?.name ?? <em className="opacity-40 not-italic">TBD</em>}
        </span>
        {hasScore && (
          <span className={clsx('font-display font-bold shrink-0', homeWon ? 'text-gray-900' : 'text-gray-400')}>
            {match.score_home}
          </span>
        )}
        {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0 ml-1" />}
      </div>
      <div className={clsx(
        'flex items-center justify-between px-2 flex-1',
        awayWon && 'bg-orange-50',
        isLive  && 'bg-red-50',
      )}>
        <span className={clsx('truncate flex-1 mr-1', awayWon ? 'font-bold text-gray-900' : 'text-gray-500')}>
          {match.team_away?.name ?? <em className="opacity-40 not-italic">TBD</em>}
        </span>
        {hasScore && (
          <span className={clsx('font-display font-bold shrink-0', awayWon ? 'text-gray-900' : 'text-gray-400')}>
            {match.score_away}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LedwallFinals({ matches, category }: Props) {
  const wrapperRef   = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({ w: el.offsetWidth, h: el.offsetHeight })
    })
    ro.observe(el)
    setSize({ w: el.offsetWidth, h: el.offsetHeight })
    return () => ro.disconnect()
  }, [])

  const bracketMatches = matches.filter(m => m.phase === 'bracket' && m.category === category)
  const rounds         = ROUND_ORDER.filter(r => bracketMatches.some(m => m.bracket_round === r))

  if (rounds.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-gray-400 font-display uppercase text-sm">Nessun tabellone disponibile</p>
      </div>
    )
  }

  // Group matches by round, sorted by bracket_position
  const byRound = new Map<BracketRound, MatchWithTeams[]>()
  for (const round of rounds) {
    byRound.set(
      round,
      bracketMatches
        .filter(m => m.bracket_round === round)
        .sort((a, b) => (a.bracket_position ?? 0) - (b.bracket_position ?? 0)),
    )
  }

  const numRounds        = rounds.length
  const firstRoundCount  = Math.pow(2, numRounds - 1)

  // Layout — computed once size is known
  const LABEL_H = 20  // px reserved at top for round labels
  const PAD     = 8   // px padding inside the bracket area

  const bracketW = size.w - PAD * 2
  const bracketH = size.h - LABEL_H - PAD * 2

  // Card width fills the available width evenly; gap distributes what's left
  const CARD_W   = Math.max(80, Math.floor(bracketW / numRounds - (numRounds > 1 ? 32 : 0)))
  const gap      = numRounds > 1 ? (bracketW - numRounds * CARD_W) / (numRounds - 1) : 0
  const SLOT     = bracketH / firstRoundCount

  function matchTop(roundIdx: number, matchIdx: number): number {
    const step = Math.pow(2, roundIdx)
    return matchIdx * step * SLOT + (step - 1) * SLOT / 2
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* ── Header ── */}
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 shrink-0">
        <h2 className="font-display font-bold uppercase text-sm tracking-wide text-brand-orange text-center">
          Tabellone — {CATEGORY_LABELS[category]}
        </h2>
      </div>

      {/* ── Bracket area ── */}
      <div ref={wrapperRef} className="flex-1 overflow-hidden relative">
        {size.w > 0 && (
          <div
            style={{
              position: 'absolute',
              inset:    PAD,
            }}
          >
            {/* Round labels */}
            <div
              className="flex"
              style={{ height: LABEL_H, gap, width: numRounds * CARD_W + (numRounds - 1) * gap }}
            >
              {rounds.map(round => (
                <div
                  key={round}
                  style={{ width: CARD_W, flexShrink: 0 }}
                  className="text-center"
                >
                  <span className="font-display font-bold uppercase text-[10px] text-brand-orange tracking-wide">
                    {ROUND_LABELS[round]}
                  </span>
                </div>
              ))}
            </div>

            {/* Cards + SVG connectors */}
            <div style={{ position: 'relative', width: numRounds * CARD_W + (numRounds - 1) * gap, height: bracketH }}>
              {/* SVG connector lines */}
              <svg
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
                width={numRounds * CARD_W + (numRounds - 1) * gap}
                height={bracketH}
              >
                {rounds.slice(0, -1).map((round, rIdx) => {
                  const roundMatches = byRound.get(round) ?? []
                  const nextMatches  = byRound.get(rounds[rIdx + 1]) ?? []

                  const x1   = rIdx * (CARD_W + gap) + CARD_W
                  const x2   = (rIdx + 1) * (CARD_W + gap)
                  const xMid = (x1 + x2) / 2

                  const pairs = Math.ceil(roundMatches.length / 2)

                  return Array.from({ length: pairs }, (_, k) => {
                    const topMatch    = roundMatches[2 * k]
                    const bottomMatch = roundMatches[2 * k + 1]
                    const nextMatch   = nextMatches[k]
                    if (!topMatch || !nextMatch) return null

                    const yTop  = matchTop(rIdx, 2 * k)     + CARD_H / 2
                    const yMid  = matchTop(rIdx + 1, k)     + CARD_H / 2

                    if (!bottomMatch) {
                      return (
                        <line key={k}
                          x1={x1} y1={yTop} x2={x2} y2={yTop}
                          stroke={LINE_COLOR} strokeWidth={1.5}
                        />
                      )
                    }

                    const yBottom = matchTop(rIdx, 2 * k + 1) + CARD_H / 2

                    return (
                      <g key={k}>
                        <line x1={x1}   y1={yTop}    x2={xMid} y2={yTop}    stroke={LINE_COLOR} strokeWidth={1.5} />
                        <line x1={xMid} y1={yTop}    x2={xMid} y2={yBottom} stroke={LINE_COLOR} strokeWidth={1.5} />
                        <line x1={x1}   y1={yBottom} x2={xMid} y2={yBottom} stroke={LINE_COLOR} strokeWidth={1.5} />
                        <line x1={xMid} y1={yMid}    x2={x2}   y2={yMid}    stroke={LINE_COLOR} strokeWidth={1.5} />
                      </g>
                    )
                  })
                })}
              </svg>

              {/* Match cards */}
              {rounds.map((round, rIdx) => {
                const roundMatches = byRound.get(round) ?? []
                const x = rIdx * (CARD_W + gap)

                return roundMatches.map((match, mIdx) => (
                  <div
                    key={match.id}
                    style={{
                      position: 'absolute',
                      top:      matchTop(rIdx, mIdx),
                      left:     x,
                      width:    CARD_W,
                      height:   CARD_H,
                    }}
                  >
                    <MatchCard match={match} />
                  </div>
                ))
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
