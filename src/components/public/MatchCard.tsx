import type { MatchWithTeams } from '@/types'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/types'
import clsx from 'clsx'

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

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
}

interface Props {
  match: MatchWithTeams
}

export default function MatchCard({ match }: Props) {
  const isLive = match.status === 'in_progress'
  const isDone = match.status === 'completed'

  const homeWon = isDone && match.score_home != null && match.score_away != null && match.score_home > match.score_away
  const awayWon = isDone && match.score_home != null && match.score_away != null && match.score_away > match.score_home

  const phaseLabel = getPhaseLabel(match)

  return (
    <tr
      className={clsx(
        'border-b border-court-border last:border-b-0 transition-colors',
        isLive && 'bg-red-500/10',
        isDone && 'opacity-70',
      )}
    >
      {/* Ora */}
      <td className="px-3 py-2.5 whitespace-nowrap w-px">
        {isLive ? (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse shrink-0" />
            <span className="text-red-400 font-display uppercase text-xs font-bold">Live</span>
          </span>
        ) : (
          <span className="text-court-muted text-xs" suppressHydrationWarning>{formatTime(match.scheduled_at)}</span>
        )}
      </td>

      {/* Categoria */}
      <td className="px-3 py-2.5 text-center whitespace-nowrap w-px">
        <span className={clsx('text-xs px-2 py-0.5 font-display uppercase tracking-wide rounded', CATEGORY_COLORS[match.category])}>
          {CATEGORY_LABELS[match.category]}
        </span>
      </td>

      {/* Turno */}
      <td className="px-3 py-2.5 whitespace-nowrap w-px">
        <span className="text-court-muted text-xs">{phaseLabel || '—'}</span>
      </td>

      {/* Squadra in casa */}
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        <span className={clsx('text-sm', homeWon ? 'text-court-white font-bold' : 'text-court-light')}>
          {match.team_home?.name ?? <span className="italic opacity-40">TBD</span>}
        </span>
      </td>

      {/* Punti casa */}
      <td className="px-3 py-2.5 text-center w-10">
        {isDone && match.score_home != null ? (
          <span className={clsx('font-display font-bold text-sm', homeWon ? 'text-green-400' : 'text-court-gray')}>
            {match.score_home}
          </span>
        ) : (
          <span className="text-court-muted text-xs">—</span>
        )}
      </td>

      {/* Punti ospite */}
      <td className="px-3 py-2.5 text-center w-10">
        {isDone && match.score_away != null ? (
          <span className={clsx('font-display font-bold text-sm', awayWon ? 'text-green-400' : 'text-court-gray')}>
            {match.score_away}
          </span>
        ) : (
          <span className="text-court-muted text-xs">—</span>
        )}
      </td>

      {/* Squadra ospite */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className={clsx('text-sm', awayWon ? 'text-court-white font-bold' : 'text-court-light')}>
          {match.team_away?.name ?? <span className="italic opacity-40">TBD</span>}
        </span>
      </td>
    </tr>
  )
}
