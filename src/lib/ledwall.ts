import type {
  MatchWithTeams,
  TpcContestFull,
  LedwallScene,
  LedwallSceneConfig,
  TpcCategory,
  CalendarioEvent,
} from '@/types'

export interface ResolvedScene {
  scene: LedwallScene | 'event'
  config: LedwallSceneConfig
}

/**
 * Determine the contextual scene from the most recently declared live event.
 *
 * Priority (last declared live wins, compared via live_started_at):
 *   - TPC entry is_live  → tpc scene for that contest category + round
 *   - Group-phase match in_progress → standings for that category + girone
 *   - Bracket-phase match in_progress → finals for that category
 *   - CalendarioEvent in_progress → event scene showing name + description
 *
 * Falls back to 'matches' when no live event exists.
 */
export function resolveContextualScene(
  matches: MatchWithTeams[],
  tpcContests: TpcContestFull[],
  events: CalendarioEvent[] = [],
): ResolvedScene {
  // Most recently live match
  const liveMatch = matches
    .filter(m => m.status === 'in_progress')
    .sort((a, b) => {
      const at = a.live_started_at ? new Date(a.live_started_at).getTime() : 0
      const bt = b.live_started_at ? new Date(b.live_started_at).getTime() : 0
      return bt - at
    })[0] ?? null

  // Most recently live TPC entry
  type LiveTpc = { category: TpcCategory; round_id: string; startedAt: number }
  let liveTpc: LiveTpc | null = null

  for (const contest of tpcContests) {
    for (const round of contest.tpc_rounds) {
      for (const entry of round.tpc_entries) {
        if (!entry.is_live) continue
        const t = entry.live_started_at ? new Date(entry.live_started_at).getTime() : 0
        if (!liveTpc || t > liveTpc.startedAt) {
          liveTpc = {
            category: contest.category as TpcCategory,
            round_id: round.id,
            startedAt: t,
          }
        }
      }
    }
  }

  // Most recently live calendario event
  const liveEvent = events
    .filter(e => e.status === 'in_progress')
    .sort((a, b) => {
      const at = a.live_started_at ? new Date(a.live_started_at).getTime() : 0
      const bt = b.live_started_at ? new Date(b.live_started_at).getTime() : 0
      return bt - at
    })[0] ?? null

  const matchTime = liveMatch?.live_started_at
    ? new Date(liveMatch.live_started_at).getTime()
    : 0
  const tpcTime = liveTpc?.startedAt ?? 0
  const eventTime = liveEvent?.live_started_at
    ? new Date(liveEvent.live_started_at).getTime()
    : 0

  const maxTime = Math.max(matchTime, tpcTime, eventTime)

  if (liveTpc && tpcTime === maxTime) {
    return {
      scene: 'tpc',
      config: { contest_category: liveTpc.category, round_id: liveTpc.round_id },
    }
  }

  if (liveEvent && eventTime === maxTime) {
    return {
      scene: 'event',
      config: { event_name: liveEvent.name, event_description: liveEvent.description },
    }
  }

  if (liveMatch) {
    if (liveMatch.phase === 'bracket') {
      return { scene: 'finals', config: { category: liveMatch.category } }
    }
    return {
      scene: 'standings',
      config: {
        category: liveMatch.category,
        group_id: liveMatch.group_id ?? undefined,
      },
    }
  }

  return { scene: 'matches', config: {} }
}
