import type {
  MatchWithTeams,
  TpcContestFull,
  ShowcaseMode,
  TpcCategory,
  CalendarioEvent,
} from '@/types'

const OPEN_CATEGORIES = ['open_m', 'open_f']

/**
 * Resolve which concrete showcase screen to show in contextual mode.
 * Most-recently-started live event wins, same logic as resolveContextualScene in ledwall.ts.
 */
export function resolveContextualShowcaseMode(
  matches: MatchWithTeams[],
  tpcContests: TpcContestFull[],
  events: CalendarioEvent[],
): Exclude<ShowcaseMode, 'contextual'> {
  const liveMatch = matches
    .filter(m => m.status === 'in_progress')
    .sort((a, b) => {
      const at = a.live_started_at ? new Date(a.live_started_at).getTime() : 0
      const bt = b.live_started_at ? new Date(b.live_started_at).getTime() : 0
      return bt - at
    })[0] ?? null

  type LiveTpc = { category: TpcCategory; startedAt: number }
  let liveTpc: LiveTpc | null = null

  for (const contest of tpcContests) {
    for (const round of contest.tpc_rounds) {
      for (const entry of round.tpc_entries) {
        if (!entry.is_live) continue
        const t = entry.live_started_at ? new Date(entry.live_started_at).getTime() : 0
        if (!liveTpc || t > liveTpc.startedAt) {
          liveTpc = { category: contest.category as TpcCategory, startedAt: t }
        }
      }
    }
  }

  const liveEvent = events
    .filter(e => e.status === 'in_progress')
    .sort((a, b) => {
      const at = a.live_started_at ? new Date(a.live_started_at).getTime() : 0
      const bt = b.live_started_at ? new Date(b.live_started_at).getTime() : 0
      return bt - at
    })[0] ?? null

  const matchTime = liveMatch?.live_started_at ? new Date(liveMatch.live_started_at).getTime() : 0
  const tpcTime = liveTpc?.startedAt ?? 0
  const eventTime = liveEvent?.live_started_at ? new Date(liveEvent.live_started_at).getTime() : 0

  const maxTime = Math.max(matchTime, tpcTime, eventTime)

  if (liveTpc && tpcTime === maxTime) {
    return liveTpc.category === 'open' ? 'tpc_open' : 'tpc_under'
  }

  if (liveEvent && eventTime === maxTime) {
    return 'sponsors'
  }

  if (liveMatch) {
    return OPEN_CATEGORIES.includes(liveMatch.category) ? 'open' : 'under'
  }

  return 'sponsors'
}
