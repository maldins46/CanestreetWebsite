'use client'

import clsx from 'clsx'
import type { MatchWithTeams, CalendarioEvent } from '@/types'

const ROUND_LABELS: Record<string, string> = {
  round_of_16: 'Ottavi',
  quarterfinal: 'Quarti',
  semifinal: 'Semifinali',
  final: 'Finale',
}

const CATEGORY_COLORS: Record<string, string> = {
  open_m: 'bg-brand-orange',
  open_f: 'bg-pink-500',
  u14_m: 'bg-green-600',
  u16_m: 'bg-purple-500',
  u18_m: 'bg-blue-500',
}

const CATEGORY_SHORT: Record<string, string> = {
  open_m: 'Open M',
  open_f: 'Open F',
  u14_m: 'U14',
  u16_m: 'U16',
  u18_m: 'U18',
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Rome' })
}

function getPhaseLabel(m: MatchWithTeams): string {
  if (m.phase === 'group' && m.group) return `Girone ${m.group.name}`
  return m.bracket_round ? (ROUND_LABELS[m.bracket_round] ?? '') : ''
}

type Row =
  | { type: 'match'; data: MatchWithTeams }
  | { type: 'event'; data: CalendarioEvent }

interface Props {
  matches: MatchWithTeams[]
  events?: CalendarioEvent[]
}

export default function LedwallMatches({ matches, events = [] }: Props) {
  const allRows: Row[] = [
    ...matches.map(m => ({ type: 'match' as const, data: m })),
    ...events.map(e => ({ type: 'event' as const, data: e })),
  ].sort((a, b) => {
    const at = a.data.scheduled_at ? new Date(a.data.scheduled_at).getTime() : Infinity
    const bt = b.data.scheduled_at ? new Date(b.data.scheduled_at).getTime() : Infinity
    return at - bt
  })

  const completed = allRows.filter(r => r.data.status === 'completed')
  const live      = allRows.filter(r => r.data.status === 'in_progress')
  const scheduled = allRows.filter(r => r.data.status === 'scheduled')

  const display = [
    ...completed.slice(-4),
    ...live,
    ...scheduled.slice(0, 4),
  ]

  if (display.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-gray-400 font-display uppercase text-sm">Nessuna partita programmata</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 shrink-0">
        <h2 className="font-display font-bold uppercase text-sm tracking-wide text-brand-orange text-center">
          Calendario Partite
        </h2>
      </div>
      <div className="flex-1 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="text-center px-3 py-2 font-display uppercase text-xs text-gray-500 whitespace-nowrap w-px">Data</th>
              <th className="text-center px-3 py-2 font-display uppercase text-xs text-gray-500 whitespace-nowrap w-px">Ora</th>
              <th className="text-center px-3 py-2 font-display uppercase text-xs text-gray-500 whitespace-nowrap w-px">Cat.</th>
              <th className="text-center px-3 py-2 font-display uppercase text-xs text-gray-500 whitespace-nowrap w-px">Turno</th>
              <th className="text-right px-3 py-2 font-display uppercase text-xs text-gray-500">Casa</th>
              <th className="text-center px-3 py-2 font-display uppercase text-xs text-gray-500 whitespace-nowrap w-px">Pts</th>
              <th className="text-center px-3 py-2 font-display uppercase text-xs text-gray-500 whitespace-nowrap w-px">Pts</th>
              <th className="text-left px-3 py-2 font-display uppercase text-xs text-gray-500">Ospite</th>
            </tr>
          </thead>
          <tbody>
            {display.map(row => {
              if (row.type === 'event') {
                const e = row.data
                const isLive = e.status === 'in_progress'
                return (
                  <tr key={`event-${e.id}`} className={clsx('border-b border-gray-100', isLive && 'bg-red-50')}>
                    <td className="px-3 py-2 text-center text-gray-500 text-xs whitespace-nowrap w-px">
                      {formatDate(e.scheduled_at)}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap w-px">
                      {isLive ? (
                        <span className="flex items-center gap-1 justify-center">
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-red-500" />
                          <span className="font-bold text-red-600 text-xs">LIVE</span>
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">{formatTime(e.scheduled_at)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap w-px">
                      <span className="text-[10px] px-1.5 py-0.5 rounded text-white bg-teal-500">
                        Eventi
                      </span>
                    </td>
                    <td className="px-3 py-2 w-px whitespace-nowrap" />
                    <td colSpan={4} className="px-3 py-2 text-center text-gray-500">
                      {e.name}
                    </td>
                  </tr>
                )
              }

              const m = row.data as MatchWithTeams
              const isLive  = m.status === 'in_progress'
              const isDone  = m.status === 'completed'
              const homeWon = isDone && m.score_home != null && m.score_away != null && m.score_home > m.score_away
              const awayWon = isDone && m.score_home != null && m.score_away != null && m.score_away > m.score_home

              return (
                <tr key={`match-${m.id}`} className={clsx('border-b border-gray-100', isLive && 'bg-red-50')}>
                  <td className="px-3 py-2 text-center text-gray-500 text-xs whitespace-nowrap w-px">
                    {formatDate(m.scheduled_at)}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap w-px">
                    {isLive ? (
                      <span className="flex items-center gap-1 justify-center">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-red-500" />
                        <span className="font-bold text-red-600 text-xs">LIVE</span>
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs">{formatTime(m.scheduled_at)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap w-px">
                    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded text-white', CATEGORY_COLORS[m.category])}>
                      {CATEGORY_SHORT[m.category]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-gray-500 text-xs whitespace-nowrap w-px">
                    {getPhaseLabel(m) || '—'}
                  </td>
                  <td className={clsx('px-3 py-2 max-w-0 overflow-hidden text-right', homeWon ? 'text-gray-900 font-bold' : 'text-gray-500')}>
                    <span className="block truncate">{m.team_home?.name ?? 'TBD'}</span>
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap w-px">
                    {isDone && m.score_home != null ? (
                      <span className={clsx('font-display font-bold', homeWon ? 'text-green-600' : 'text-gray-400')}>
                        {m.score_home}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap w-px">
                    {isDone && m.score_away != null ? (
                      <span className={clsx('font-display font-bold', awayWon ? 'text-green-600' : 'text-gray-400')}>
                        {m.score_away}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className={clsx('px-3 py-2 max-w-0 overflow-hidden', awayWon ? 'text-gray-900 font-bold' : 'text-gray-500')}>
                    <span className="block truncate">{m.team_away?.name ?? 'TBD'}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
