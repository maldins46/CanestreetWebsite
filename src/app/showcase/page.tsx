'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  Edition, GroupWithTeams, MatchWithTeams,
  TpcContestFull, Sponsor, TeamCategory, CalendarioEvent, ShowcaseMode
} from '@/types'
import clsx from 'clsx'
import { resolveContextualShowcaseMode } from '@/lib/showcase'

const AUTO_REFRESH_INTERVAL = 15000
const UNDER_CATEGORY_CYCLE_MS = 20000

const OPEN_CATEGORY_ORDER: TeamCategory[] = ['open_m', 'open_f']
const CATEGORY_ORDER: TeamCategory[] = ['u14_m', 'u16_m', 'u18_m']
const CATEGORY_COLORS: Record<TeamCategory, string> = {
  open_m: 'bg-brand-orange',
  open_f: 'bg-pink-500',
  u18_m: 'bg-blue-500',
  u16_m: 'bg-purple-500',
  u14_m: 'bg-green-600',
}
const CATEGORY_SHORT: Record<TeamCategory, string> = {
  open_m: 'Open M',
  open_f: 'Open F',
  u18_m: 'U18',
  u16_m: 'U16',
  u14_m: 'U14',
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Rome' })
}

// ─── Calendar Component ──────────────────────────────────────────────────────────

type ShowcaseRow =
  | { type: 'match'; data: MatchWithTeams }
  | { type: 'event'; data: CalendarioEvent }

function ShowcaseCalendar({ matches, events, theme }: { matches: MatchWithTeams[]; events: CalendarioEvent[]; theme: Record<string, string> }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const lightMode = theme.bg === 'bg-white'

  const roundLabels: Record<string, string> = {
    round_of_16: 'Ottavi',
    quarterfinal: 'Quarti',
    semifinal: 'Semifinali',
    final: 'Finale',
  }

  function getPhaseLabel(match: MatchWithTeams): string {
    if (match.phase === 'group' && match.group) return `Girone ${match.group.name}`
    return match.bracket_round ? (roundLabels[match.bracket_round] ?? '') : ''
  }

  const rows: ShowcaseRow[] = [
    ...matches.map(m => ({ type: 'match' as const, data: m })),
    ...events.map(e => ({ type: 'event' as const, data: e })),
  ].sort((a, b) => {
    const at = a.data.scheduled_at ? new Date(a.data.scheduled_at).getTime() : Infinity
    const bt = b.data.scheduled_at ? new Date(b.data.scheduled_at).getTime() : Infinity
    return at - bt
  })

  React.useEffect(() => {
    if (!containerRef.current) return
    const liveItem = rows.find(r => r.data.status === 'in_progress')
    if (!liveItem) return
    const key = liveItem.type === 'match' ? liveItem.data.id : liveItem.data.id
    const el = containerRef.current.querySelector(`[data-row-id="${key}"]`)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, events])

  return (
    <div className="h-full flex flex-col">
      <div className={clsx('px-4 py-3 border-b', lightMode ? 'bg-gray-100' : 'bg-court-surface', theme.border)}>
        <h2 className="font-display font-bold uppercase text-sm tracking-wide text-brand-orange">
          Calendario
        </h2>
      </div>
      <div ref={containerRef} className={clsx('flex-1 overflow-auto', theme.cardBg)}>
        {rows.length === 0 ? (
          <p className={clsx('text-sm text-center py-8', theme.textMuted)}>Nessuna partita programmata</p>
        ) : (
          <table className="w-full text-xs">
            <thead className={clsx('sticky top-0 z-10', lightMode ? 'bg-gray-100 shadow-[0_1px_0_0_#d1d5db]' : 'bg-court-surface shadow-[0_1px_0_0_#333]')}>
              <tr>
                <th className={clsx('text-center px-3 py-2 font-display uppercase whitespace-nowrap w-px', theme.textMuted)}>Data</th>
                <th className={clsx('text-center px-3 py-2 font-display uppercase whitespace-nowrap w-px', theme.textMuted)}>Ora</th>
                <th className={clsx('text-center px-3 py-2 font-display uppercase whitespace-nowrap w-px', theme.textMuted)}>Cat.</th>
                <th className={clsx('text-center px-3 py-2 font-display uppercase whitespace-nowrap w-px', theme.textMuted)}>Turno</th>
                <th className={clsx('text-right px-3 py-2 font-display uppercase whitespace-nowrap', theme.textMuted)}>Casa</th>
                <th className={clsx('text-center px-3 py-2 font-display uppercase whitespace-nowrap w-px', theme.textMuted)}>Pts</th>
                <th className={clsx('text-center px-3 py-2 font-display uppercase whitespace-nowrap w-px', theme.textMuted)}>Pts</th>
                <th className={clsx('text-left px-3 py-2 font-display uppercase whitespace-nowrap', theme.textMuted)}>Ospite</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                if (row.type === 'event') {
                  const e = row.data
                  const isLive = e.status === 'in_progress'
                  return (
                    <tr
                      data-row-id={e.id}
                      key={`event-${e.id}`}
                      className={clsx('border-b last:border-b-0', theme.tableBorder, isLive && 'bg-red-500/10')}
                    >
                      <td className={clsx('px-3 py-2 w-px whitespace-nowrap text-center', theme.textMuted)}>
                        {formatDate(e.scheduled_at)}
                      </td>
                      <td className="px-3 py-2 w-px whitespace-nowrap text-center">
                        {isLive ? (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-red-500" />
                            <span className="font-bold text-red-500">LIVE</span>
                          </span>
                        ) : (
                          <span className={theme.textMuted}>{formatTime(e.scheduled_at)}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 w-px whitespace-nowrap text-center">
                        <span className="text-[10px] px-1.5 py-0.5 rounded text-white bg-teal-500">
                          Eventi
                        </span>
                      </td>
                      <td className="px-3 py-2 w-px whitespace-nowrap" />
                      <td colSpan={4} className={clsx('px-3 py-2 text-center', theme.textMuted)}>
                        {e.name}
                      </td>
                    </tr>
                  )
                }

                const m = row.data as MatchWithTeams
                const isLive = m.status === 'in_progress'
                const isDone = m.status === 'completed'
                const homeWon = isDone && m.score_home != null && m.score_away != null && m.score_home > m.score_away
                const awayWon = isDone && m.score_home != null && m.score_away != null && m.score_away > m.score_home

                return (
                  <tr
                    data-row-id={m.id}
                    key={`match-${m.id}`}
                    className={clsx(
                      'border-b last:border-b-0',
                      theme.tableBorder,
                      isLive && theme.liveBg,
                    )}
                  >
                    <td className={clsx('px-3 py-2 w-px whitespace-nowrap text-center', theme.textMuted)}>
                      {formatDate(m.scheduled_at)}
                    </td>
                    <td className="px-3 py-2 w-px whitespace-nowrap text-center">
                      {isLive ? (
                        <span className="flex items-center gap-1">
                          <span className={clsx('w-1.5 h-1.5 rounded-full animate-pulse', lightMode ? 'bg-red-600' : 'bg-red-500')} />
                          <span className={clsx('font-bold', theme.liveText)}>LIVE</span>
                        </span>
                      ) : (
                        <span className={theme.textMuted}>{formatTime(m.scheduled_at)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 w-px whitespace-nowrap text-center">
                      <span className={clsx('text-[10px] px-1.5 py-0.5 rounded text-white', CATEGORY_COLORS[m.category])}>
                        {CATEGORY_SHORT[m.category]}
                      </span>
                    </td>
                    <td className={clsx('px-3 py-2 w-px whitespace-nowrap text-center', theme.textMuted)}>
                      {getPhaseLabel(m) || '—'}
                    </td>
                    <td className={clsx('px-3 py-2 max-w-0 overflow-hidden text-right', homeWon ? theme.tableHighlight : theme.textMuted)}>
                      <span className="block truncate">{m.team_home?.name ?? 'TBD'}</span>
                    </td>
                    <td className="px-3 py-2 w-px whitespace-nowrap text-center">
                      {isDone && m.score_home != null ? (
                        <span className={clsx('font-display font-bold', homeWon ? (lightMode ? 'text-green-600' : 'text-green-400') : theme.textMuted)}>
                          {m.score_home}
                        </span>
                      ) : (
                        <span className={theme.textMuted}>—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 w-px whitespace-nowrap text-center">
                      {isDone && m.score_away != null ? (
                        <span className={clsx('font-display font-bold', awayWon ? (lightMode ? 'text-green-600' : 'text-green-400') : theme.textMuted)}>
                          {m.score_away}
                        </span>
                      ) : (
                        <span className={theme.textMuted}>—</span>
                      )}
                    </td>
                    <td className={clsx('px-3 py-2 max-w-0 overflow-hidden', awayWon ? theme.tableHighlight : theme.textMuted)}>
                      <span className="block truncate">{m.team_away?.name ?? 'TBD'}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
        pf: stats.pf,
        ps: stats.ps,
        point_differential: stats.pf - stats.ps,
      }
    })
    .sort((a, b) => b.wins - a.wins || b.point_differential - a.point_differential)

  return rows
}

// Estimate rendered height of one girone section (group header + col header + team rows)
function estimateGroupHeight(group: GroupWithTeams): number {
  const teamCount = group.group_teams.filter(gt => gt.teams).length
  return 29 + 33 + teamCount * 33
}

// Split groups into pages that fit within availableHeight
function splitGroupsToFit(groups: GroupWithTeams[], availableHeight: number): GroupWithTeams[][] {
  if (!availableHeight || groups.length === 0) return [groups]
  const pages: GroupWithTeams[][] = [[]]
  let currentHeight = 0
  for (const group of groups) {
    const h = estimateGroupHeight(group)
    if (currentHeight + h > availableHeight && pages[pages.length - 1].length > 0) {
      pages.push([group])
      currentHeight = h
    } else {
      pages[pages.length - 1].push(group)
      currentHeight += h
    }
  }
  return pages
}

function ShowcaseStandings({ groups, matches, category, theme, carousel }: {
  groups: GroupWithTeams[]
  matches: MatchWithTeams[]
  category: TeamCategory
  theme: Record<string, string>
  carousel?: { categories: TeamCategory[]; activeIndex: number; validCategories?: TeamCategory[] }
}) {
  const lightMode = theme.bg === 'bg-white'
  const groupsForCat = groups.filter(g => g.category === category)
  const groupMatches = matches.filter(m => m.phase === 'group' && m.category === category)

  const contentRef = React.useRef<HTMLDivElement>(null)
  const [subPages, setSubPages] = React.useState<GroupWithTeams[][]>([groupsForCat])
  const [subPageIndex, setSubPageIndex] = React.useState(0)

  // Reset to first sub-page when category changes
  React.useEffect(() => {
    setSubPageIndex(0)
    setSubPages([groupsForCat])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  // Recompute sub-pages when container height or groups change
  React.useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const doCompute = () => {
      const available = el.clientHeight
      if (!available) return
      const pages = splitGroupsToFit(groupsForCat, available)
      setSubPages(pages)
    }
    doCompute()
    const obs = new ResizeObserver(doCompute)
    obs.observe(el)
    return () => obs.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, groups])

  // Clamp index if sub-page count shrinks
  React.useEffect(() => {
    setSubPageIndex(prev => Math.min(prev, Math.max(0, subPages.length - 1)))
  }, [subPages.length])

  // Auto-cycle through sub-pages
  React.useEffect(() => {
    if (subPages.length <= 1) return
    const interval = setInterval(() => {
      setSubPageIndex(prev => (prev + 1) % subPages.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [subPages.length])

  const safeSubPageIndex = Math.min(subPageIndex, subPages.length - 1)
  const currentGroups = (subPages[safeSubPageIndex] ?? groupsForCat).filter(g => g.category === category)
  const hasSubPages = subPages.length > 1

  if (groupsForCat.length === 0) {
    return (
      <div className={clsx('h-full flex items-center justify-center', theme.textMuted)}>
        <p className="text-sm">Nessun girone per questa categoria</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className={clsx('px-4 py-3 flex items-center justify-between border-b', lightMode ? 'bg-gray-100' : 'bg-court-surface', theme.border)}>
        <h2 className="font-display font-bold uppercase text-sm tracking-wide text-brand-orange">
          Classifiche
        </h2>
        {carousel ? (
          <div className="flex gap-1.5">
            {carousel.categories.flatMap((cat, idx) => {
              const isActive = idx === carousel.activeIndex
              const isDisabled = carousel.validCategories && !carousel.validCategories.includes(cat)
              if (isActive && hasSubPages) {
                return subPages.map((_, pageIdx) => (
                  <span
                    key={`${cat}-${pageIdx}`}
                    className={clsx(
                      'text-[10px] px-2 py-0.5 rounded font-display uppercase tracking-wide transition-all',
                      pageIdx === safeSubPageIndex
                        ? 'bg-brand-orange text-white'
                        : lightMode ? 'bg-gray-200 text-gray-500' : 'bg-court-border text-court-muted',
                    )}
                  >
                    {CATEGORY_SHORT[cat]} {pageIdx + 1}
                  </span>
                ))
              }
              return [
                <span
                  key={cat}
                  className={clsx(
                    'text-[10px] px-2 py-0.5 rounded font-display uppercase tracking-wide transition-all',
                    isDisabled
                      ? clsx('line-through', lightMode ? 'bg-gray-100 text-gray-400' : 'bg-court-dark text-court-border')
                      : isActive
                        ? 'bg-brand-orange text-white'
                        : lightMode ? 'bg-gray-200 text-gray-500' : 'bg-court-border text-court-muted',
                  )}
                >
                  {CATEGORY_SHORT[cat]}
                </span>,
              ]
            })}
          </div>
        ) : (
          <div className="flex gap-1.5">
            {hasSubPages ? subPages.map((_, pageIdx) => (
              <span
                key={pageIdx}
                className={clsx(
                  'text-[10px] px-2 py-0.5 rounded font-display uppercase tracking-wide',
                  pageIdx === safeSubPageIndex
                    ? clsx('text-white', CATEGORY_COLORS[category])
                    : lightMode ? 'bg-gray-200 text-gray-500' : 'bg-court-border text-court-muted',
                )}
              >
                {CATEGORY_SHORT[category]} {pageIdx + 1}
              </span>
            )) : (
              <span className={clsx('text-[10px] px-2 py-0.5 rounded text-white', CATEGORY_COLORS[category])}>
                {CATEGORY_SHORT[category]}
              </span>
            )}
          </div>
        )}
      </div>
      <div ref={contentRef} className={clsx('flex-1 overflow-y-hidden overflow-x-hidden', theme.cardBg)}>
        {currentGroups.map(group => {
          const teams = group.group_teams.flatMap(gt => gt.teams ? [gt.teams] : [])
          const groupSpecificMatches = groupMatches.filter(m => m.group_id === group.id)
          const standings = computeStandings(groupSpecificMatches, teams)
          return (
            <div key={group.id}>
              <div className={clsx('px-3 py-1.5 border-b border-t', lightMode ? 'bg-gray-200 border-gray-300' : 'bg-court-dark border-court-border')}>
                <span className={clsx('font-display font-bold uppercase text-xs tracking-wide', theme.textMuted)}>
                  Girone {group.name}
                </span>
              </div>
              <table className="w-full text-xs">
                <thead className={clsx(lightMode ? 'bg-gray-100' : 'bg-court-surface')}>
                  <tr className={clsx('border-b', theme.tableBorder)}>
                    <th className={clsx('text-center py-2 px-3 font-display uppercase w-px whitespace-nowrap', theme.textMuted)}>#</th>
                    <th className={clsx('text-left py-2 px-3 font-display uppercase', theme.textMuted)}>Squadra</th>
                    <th className={clsx('text-center py-2 px-3 font-display uppercase w-px whitespace-nowrap', theme.textMuted)}>V</th>
                    <th className={clsx('text-center py-2 px-3 font-display uppercase w-px whitespace-nowrap', theme.textMuted)}>S</th>
                    <th className={clsx('text-center py-2 px-3 font-display uppercase w-px whitespace-nowrap', theme.textMuted)}>PF</th>
                    <th className={clsx('text-center py-2 px-3 font-display uppercase w-px whitespace-nowrap', theme.textMuted)}>PS</th>
                    <th className={clsx('text-center py-2 px-3 font-display uppercase w-px whitespace-nowrap', theme.textMuted)}>+/-</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, idx) => (
                    <tr key={row.team_id} className={clsx('border-b last:border-b-0', theme.tableBorder, theme.tableRow)}>
                      <td className="py-2 px-3 w-px whitespace-nowrap text-center">
                        <span className={clsx('font-display font-bold', idx < 2 ? 'text-brand-orange' : theme.textMuted)}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className={clsx('py-2 px-3 max-w-0 overflow-hidden', theme.tableText)}>
                        <span className="block truncate">{row.team_name}</span>
                      </td>
                      <td className={clsx('py-2 px-3 text-center font-semibold w-px whitespace-nowrap', theme.tableText)}>{row.wins}</td>
                      <td className={clsx('py-2 px-3 text-center w-px whitespace-nowrap', theme.textMuted)}>{row.losses}</td>
                      <td className={clsx('py-2 px-3 text-center w-px whitespace-nowrap', theme.textMuted)}>{row.pf}</td>
                      <td className={clsx('py-2 px-3 text-center w-px whitespace-nowrap', theme.textMuted)}>{row.ps}</td>
                      <td className="py-2 px-3 text-center w-px whitespace-nowrap">
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
          {CATEGORY_SHORT[category]}
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
  const isDragging = React.useRef(false)
  const lightMode = theme.bg === 'bg-white'

  const contest = contests.find(c => c.category === category) ?? null
  const sortedRounds = contest ? [...contest.tpc_rounds].sort((a, b) => a.round_number - b.round_number) : []
  const columnCount = sortedRounds.length

  const [colWidths, setColWidths] = React.useState<number[]>(() =>
    sortedRounds.map(() => 100 / Math.max(columnCount, 1))
  )

  // Reset widths when the contest or round count changes
  React.useEffect(() => {
    const n = contest?.tpc_rounds.length ?? 0
    setColWidths(Array.from({ length: n }, () => 100 / Math.max(n, 1)))
  }, [contest?.id, contest?.tpc_rounds.length])

  // Auto-scroll to live player on mount
  React.useEffect(() => {
    if (!containerRef.current) return
    const liveEntry = containerRef.current.querySelector('[data-is-live="true"]')
    if (liveEntry) {
      liveEntry.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [contest])

  function handleDividerMouseDown(e: React.MouseEvent, divIdx: number) {
    e.preventDefault()
    isDragging.current = true
    const startX = e.clientX
    const startWidths = [...colWidths]
    const containerWidth = containerRef.current?.offsetWidth ?? window.innerWidth

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const delta = ((ev.clientX - startX) / containerWidth) * 100
      const newLeft = startWidths[divIdx] + delta
      const newRight = startWidths[divIdx + 1] - delta
      if (newLeft < 15 || newRight < 15) return
      const next = [...startWidths]
      next[divIdx] = newLeft
      next[divIdx + 1] = newRight
      setColWidths(next)
    }
    const onUp = () => {
      isDragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (!contest) {
    return (
      <div className={clsx('h-full flex items-center justify-center', theme.textMuted)}>
        <p className="text-sm">Gara non disponibile</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header — same style as ShowcaseCalendar/ShowcaseStandings */}
      <div className={clsx('px-4 py-4 border-b', lightMode ? 'bg-gray-100' : 'bg-court-surface', theme.border)}>
        <h2 className="font-display font-bold uppercase tracking-wide text-brand-orange text-center">
          3-Point Contest {category === 'open' ? 'Open' : 'Under'}
        </h2>
      </div>
      {/* Full-height columns with draggable vertical dividers */}
      <div ref={containerRef} className="flex-1 overflow-x-hidden overflow-y-hidden flex">
        {sortedRounds.map((round, roundIdx) => {
          const sortedEntries = [...round.tpc_entries].sort((a, b) => a.sort_order - b.sort_order)
          return (
            <React.Fragment key={round.id}>
              <div className="flex flex-col overflow-y-auto overflow-x-hidden" style={{ width: `${colWidths[roundIdx] ?? 100}%` }}>
                <table className="w-full text-sm">
                  <thead className={clsx('sticky top-0 z-10', lightMode ? 'bg-gray-100 shadow-[0_1px_0_0_#d1d5db]' : 'bg-court-surface shadow-[0_1px_0_0_#2a2a2a]')}>
                    <tr className={clsx('border-b', theme.border)}>
                      <th colSpan={3} className={clsx('px-4 py-3 font-display font-bold uppercase text-sm tracking-wide text-center', theme.textMuted)}>
                        {round.name}
                      </th>
                    </tr>
                    <tr>
                      <th className={clsx('text-left py-2 px-3 font-display uppercase text-xs w-px', theme.textMuted)}>#</th>
                      <th className={clsx('text-left py-2 px-3 font-display uppercase text-xs', theme.textMuted)}>Giocatore</th>
                      <th className={clsx('text-center py-2 px-4 font-display uppercase text-xs w-20', theme.textMuted)}>Punti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEntries.map((entry, idx) => (
                      <tr
                        key={entry.id}
                        data-is-live={entry.is_live || undefined}
                        className={clsx(
                          'border-b last:border-b-0 transition-colors',
                          theme.tableBorder,
                          theme.tableRow,
                          entry.is_live && theme.liveBg,
                          entry.is_qualified && !entry.is_live && theme.qualifiedBg,
                        )}
                      >
                        <td className="py-3 px-3 w-px">
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
                            {entry.is_qualified && !entry.is_live && (
                              <span className={clsx('text-xs font-display uppercase shrink-0', theme.qualifiedText)}>Qualificato</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center w-20">
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
              {roundIdx < sortedRounds.length - 1 && (
                <div
                  onMouseDown={(e) => handleDividerMouseDown(e, roundIdx)}
                  className="w-2 shrink-0 cursor-col-resize group flex items-center justify-center"
                >
                  <div className={clsx('w-px h-full transition-colors',
                    lightMode ? 'bg-gray-300 group-hover:bg-brand-orange/60' : 'bg-court-border group-hover:bg-brand-orange/60'
                  )} />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

// ─── Sponsor Strip (Bottom - All Modes) ──────────────────────────────────────────

function SponsorStrip({ sponsors, theme, height }: { sponsors: Sponsor[]; theme: Record<string, string>; height: number }) {
  if (!sponsors.length) return null

  const copies = Math.max(2, Math.ceil(12 / sponsors.length))
  const set = Array.from({ length: copies }, () => sponsors).flat()
  const items = [...set, ...set]

  return (
    <div className={clsx('border-t shrink-0', theme.border, theme.headerBg)} style={{ height }}>
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

  const lightMode = theme.bg === 'bg-white'

  return (
    <div className="flex-1 flex flex-col">
      <div className={clsx('px-4 py-4 border-b', lightMode ? 'bg-gray-100' : 'bg-court-surface', theme.border)}>
        <h2 className="font-display font-bold uppercase tracking-wide text-brand-orange text-center">
          I Nostri Sponsor
        </h2>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-12">
      <div className="w-full max-w-3xl aspect-[3/2] relative mb-8">
        {sponsors.map((sponsor, i) => (
          <div
            key={sponsor.id}
            className={clsx(
              'absolute inset-0 bg-white overflow-hidden transition-opacity duration-1000',
              i === index ? 'opacity-100' : 'opacity-0',
            )}
          >
            {sponsor.logo_url ? (
              sponsor.website_url ? (
                <a
                  href={sponsor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-full block"
                >
                  <img src={sponsor.logo_url} alt={sponsor.name} className="w-full h-full object-contain p-8" />
                </a>
              ) : (
                <img src={sponsor.logo_url} alt={sponsor.name} className="w-full h-full object-contain p-8" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-display font-bold text-gray-400 text-4xl uppercase">{sponsor.name}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {{
        main:   <span className="mt-4 px-3 py-1 rounded font-display font-bold uppercase text-xs tracking-wide bg-brand-orange text-white">Main Sponsor</span>,
        gold:   <span className="mt-4 px-3 py-1 rounded font-display font-bold uppercase text-xs tracking-wide bg-yellow-400 text-yellow-900">Gold Sponsor</span>,
        silver: <span className="mt-4 px-3 py-1 rounded font-display font-bold uppercase text-xs tracking-wide bg-gray-300 text-gray-700">Silver Sponsor</span>,
        bronze: <span className="mt-4 px-3 py-1 rounded font-display font-bold uppercase text-xs tracking-wide bg-amber-700 text-white">Bronze Sponsor</span>,
      }[sponsors[index].tier]}
      {sponsors.length > 1 && (
        <div className="flex gap-2 mt-3">
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
    </div>
  )
}

// ─── Main Showcase Page ──────────────────────────────────────────────────────────

export default function ShowcasePage() {
  const [mode, setMode] = useState<ShowcaseMode>('open')
  const [displayMode, setDisplayMode] = useState<Exclude<ShowcaseMode, 'contextual'>>('open')
  const [contentVisible, setContentVisible] = useState(true)
  const [lightMode, setLightMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    edition: Edition | null
    matches: MatchWithTeams[]
    groups: GroupWithTeams[]
    tpcContests: TpcContestFull[]
    sponsors: Sponsor[]
    events: CalendarioEvent[]
  }>({
    edition: null,
    matches: [],
    groups: [],
    tpcContests: [],
    sponsors: [],
    events: [],
  })
  const [openCategoryIndex, setOpenCategoryIndex] = useState(0)
  const [underCategoryIndex, setUnderCategoryIndex] = useState(0)
  const [splitPercent, setSplitPercent] = useState(60)
  const [sponsorHeight, setSponsorHeight] = useState(64)
  const isDragging = React.useRef(false)

  function handleSponsorDividerMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    isDragging.current = true
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const h = window.innerHeight - ev.clientY
      setSponsorHeight(Math.min(Math.max(h, 40), 160))
    }
    const onUp = () => {
      isDragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function handleDividerMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    isDragging.current = true
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const pct = (ev.clientX / window.innerWidth) * 100
      setSplitPercent(Math.min(Math.max(pct, 25), 75))
    }
    const onUp = () => {
      isDragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const supabase = createClient()

  async function fetchAll() {
    const [{ data: modeData }, { data: editionData }, { data: matchData }, { data: groupData }, { data: tpcData }, { data: sponsorData }, { data: eventData }] = await Promise.all([
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
      supabase.from('events').select('*').order('scheduled_at', { ascending: true, nullsFirst: false }).order('sort_order'),
    ])

    setData({
      edition: editionData,
      matches: matchData ?? [],
      groups: groupData ?? [],
      tpcContests: tpcData ?? [],
      sponsors: sponsorData ?? [],
      events: eventData ?? [],
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

  // Resolve the concrete mode to display — 'contextual' maps to a real mode based on live state
  const effectiveMode: Exclude<ShowcaseMode, 'contextual'> =
    mode === 'contextual'
      ? resolveContextualShowcaseMode(data.matches, data.tpcContests, data.events)
      : (mode as Exclude<ShowcaseMode, 'contextual'>)

  // Snap to first valid category when data loads or mode changes
  useEffect(() => {
    const currentOpenCat = OPEN_CATEGORY_ORDER[openCategoryIndex]
    if (!data.groups.some(g => g.category === currentOpenCat)) {
      const first = OPEN_CATEGORY_ORDER.findIndex(cat => data.groups.some(g => g.category === cat))
      if (first >= 0) setOpenCategoryIndex(first)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.groups, effectiveMode])

  useEffect(() => {
    const currentUnderCat = CATEGORY_ORDER[underCategoryIndex]
    if (!data.groups.some(g => g.category === currentUnderCat)) {
      const first = CATEGORY_ORDER.findIndex(cat => data.groups.some(g => g.category === cat))
      if (first >= 0) setUnderCategoryIndex(first)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.groups, effectiveMode])

  // Open mode carousel — only cycle through categories that have groups
  const validOpenCategories = OPEN_CATEGORY_ORDER.filter(cat =>
    data.groups.some(g => g.category === cat)
  )

  useEffect(() => {
    if (effectiveMode !== 'open') return
    if (validOpenCategories.length === 0) return
    const interval = setInterval(() => {
      setOpenCategoryIndex(prev => {
        const currentCat = OPEN_CATEGORY_ORDER[prev]
        const currentValidPos = validOpenCategories.indexOf(currentCat)
        const nextCat = validOpenCategories[(Math.max(currentValidPos, 0) + 1) % validOpenCategories.length]
        return OPEN_CATEGORY_ORDER.indexOf(nextCat)
      })
    }, UNDER_CATEGORY_CYCLE_MS)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMode, validOpenCategories.join(',')])

  // Under mode carousel — only cycle through categories that have groups
  const validUnderCategories = CATEGORY_ORDER.filter(cat =>
    data.groups.some(g => g.category === cat)
  )

  useEffect(() => {
    if (effectiveMode !== 'under') return
    if (validUnderCategories.length === 0) return
    const interval = setInterval(() => {
      setUnderCategoryIndex(prev => {
        const currentCat = CATEGORY_ORDER[prev]
        const currentValidPos = validUnderCategories.indexOf(currentCat)
        const nextCat = validUnderCategories[(Math.max(currentValidPos, 0) + 1) % validUnderCategories.length]
        return CATEGORY_ORDER.indexOf(nextCat)
      })
    }, UNDER_CATEGORY_CYCLE_MS)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMode, validUnderCategories.join(',')])

  // Fade transition when effective mode changes
  useEffect(() => {
    if (effectiveMode === displayMode) return
    setContentVisible(false)
    const timer = setTimeout(() => {
      setDisplayMode(effectiveMode)
      setContentVisible(true)
    }, 300)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMode])

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
    <div className={clsx('h-screen flex flex-col overflow-hidden', theme.bg, lightMode && 'showcase-light')}>
      <main className={clsx('flex-1 overflow-hidden transition-opacity duration-300', contentVisible ? 'opacity-100' : 'opacity-0')}>
        {/* Mode 1: Open - Calendar + Standings (resizable) */}
        {displayMode === 'open' && (
          <div className="h-full flex">
            <div style={{ width: `${splitPercent}%` }} className="overflow-hidden">
              <ShowcaseCalendar matches={data.matches} events={data.events} theme={theme} />
            </div>
            <div
              onMouseDown={handleDividerMouseDown}
              className={clsx(
                'w-2 shrink-0 cursor-col-resize group flex items-center justify-center',
                isDragging.current && 'select-none'
              )}
            >
              <div className={clsx('w-px h-full transition-colors', lightMode ? 'bg-gray-300 group-hover:bg-brand-orange/60' : 'bg-court-border group-hover:bg-brand-orange/60')} />
            </div>
            <div style={{ width: `${100 - splitPercent}%` }} className="overflow-hidden">
              <ShowcaseStandings
                groups={data.groups}
                matches={data.matches}
                category={OPEN_CATEGORY_ORDER[openCategoryIndex]}
                theme={theme}
                carousel={{ categories: OPEN_CATEGORY_ORDER, activeIndex: openCategoryIndex, validCategories: validOpenCategories }}
              />
            </div>
          </div>
        )}

        {/* Mode 2: Under - Carousel through U14/U16/U18 (resizable) */}
        {displayMode === 'under' && (
          <div className="h-full flex">
            <div style={{ width: `${splitPercent}%` }} className="overflow-hidden">
              <ShowcaseCalendar matches={data.matches} events={data.events} theme={theme} />
            </div>
            <div
              onMouseDown={handleDividerMouseDown}
              className={clsx(
                'w-2 shrink-0 cursor-col-resize group flex items-center justify-center',
                isDragging.current && 'select-none'
              )}
            >
              <div className={clsx('w-px h-full transition-colors', lightMode ? 'bg-gray-300 group-hover:bg-brand-orange/60' : 'bg-court-border group-hover:bg-brand-orange/60')} />
            </div>
            <div style={{ width: `${100 - splitPercent}%` }} className="overflow-hidden">
              <ShowcaseStandings
                groups={data.groups}
                matches={data.matches}
                category={currentUnderCategory}
                theme={theme}
                carousel={{ categories: CATEGORY_ORDER, activeIndex: underCategoryIndex, validCategories: validUnderCategories }}
              />
            </div>
          </div>
        )}

        {/* Mode 3: TPC Open */}
        {displayMode === 'tpc_open' && (
          <ShowcaseTPC contests={data.tpcContests} category="open" theme={theme} />
        )}

        {/* Mode 4: TPC Under */}
        {displayMode === 'tpc_under' && (
          <ShowcaseTPC contests={data.tpcContests} category="under" theme={theme} />
        )}

        {/* Mode 5: Sponsors - Single rotating sponsor */}
        {displayMode === 'sponsors' && (
          <SingleSponsorDisplay sponsors={data.sponsors} theme={theme} />
        )}
      </main>

      {/* Sponsor strip at bottom - visible on all modes except sponsors */}
      {displayMode !== 'sponsors' && (
        <>
          <div
            onMouseDown={handleSponsorDividerMouseDown}
            className="h-2 shrink-0 cursor-row-resize group flex flex-col items-center justify-center"
          >
            <div className={clsx('h-px w-full transition-colors', lightMode ? 'bg-gray-300 group-hover:bg-brand-orange/60' : 'bg-court-border group-hover:bg-brand-orange/60')} />
          </div>
          <SponsorStrip sponsors={data.sponsors} theme={theme} height={sponsorHeight} />
        </>
      )}
    </div>
  )
}