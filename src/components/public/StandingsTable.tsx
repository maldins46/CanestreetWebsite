'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import { computeStandings } from '@/lib/standings'
import type { GroupWithTeams, MatchWithTeams, StandingsRow, TeamCategory } from '@/types'

// ─── StandingsTable ────────────────────────────────────────────────────────────

interface StandingsTableProps {
  groupName: string
  standings: StandingsRow[]
  qualifyCount?: number
}

export function StandingsTable({ groupName, standings, qualifyCount = 2 }: StandingsTableProps) {
  return (
    <div className="card overflow-hidden">
      {/* Group header */}
      <div className="px-4 py-3 border-b border-court-border bg-court-dark">
        <h3 className="font-display font-bold uppercase tracking-wide text-sm text-court-white">
          Girone {groupName}
        </h3>
      </div>

      {standings.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-court-gray font-body text-sm">Nessuna squadra nel girone</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-court-border">
                <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center w-8 px-3 py-2">
                  #
                </th>
                <th className="font-display uppercase tracking-wide text-xs text-court-muted text-left px-3 py-2">
                  Squadra
                </th>
                <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2">
                  V
                </th>
                <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2">
                  S
                </th>
                <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2 hidden sm:table-cell">
                  PF
                </th>
                <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2 hidden sm:table-cell">
                  PS
                </th>
                <th className="font-display uppercase tracking-wide text-xs text-court-muted text-center px-3 py-2">
                  +/-
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, index) => {
                const isQualifier = index < qualifyCount
                return (
                  <tr
                    key={row.team_id}
                    className={clsx(
                      'border-b border-court-border last:border-b-0 transition-colors',
                      isQualifier ? 'bg-brand-orange/10' : 'hover:bg-white/[0.02]',
                    )}
                  >
                    <td className="text-center px-3 py-2.5 w-8">
                      <span
                        className={clsx(
                          'font-display font-bold text-xs',
                          isQualifier ? 'text-brand-orange' : 'text-court-muted',
                        )}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="text-left px-3 py-2.5">
                      <span className="font-body text-court-white text-sm">{row.team_name}</span>
                    </td>
                    <td className="text-center px-3 py-2.5">
                      <span className="font-body font-semibold text-court-white">{row.wins}</span>
                    </td>
                    <td className="text-center px-3 py-2.5">
                      <span className="font-body text-court-gray">{row.losses}</span>
                    </td>
                    <td className="text-center px-3 py-2.5 hidden sm:table-cell">
                      <span className="font-body text-court-gray">{row.points_for}</span>
                    </td>
                    <td className="text-center px-3 py-2.5 hidden sm:table-cell">
                      <span className="font-body text-court-gray">{row.points_against}</span>
                    </td>
                    <td className="text-center px-3 py-2.5">
                      <span
                        className={clsx(
                          'font-body font-semibold text-sm',
                          row.point_differential > 0
                            ? 'text-green-400'
                            : row.point_differential < 0
                              ? 'text-red-400'
                              : 'text-court-muted',
                        )}
                      >
                        {row.point_differential > 0
                          ? `+${row.point_differential}`
                          : row.point_differential}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── StandingsSection ──────────────────────────────────────────────────────────

const categoryLabels: Record<TeamCategory, string> = {
  open_m: 'Open M',
  open_f: 'Open F',
  u18_m: 'U18 M',
  u16_m: 'U16 M',
  u14_m: 'U14 M',
}

const categoryOrder: TeamCategory[] = ['open_m', 'open_f', 'u18_m', 'u16_m', 'u14_m']

interface StandingsSectionProps {
  groups: GroupWithTeams[]
  matches: MatchWithTeams[]
}

export default function StandingsSection({ groups, matches }: StandingsSectionProps) {
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

  const groupsForCat = groups.filter(g => g.category === selectedCat)
  const groupMatches = matches.filter(
    m => m.phase === 'group' && m.category === selectedCat,
  )

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

      {groupsForCat.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray font-body">
            Le classifiche saranno disponibili durante il torneo
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groupsForCat.map(group => {
            const teams = group.group_teams.flatMap(gt => gt.teams ? [gt.teams] : [])
            const groupSpecificMatches = groupMatches.filter(
              m => m.group_id === group.id,
            )
            const standings = computeStandings(groupSpecificMatches, teams)
            return (
              <StandingsTable
                key={group.id}
                groupName={group.name}
                standings={standings}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
