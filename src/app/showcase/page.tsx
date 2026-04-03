'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { 
  Edition, GroupWithTeams, MatchWithTeams, 
  TpcContestFull, Sponsor, TeamCategory 
} from '@/types'
import clsx from 'clsx'

type ShowcaseMode = 'open' | 'under' | 'tpc_open' | 'tpc_under' | 'sponsors'

const AUTO_REFRESH_INTERVAL = 15000
const UNDER_CATEGORY_CYCLE_MS = 20000

const CATEGORY_ORDER: TeamCategory[] = ['u14', 'u16', 'u18']
const CATEGORY_COLORS: Record<TeamCategory, string> = {
  open: 'bg-brand-orange',
  u18: 'bg-blue-500',
  u16: 'bg-purple-500',
  u14: 'bg-green-600',
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })
}

function getDayKey(iso: string | null): string {
  if (!iso) return 'non-programmata'
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })
}

// ─── Calendar Component ──────────────────────────────────────────────────────────

function ShowcaseCalendar({ matches, theme }: { matches: MatchWithTeams[]; theme: Record<string, string> }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const lightMode = theme.bg === 'bg-white'
  const filtered = matches // Show all matches (group + bracket phases)
  
  const days = new Map<string, MatchWithTeams[]>()
  for (const m of filtered) {
    const key = getDayKey(m.scheduled_at)
    if (!days.has(key)) days.set(key, [])
    days.get(key)!.push(m)
  }

  const sortedDays = Array.from(days.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  const roundLabels: Record<string, string> = {
    round_of_16: 'Ottavi',
    quarterfinal: 'Quarti',
    semifinal: 'Semifinali',
    final: 'Finale',
  }

  function getPhaseLabel(match: MatchWithTeams): string {
    if (match.phase === 'group' && match.group) return `Gir. ${match.group.name}`
    return match.bracket_round ? (roundLabels[match.bracket_round] ?? '') : ''
  }

  // Auto-scroll to live match on mount
  React.useEffect(() => {
    if (!containerRef.current) return
    const liveMatch = filtered.find(m => m.status === 'in_progress')
    if (!liveMatch) return
    const liveEl = containerRef.current.querySelector(`[data-match-id="${liveMatch.id}"]`)
    if (liveEl) {
      liveEl.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [filtered])

  return (
    <div className="h-full flex flex-col">
      <div className={clsx('px-4 py-3 border-b', theme.headerBg, lightMode ? 'border-gray-300' : 'border-court-border')}>
        <h2 className={clsx('font-display font-bold uppercase text-sm tracking-wide', theme.textDarker)}>
          Calendario
        </h2>
      </div>
      <div ref={containerRef} className={clsx('flex-1 overflow-y-auto p-4 space-y-6', theme.cardBg)}>
        {sortedDays.length === 0 ? (
          <p className={clsx('text-sm text-center py-8', theme.textMuted)}>Nessuna partita programmata</p>
        ) : (
          sortedDays.map(([dayKey, dayMatches]) => (
            <div key={dayKey}>
              {dayKey !== 'non-programmata' && (
                <p className="font-display uppercase text-xs tracking-widest text-brand-orange mb-3">
                  {formatDay(dayMatches[0].scheduled_at!)}
                </p>
              )}
              <div className="space-y-2">
                {dayMatches.map(m => {
                  const isLive = m.status === 'in_progress'
                  const isDone = m.status === 'completed'
                  const homeWon = isDone && m.score_home != null && m.score_away != null && m.score_home > m.score_away
                  const awayWon = isDone && m.score_home != null && m.score_away != null && m.score_away > m.score_home

                  return (
                    <div
                      data-match-id={m.id}
                      key={m.id}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2 rounded border-l-2 text-sm',
                        isLive && clsx(theme.liveBorder, theme.liveBg),
                        isDone && (lightMode ? 'border-green-400 bg-green-50' : 'border-green-500/50 bg-white/[0.02]'),
                        !isLive && !isDone && clsx(theme.border, theme.inputBg),
                      )}
                    >
                      <span className={clsx('w-12 text-xs shrink-0', isLive ? theme.liveText : theme.textMuted)}>
                        {isLive ? (
                          <span className="flex items-center gap-1">
                            <span className={clsx('w-1.5 h-1.5 rounded-full animate-pulse', lightMode ? 'bg-red-600' : 'bg-red-500')} />
                            <span className={clsx('font-bold', theme.liveText)}>LIVE</span>
                          </span>
                        ) : (
                          formatTime(m.scheduled_at)
                        )}
                      </span>
                      <span className={clsx('text-[10px] px-1.5 py-0.5 rounded shrink-0 text-white', CATEGORY_COLORS[m.category])}>
                        {m.category}
                      </span>
                      {getPhaseLabel(m) && (
                        <span className={clsx('text-xs w-12 shrink-0', theme.textMuted)}>
                          {getPhaseLabel(m)}
                        </span>
                      )}
                      <span className={clsx('flex-1 text-right truncate', homeWon ? theme.tableText + ' font-bold' : theme.textMuted)}>
                        {m.team_home?.name ?? 'TBD'}
                      </span>
                      <span className={clsx('w-12 text-center shrink-0', theme.textMuted)}>
                        {isDone && m.score_home != null ? (
                          <span className="font-display font-bold">
                            <span className={homeWon ? (lightMode ? 'text-green-600' : 'text-green-400') : ''}>{m.score_home}</span>
                            <span className="mx-1">-</span>
                            <span className={awayWon ? (lightMode ? 'text-green-600' : 'text-green-400') : ''}>{m.score_away}</span>
                          </span>
                        ) : 'vs'}
                      </span>
                      <span className={clsx('flex-1 truncate', awayWon ? theme.tableText + ' font-bold' : theme.textMuted)}>
                        {m.team_away?.name ?? 'TBD'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Standings Component ───────────────────────────────────────────────────────────

function computeStandings(matches: MatchWithTeams[], teams: { id: string; name: string }[]) {
  const teamStats = new Map<string, { played: number; wins: number; losses: number; pf: number; ps: number }>()

  for (const team of teams) {
    teamStats.set(team.id, { played: 0, wins: 0, losses: 0, pf: 0, ps: 0 })
  }

  for (const m of matches) {
    if (m.status !== 'completed' || m.score_home == null || m.score_away == null) continue

    const home = m.team_home_id
    const away = m.team_away_id
    if (!home || !away) continue

    const homeStats = teamStats.get(home) || { played: 0, wins: 0, losses: 0, pf: 0, ps: 0 }
    const awayStats = teamStats.get(away) || { played: 0, wins: 0, losses: 0, pf: 0, ps: 0 }

    homeStats.played++
    awayStats.played++
    homeStats.pf += m.score_home
    homeStats.ps += m.score_away
    awayStats.pf += m.score_away
    awayStats.ps += m.score_home

    if (m.score_home > m.score_away) {
      homeStats.wins++
      awayStats.losses++
    } else {
      homeStats.losses++
      awayStats.wins++
    }

    teamStats.set(home, homeStats)
    teamStats.set(away, awayStats)
  }

  const rows = Array.from(teamStats.entries())
    .map(([teamId, stats]) => {
      const team = teams.find(t => t.id === teamId)
      return {
        team_id: teamId,
        team_name: team?.name ?? 'Sconosciuta',
        played: stats.played,
        wins: stats.wins,
        losses: stats.losses,
        point_differential: stats.pf - stats.ps,
      }
    })
    .filter(r => r.played > 0)
    .sort((a, b) => b.wins - a.wins || b.point_differential - a.point_differential)

  return rows
}

function ShowcaseStandings({ groups, matches, category, theme }: { groups: GroupWithTeams[]; matches: MatchWithTeams[]; category: TeamCategory; theme: Record<string, string> }) {
  const lightMode = theme.bg === 'bg-white'
  const groupsForCat = groups.filter(g => g.category === category)
  const groupMatches = matches.filter(m => m.phase === 'group' && m.category === category)

  if (groupsForCat.length === 0) {
    return (
      <div className={clsx('h-full flex items-center justify-center', theme.textMuted)}>
        <p className="text-sm">Nessun girone per questa categoria</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className={clsx('px-4 py-3 flex items-center justify-between', theme.headerBg)}>
        <h2 className={clsx('font-display font-bold uppercase text-sm tracking-wide', theme.textDarker)}>
          Classifiche
        </h2>
        <span className={clsx('text-[10px] px-2 py-0.5 rounded text-white', CATEGORY_COLORS[category])}>
          {category}
        </span>
      </div>
      <div className={clsx('flex-1 overflow-y-auto p-4 space-y-6', theme.cardBg)}>
        {groupsForCat.map(group => {
          const teams = group.group_teams.flatMap(gt => gt.teams ? [gt.teams] : [])
          const groupSpecificMatches = groupMatches.filter(m => m.group_id === group.id)
          const standings = computeStandings(groupSpecificMatches, teams)

          return (
            <div key={group.id}>
              <p className="font-display uppercase text-xs tracking-widest text-brand-orange mb-2">
                Girone {group.name}
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className={clsx(theme.textMuted)}>
                    <th className="text-left py-2 pr-3 font-display uppercase">#</th>
                    <th className="text-left py-2 pr-3 font-display uppercase">Squadra</th>
                    <th className="text-center py-2 pr-3 font-display uppercase">G</th>
                    <th className="text-center py-2 pr-3 font-display uppercase">V</th>
                    <th className="text-center py-2 font-display uppercase">+/-</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, idx) => (
                    <tr key={row.team_id} className={clsx(theme.tableRow)}>
                      <td className="py-2 pr-3">
                        <span className={clsx('font-display font-bold', idx < 2 ? 'text-brand-orange' : theme.textMuted)}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className={clsx('py-2 pr-3 truncate', theme.tableText)}>{row.team_name}</td>
                      <td className={clsx('py-2 pr-3 text-center', theme.textMuted)}>{row.played}</td>
                      <td className={clsx('py-2 pr-3 text-center font-semibold', theme.tableText)}>{row.wins}</td>
                      <td className="py-2 text-center">
                        <span className={clsx(
                          'font-display font-bold',
                          row.point_differential > 0 ? 'text-green-600' : row.point_differential < 0 ? 'text-red-600' : theme.textMuted
                        )}>
                          {row.point_differential > 0 ? `+${row.point_differential}` : row.point_differential}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Bracket Component ────────────────────────────────────────────────────────────

function ShowcaseBracket({ matches, category }: { matches: MatchWithTeams[]; category: TeamCategory }) {
  const bracketMatches = matches.filter(m => m.phase === 'bracket' && m.category === category)

  if (bracketMatches.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-court-muted text-sm">Tabellone non disponibile</p>
      </div>
    )
  }

  const roundLabels: Record<string, string> = {
    round_of_16: 'Ottavi',
    quarterfinal: 'Quarti',
    semifinal: 'Semifinali',
    final: 'Finale',
  }

  const byRound = new Map<string, MatchWithTeams[]>()
  for (const m of bracketMatches) {
    const r = m.bracket_round ?? 'other'
    if (!byRound.has(r)) byRound.set(r, [])
    byRound.get(r)!.push(m)
  }

  const rounds = ['round_of_16', 'quarterfinal', 'semifinal', 'final'].filter(r => byRound.has(r))

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between bg-court-dark border-b border-court-border">
        <h2 className="font-display font-bold uppercase text-sm tracking-wide text-court-white">
          Tabellone
        </h2>
        <span className={clsx('text-[10px] px-2 py-0.5 rounded text-white', CATEGORY_COLORS[category])}>
          {category}
        </span>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-6 h-full min-w-max">
          {rounds.map(round => (
            <div key={round} className="flex flex-col gap-3 min-w-[140px]">
              <p className="font-display uppercase text-xs tracking-widest text-brand-orange text-center shrink-0">
                {roundLabels[round]}
              </p>
              <div className="flex flex-col gap-2">
                {(byRound.get(round) ?? []).map(m => {
                  const isDone = m.status === 'completed'
                  const homeWon = isDone && m.score_home != null && m.score_away != null && m.score_home > m.score_away
                  const awayWon = isDone && m.score_home != null && m.score_away != null && m.score_away > m.score_home

                  return (
                    <div key={m.id} className="card p-2 text-xs">
                      <div className={clsx('flex justify-between py-1 border-b border-court-border/50', homeWon && 'bg-brand-orange/10')}>
                        <span className={clsx('truncate', homeWon ? 'font-bold text-court-white' : 'text-court-muted')}>
                          {m.team_home?.name ?? 'TBD'}
                        </span>
                        {isDone && m.score_home != null && (
                          <span className={clsx('font-display font-bold', homeWon ? 'text-court-white' : 'text-court-muted')}>
                            {m.score_home}
                          </span>
                        )}
                      </div>
                      <div className={clsx('flex justify-between py-1', awayWon && 'bg-brand-orange/10')}>
                        <span className={clsx('truncate', awayWon ? 'font-bold text-court-white' : 'text-court-muted')}>
                          {m.team_away?.name ?? 'TBD'}
                        </span>
                        {isDone && m.score_away != null && (
                          <span className={clsx('font-display font-bold', awayWon ? 'text-court-white' : 'text-court-muted')}>
                            {m.score_away}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── 3-Point Contest Component ──────────────────────────────────────────────────

function ShowcaseTPC({ contests, category, theme }: { contests: TpcContestFull[]; category: 'open' | 'under'; theme: Record<string, string> }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const lightMode = theme.bg === 'bg-white'

  const contest = contests.find(c => c.category === category) ?? null

  if (!contest) {
    return (
      <div className={clsx('h-full flex items-center justify-center', theme.textMuted)}>
        <p className="text-sm">Gara non disponibile</p>
      </div>
    )
  }

  const sortedRounds = [...contest.tpc_rounds].sort((a, b) => a.round_number - b.round_number)
  const columnCount = sortedRounds.length
  const flexClass = columnCount === 1 ? 'justify-center' : columnCount === 2 ? 'justify-center gap-8' : 'gap-6'

  // Auto-scroll to live player on mount
  React.useEffect(() => {
    if (!containerRef.current) return
    const liveEntry = containerRef.current.querySelector('[data-is-live="true"]')
    if (liveEntry) {
      liveEntry.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [contest])

  return (
    <div className="h-full flex flex-col">
      <div className={clsx('px-6 py-4 border-b', theme.headerBg, lightMode ? 'border-gray-300' : 'border-court-border')}>
        <h2 className={clsx('font-display font-bold uppercase text-lg tracking-wide', theme.textDarker)}>
          3-Point Contest {category === 'open' ? 'Open' : 'Under'}
        </h2>
      </div>
      <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className={`flex h-full min-w-max ${flexClass}`}>
          {sortedRounds.map(round => {
            const sortedEntries = [...round.tpc_entries].sort((a, b) => a.sort_order - b.sort_order)
            const minWidth = columnCount === 1 ? 'min-w-[400px]' : columnCount === 2 ? 'min-w-[350px]' : 'min-w-[280px]'
            const flexGrow = columnCount <= 2 ? 'flex-1 max-w-xl' : ''
            return (
              <div key={round.id} className={`flex flex-col ${minWidth} ${flexGrow}`}>
                {/* Round header */}
                <div className={clsx('px-4 py-4 text-center mb-4', theme.headerBg)}>
                  <p className="font-display font-bold uppercase text-lg tracking-wide text-brand-orange">
                    {round.name}
                  </p>
                </div>
                {/* Table */}
                <div className={clsx('card overflow-hidden flex-1', theme.card)}>
                  <table className="w-full text-sm">
                    <thead className={clsx('sticky top-0 z-10', lightMode ? 'bg-white shadow-[0_1px_0_0_#d1d5db]' : 'bg-court-surface shadow-[0_1px_0_0_#444]')}>
                      <tr>
                        <th className={clsx('text-left py-2 px-3 font-display uppercase text-xs w-10', theme.textMuted)}>#</th>
                        <th className={clsx('text-left py-2 px-3 font-display uppercase text-xs', theme.textMuted)}>Giocatore</th>
                        <th className={clsx('text-right py-2 px-3 font-display uppercase text-xs w-20', theme.textMuted)}>Punti</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEntries.map((entry, idx) => (
                        <tr
                          key={entry.id}
                          data-is-live={entry.is_live || undefined}
                          className={clsx(
                            'transition-colors',
                            theme.tableRow,
                            entry.is_live && theme.liveBg,
                            entry.is_qualified && !entry.is_live && theme.qualifiedBg,
                          )}
                        >
                          <td className="py-3 px-3">
                            <span className={clsx(
                              'font-display font-bold text-base',
                              entry.is_live ? theme.liveText : entry.is_qualified ? theme.qualifiedText : theme.textMuted
                            )}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className={clsx('text-base truncate', theme.tableText)}>{entry.tpc_players.name}</span>
                              {entry.is_live && (
                                <span className="flex items-center gap-1 shrink-0">
                                  <span className={clsx('w-2 h-2 rounded-full animate-pulse', lightMode ? 'bg-red-600' : 'bg-red-500')} />
                                  <span className={clsx('text-xs font-display uppercase', theme.liveText)}>LIVE</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={clsx(
                              'font-display font-bold text-2xl',
                              entry.is_live ? theme.liveText : entry.is_qualified ? theme.qualifiedText : theme.tableText
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
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Sponsor Strip (Bottom - All Modes) ──────────────────────────────────────────

function SponsorStrip({ sponsors, theme }: { sponsors: Sponsor[]; theme: Record<string, string> }) {
  if (!sponsors.length) return null

  const copies = Math.max(2, Math.ceil(12 / sponsors.length))
  const set = Array.from({ length: copies }, () => sponsors).flat()
  const items = [...set, ...set]

  return (
    <div className={clsx('h-16 border-t shrink-0', theme.border, theme.headerBg)}>
      <div className="h-full overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}>
        <div
          className="h-full flex items-center w-max"
          style={{
            animation: `sponsor-scroll ${Math.max(set.length * 3, 15)}s linear infinite`,
          }}
        >
          {items.map((sponsor, i) => (
            <div
              key={`${sponsor.id}-${i}`}
              className="relative h-10 aspect-[3/2] shrink-0 mr-8 bg-white overflow-hidden"
            >
              {sponsor.logo_url ? (
                <img
                  src={sponsor.logo_url}
                  alt={sponsor.name}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-display font-bold text-brand-orange/60 text-xs uppercase">
                    {sponsor.name}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Single Sponsor Rotating Display ─────────────────────────────────────────────

function SingleSponsorDisplay({ sponsors, theme }: { sponsors: Sponsor[]; theme: Record<string, string> }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (sponsors.length <= 1) return
    const interval = setInterval(() => {
      setIndex(i => (i + 1) % sponsors.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [sponsors.length])

  if (!sponsors.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-court-muted text-lg">Nessuno sponsor disponibile</p>
      </div>
    )
  }

  const sponsor = sponsors[index]

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12">
      <div className="w-full max-w-3xl aspect-[3/2] relative mb-8 bg-white overflow-hidden">
        {sponsor.logo_url ? (
          sponsor.website_url ? (
            <a
              href={sponsor.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-full block transition-transform hover:scale-[1.02]"
            >
              <img
                src={sponsor.logo_url}
                alt={sponsor.name}
                className="w-full h-full object-contain p-8"
              />
            </a>
          ) : (
            <img
              src={sponsor.logo_url}
              alt={sponsor.name}
              className="w-full h-full object-contain p-8"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-display font-bold text-gray-400 text-4xl uppercase">
              {sponsor.name}
            </span>
          </div>
        )}
      </div>
      <p className="font-display uppercase tracking-widest text-brand-orange text-xl">
        {sponsor.name}
      </p>
      {sponsors.length > 1 && (
        <div className="flex gap-2 mt-4">
          {sponsors.map((_, i) => (
            <span
              key={i}
              className={clsx(
                'w-2 h-2 rounded-full transition-all',
                i === index ? 'bg-brand-orange' : 'bg-court-muted'
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Showcase Page ──────────────────────────────────────────────────────────

export default function ShowcasePage() {
  const [mode, setMode] = useState<ShowcaseMode>('open')
  const [lightMode, setLightMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    edition: Edition | null
    matches: MatchWithTeams[]
    groups: GroupWithTeams[]
    tpcContests: TpcContestFull[]
    sponsors: Sponsor[]
  }>({
    edition: null,
    matches: [],
    groups: [],
    tpcContests: [],
    sponsors: [],
  })
  const [underCategoryIndex, setUnderCategoryIndex] = useState(0)

  const supabase = createClient()

  async function fetchAll() {
    const [{ data: modeData }, { data: editionData }, { data: matchData }, { data: groupData }, { data: tpcData }, { data: sponsorData }] = await Promise.all([
      supabase.from('showcase_modes').select('mode, light_mode').eq('id', 'default').single(),
      supabase.from('editions').select('*').eq('is_current', true).maybeSingle(),
      supabase
        .from('matches')
        .select('*, team_home:teams!matches_team_home_id_fkey(id, name), team_away:teams!matches_team_away_id_fkey(id, name), group:groups!matches_group_id_fkey(id, name)')
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .order('sort_order'),
      supabase.from('groups').select('*, group_teams(*, teams(id, name))').order('sort_order'),
      supabase.from('tpc_contests').select('*, tpc_players(*), tpc_rounds(*, tpc_entries(*, tpc_players(id, name)))'),
      supabase.from('sponsors').select('*').eq('is_active', true).order('sort_order'),
    ])

    setData({
      edition: editionData,
      matches: matchData ?? [],
      groups: groupData ?? [],
      tpcContests: tpcData ?? [],
      sponsors: sponsorData ?? [],
    })

    if (modeData?.mode) setMode(modeData.mode)
    if (modeData?.light_mode !== undefined) setLightMode(modeData.light_mode)
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, AUTO_REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  // Under mode carousel
  useEffect(() => {
    if (mode !== 'under') return
    const interval = setInterval(() => {
      setUnderCategoryIndex(i => (i + 1) % CATEGORY_ORDER.length)
    }, UNDER_CATEGORY_CYCLE_MS)
    return () => clearInterval(interval)
  }, [mode])

  if (loading) {
    return (
      <div className={clsx('h-screen flex items-center justify-center', lightMode ? 'bg-white' : 'bg-court-dark')}>
        <p className={clsx('font-display uppercase tracking-widest', lightMode ? 'text-gray-600' : 'text-court-gray')}>Caricamento...</p>
      </div>
    )
  }

  const currentUnderCategory = CATEGORY_ORDER[underCategoryIndex]

  // Light mode theme classes
  const theme = {
    bg: lightMode ? 'bg-white' : 'bg-court-dark',
    text: lightMode ? 'text-gray-900' : 'text-court-white',
    textMuted: lightMode ? 'text-gray-600' : 'text-court-muted',
    textLight: lightMode ? 'text-gray-800' : 'text-court-light',
    textDarker: lightMode ? 'text-gray-950' : 'text-court-white',
    border: lightMode ? 'border-gray-300' : 'border-court-border',
    card: lightMode ? 'bg-white border-gray-300' : 'bg-court-surface border-court-border',
    cardBg: lightMode ? 'bg-white' : 'bg-court-surface',
    headerBg: lightMode ? 'bg-white' : 'bg-court-dark',
    inputBg: lightMode ? 'bg-gray-100' : 'bg-white/[0.02]',
    liveBg: lightMode ? 'bg-red-100' : 'bg-red-500/5',
    liveBorder: lightMode ? 'border-red-500' : 'border-red-500',
    liveText: lightMode ? 'text-red-700' : 'text-red-400',
    qualifiedBg: lightMode ? 'bg-orange-100' : 'bg-brand-orange/5',
    qualifiedBorder: lightMode ? 'border-orange-400' : 'border-brand-orange/50',
    qualifiedText: lightMode ? 'text-orange-700' : 'text-brand-orange',
    tableRow: lightMode ? 'hover:bg-gray-100' : 'hover:bg-white/[0.02]',
    tableBorder: lightMode ? 'border-gray-200' : 'border-court-border',
    tableText: lightMode ? 'text-gray-800' : 'text-court-white',
    tableMuted: lightMode ? 'text-gray-600' : 'text-court-muted',
    tableHighlight: lightMode ? 'text-gray-900 font-bold' : 'text-court-white font-bold',
  }

  return (
    <div className={clsx('h-screen flex flex-col overflow-hidden', theme.bg)}>
      <style jsx>{`
        @keyframes sponsor-strip-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        ${lightMode ? `
          ::-webkit-scrollbar { width: 8px; height: 8px; }
          ::-webkit-scrollbar-track { background: #f3f4f6; }
          ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
          ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        ` : ''}
      `}</style>

      <main className="flex-1 overflow-hidden">
        {/* Mode 1: Open - Calendar (60%) + Standings (40%) */}
        {mode === 'open' && (
          <div className="h-full flex">
            <div className={clsx('w-[60%] border-r', theme.border)}>
              <ShowcaseCalendar matches={data.matches} theme={theme} />
            </div>
            <div className="w-[40%]">
              <ShowcaseStandings groups={data.groups} matches={data.matches} category="open" theme={theme} />
            </div>
          </div>
        )}

        {/* Mode 2: Under - Carousel through U14/U16/U18 */}
        {mode === 'under' && (
          <div className="h-full flex">
            <div className={clsx('w-[60%] border-r', theme.border)}>
              <ShowcaseCalendar matches={data.matches} theme={theme} />
            </div>
            <div className="w-[40%]">
              <ShowcaseStandings 
                groups={data.groups} 
                matches={data.matches} 
                category={currentUnderCategory} 
                theme={theme}
              />
            </div>
            {/* Category indicator */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2">
              {CATEGORY_ORDER.map((cat, idx) => (
                <span
                  key={cat}
                  className={clsx(
                    'px-3 py-1 rounded text-xs font-display uppercase tracking-wide transition-all',
                    idx === underCategoryIndex 
                      ? 'bg-brand-orange text-white' 
                      : lightMode 
                        ? 'bg-gray-200 text-gray-700' 
                        : 'bg-court-surface text-court-muted'
                  )}
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Mode 3: TPC Open */}
        {mode === 'tpc_open' && (
          <ShowcaseTPC contests={data.tpcContests} category="open" theme={theme} />
        )}

        {/* Mode 4: TPC Under */}
        {mode === 'tpc_under' && (
          <ShowcaseTPC contests={data.tpcContests} category="under" theme={theme} />
        )}

        {/* Mode 5: Sponsors - Single rotating sponsor */}
        {mode === 'sponsors' && (
          <SingleSponsorDisplay sponsors={data.sponsors} theme={theme} />
        )}
      </main>

      {/* Sponsor strip at bottom - visible on all modes except sponsors */}
      {mode !== 'sponsors' && <SponsorStrip sponsors={data.sponsors} theme={theme} />}
    </div>
  )
}