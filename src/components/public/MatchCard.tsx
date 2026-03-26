import type { MatchWithTeams } from '@/types'
import clsx from 'clsx'

const categoryColors: Record<string, string> = {
  open: 'bg-brand-orange text-white',
  u18: 'bg-blue-500 text-white',
  u16: 'bg-purple-500 text-white',
  u14: 'bg-green-600 text-white',
}

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

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  match: MatchWithTeams
}

export default function MatchCard({ match }: Props) {
  const isLive = match.status === 'in_progress'
  const isDone = match.status === 'completed'

  const homeWon =
    isDone &&
    match.score_home != null &&
    match.score_away != null &&
    match.score_home > match.score_away
  const awayWon =
    isDone &&
    match.score_home != null &&
    match.score_away != null &&
    match.score_away > match.score_home

  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-4 py-3 rounded border-l-4 transition-colors',
        isLive && 'border-red-500 bg-red-500/5',
        isDone && 'border-green-500/50 bg-white/[0.02]',
        !isLive && !isDone && 'border-court-border bg-white/[0.02]',
      )}
    >
      {/* Time / LIVE */}
      <div className="w-14 shrink-0">
        {isLive ? (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
            <span className="text-red-500 font-display uppercase text-xs font-bold">LIVE</span>
          </span>
        ) : (
          <span className="text-court-muted text-xs">{formatTime(match.scheduled_at)}</span>
        )}
      </div>

      {/* Category badge */}
      <span
        className={clsx(
          'text-[10px] px-1.5 py-0.5 font-display uppercase tracking-wide rounded shrink-0',
          categoryColors[match.category],
        )}
      >
        {match.category}
      </span>

      {/* Phase label */}
      <span className="text-court-muted text-xs w-16 shrink-0 hidden sm:block">
        {getPhaseLabel(match)}
      </span>

      {/* Home team */}
      <span
        className={clsx(
          'flex-1 text-sm text-right min-w-0 truncate',
          homeWon ? 'text-court-white font-bold' : 'text-court-gray',
        )}
      >
        {match.team_home?.name ?? <span className="italic opacity-40">TBD</span>}
      </span>

      {/* Score or vs */}
      <div className="w-16 text-center shrink-0">
        {isDone && match.score_home != null && match.score_away != null ? (
          <span className="font-display font-bold text-base">
            <span className={homeWon ? 'text-green-400' : 'text-court-gray'}>{match.score_home}</span>
            <span className="text-court-muted mx-1">-</span>
            <span className={awayWon ? 'text-green-400' : 'text-court-gray'}>{match.score_away}</span>
          </span>
        ) : (
          <span className="text-court-muted text-sm">vs</span>
        )}
      </div>

      {/* Away team */}
      <span
        className={clsx(
          'flex-1 text-sm min-w-0 truncate',
          awayWon ? 'text-court-white font-bold' : 'text-court-gray',
        )}
      >
        {match.team_away?.name ?? <span className="italic opacity-40">TBD</span>}
      </span>
    </div>
  )
}
