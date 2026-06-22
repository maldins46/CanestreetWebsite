'use client'

import clsx from 'clsx'
import type { GroupWithTeams, MatchWithTeams, TeamCategory } from '@/types'
import { computeStandings } from '@/lib/standings'

const CATEGORY_LABELS: Record<TeamCategory, string> = {
  open_m: 'Open M',
  open_f: 'Open F',
  u14_m:  'U14 M',
  u16_m:  'U16 M',
  u18_m:  'U18 M',
}

interface Props {
  groups: GroupWithTeams[]
  matches: MatchWithTeams[]
  category: TeamCategory
  group_id?: string
}

export default function LedwallStandings({ groups, matches, category, group_id }: Props) {
  const catGroups = groups.filter(g => g.category === category)
  const group = group_id
    ? catGroups.find(g => g.id === group_id) ?? catGroups[0]
    : catGroups[0]

  if (!group) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-gray-400 font-display uppercase text-sm">Nessun girone disponibile</p>
      </div>
    )
  }

  const teams        = group.group_teams.flatMap(gt => gt.teams ? [gt.teams] : [])
  const groupMatches = matches.filter(m => m.phase === 'group' && m.group_id === group.id)
  const rows         = computeStandings(groupMatches, teams)

  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 shrink-0">
        <h2 className="font-display font-bold uppercase text-sm tracking-wide text-brand-orange text-center">
          Classifica — {CATEGORY_LABELS[category]} / Girone {group.name}
        </h2>
      </div>

      <div className="flex-1 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-center px-2 py-2 font-display uppercase text-xs text-gray-400 w-8">#</th>
              <th className="text-left px-3 py-2 font-display uppercase text-xs text-gray-400">Squadra</th>
              <th className="text-center px-2 py-2 font-display uppercase text-xs text-gray-400 w-10">G</th>
              <th className="text-center px-2 py-2 font-display uppercase text-xs text-gray-400 w-10">V</th>
              <th className="text-center px-2 py-2 font-display uppercase text-xs text-gray-400 w-10">S</th>
              <th className="text-center px-2 py-2 font-display uppercase text-xs text-gray-400 w-14">PF</th>
              <th className="text-center px-2 py-2 font-display uppercase text-xs text-gray-400 w-14">PS</th>
              <th className="text-center px-2 py-2 font-display uppercase text-xs text-gray-400 w-14">+/-</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.team_id}
                className={clsx(
                  'border-b border-gray-100 last:border-0',
                  idx < 2 && 'bg-orange-50',
                )}
              >
                <td className="px-2 py-3 text-center w-8">
                  <span className={clsx(
                    'font-display font-bold text-base',
                    idx < 2 ? 'text-brand-orange' : 'text-gray-300',
                  )}>
                    {idx + 1}
                  </span>
                </td>
                <td className="px-3 py-3 font-body text-gray-800 max-w-0 overflow-hidden">
                  <span className="block truncate">{row.team_name}</span>
                </td>
                <td className="px-2 py-3 text-center text-gray-400 text-xs">{row.played}</td>
                <td className="px-2 py-3 text-center font-display font-bold text-base text-gray-800">{row.wins}</td>
                <td className="px-2 py-3 text-center text-gray-400 text-xs">{row.losses}</td>
                <td className="px-2 py-3 text-center text-gray-400 text-xs">{row.points_for}</td>
                <td className="px-2 py-3 text-center text-gray-400 text-xs">{row.points_against}</td>
                <td className={clsx(
                  'px-2 py-3 text-center text-sm font-display font-bold',
                  row.point_differential > 0 ? 'text-green-600'
                    : row.point_differential < 0 ? 'text-red-500'
                    : 'text-gray-300',
                )}>
                  {row.point_differential > 0 ? '+' : ''}{row.point_differential}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
