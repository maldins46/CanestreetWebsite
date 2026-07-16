'use client'

import clsx from 'clsx'
import { Swords } from 'lucide-react'
import type { GroupWithTeams, MatchWithTeams, TeamCategory } from '@/types'
import { computeStandings } from '@/lib/standings'

const CATEGORY_LABELS: Record<TeamCategory, string> = {
  open_m: 'Open M',
  open_f: 'Open F',
  u14_m:  'U14 M',
  u16_m:  'U16 M',
  u18_m:  'U18 M',
}

// rank | squadra (fills remaining width) | G | V | S | PF | PS | SD
const COLUMN_TEMPLATE = '3.5rem 1fr 3rem 3rem 3rem 4.5rem 4.5rem 3.5rem'

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

      <div className="flex-1 min-h-0">
        <div
          className="w-full h-full grid"
          style={{ gridTemplateRows: `auto repeat(${rows.length}, 1fr)` }}
        >
          <div className="grid items-center bg-gray-100" style={{ gridTemplateColumns: COLUMN_TEMPLATE }}>
            <span className="text-center px-3 py-3 font-display font-bold uppercase text-sm text-gray-600">#</span>
            <span className="text-left px-3 py-3 font-display font-bold uppercase text-sm text-gray-600">Squadra</span>
            <span className="text-center px-3 py-3 font-display font-bold uppercase text-sm text-gray-600">G</span>
            <span className="text-center px-3 py-3 font-display font-bold uppercase text-sm text-gray-600">V</span>
            <span className="text-center px-3 py-3 font-display font-bold uppercase text-sm text-gray-600">S</span>
            <span className="text-center px-3 py-3 font-display font-bold uppercase text-sm text-gray-600">PF</span>
            <span className="text-center px-3 py-3 font-display font-bold uppercase text-sm text-gray-600">PS</span>
            <span className="text-center px-3 py-3 font-display font-bold uppercase text-sm text-gray-600">SD</span>
          </div>

          {rows.map((row, idx) => (
            <div
              key={row.team_id}
              className={clsx(
                'grid items-center border-b border-gray-100 last:border-0',
                idx < 2 && 'bg-orange-50',
              )}
              style={{ gridTemplateColumns: COLUMN_TEMPLATE }}
            >
              <span className={clsx(
                'text-center font-display font-bold text-4xl',
                idx < 2 ? 'text-brand-orange' : 'text-gray-300',
              )}>
                {idx + 1}
              </span>
              <span className="px-3 min-w-0 overflow-hidden font-body font-bold text-2xl text-gray-800">
                <span className="block truncate">{row.team_name}</span>
              </span>
              <span className="text-center text-lg text-gray-400">{row.played}</span>
              <span className="text-center font-display font-bold text-3xl text-gray-800">{row.wins}</span>
              <span className="text-center text-lg text-gray-400">{row.losses}</span>
              <span className="text-center text-lg text-gray-400">{row.points_for}</span>
              <span className="text-center text-lg text-gray-400">{row.points_against}</span>
              <span className="flex items-center justify-center">
                {row.head_to_head_note ? (
                  <span title={row.head_to_head_note}>
                    <Swords
                      size={20}
                      className={row.head_to_head_favorable ? 'text-brand-orange' : 'text-gray-300'}
                    />
                  </span>
                ) : (
                  <span className="text-2xl text-gray-300">—</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
