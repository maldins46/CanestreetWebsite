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
  if (match.phase === 'group' && match.group) return `Gir. ${match.group.name}`
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

  const phaseLabel = getPhaseLabel(match)

  return (
    <div
      className={clsx(
        'flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 px-4 py-3 rounded border-l-4 transition-colors',
        isLive && 'border-red-500 bg-red-500/5',
        isDone && 'border-green-500/50 bg-white/[0.02]',
        !isLive && !isDone && 'border-court-border bg-white/[0.02]',
      )}
    >
      {/* Row 1 on mobile: time + category + phase */}
      <div className="flex items-center gap-3">
        <div className="w-14 shrink-0">
          {isLive ? (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
              <span className="text-red-500 font-display uppercase text-xs font-bold">LIVE</span>
            </span>
          ) : (
            <span className="text-court-muted text-xs" suppressHydrationWarning>{formatTime(match.scheduled_at)}</span>
          )}
        </div>

        <span
          className={clsx(
            'text-[10px] px-1.5 py-0.5 font-display uppercase tracking-wide rounded shrink-0',
            CATEGORY_COLORS[match.category],
          )}
        >
          {CATEGORY_LABELS[match.category]}
        </span>

        {phaseLabel && (
          <span className="text-court-muted text-xs shrink-0">{phaseLabel}</span>
        )}
      </div>

      {/* Row 2 on mobile: home team + score + away team */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span
          className={clsx(
            'flex-1 text-sm text-right min-w-0',
            homeWon ? 'text-court-white font-bold' : 'text-court-gray',
          )}
        >
          {match.team_home?.name ?? <span className="italic opacity-40">TBD</span>}
        </span>

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

        <span
          className={clsx(
            'flex-1 text-sm min-w-0',
            awayWon ? 'text-court-white font-bold' : 'text-court-gray',
          )}
        >
          {match.team_away?.name ?? <span className="italic opacity-40">TBD</span>}
        </span>
      </div>
    </div>
  )
}
