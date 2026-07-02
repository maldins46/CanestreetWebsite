import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Match, MatchWithTeams, TpcEntry, TpcContestFull, CalendarioEvent } from '@/types'

// Realtime payloads for `matches`/`tpc_entries` carry only base-table columns,
// not the joined team/group/player names ledwall & showcase render. A plain
// score/status UPDATE never touches the FK columns, so those can be patched
// in place without an extra round-trip. INSERT/DELETE or an FK change (rare —
// match reassignment, entry moved to another round) fall back to a full
// resync (return null) rather than hand-rolling a joined single-row fetch.

export function patchMatches(
  matches: MatchWithTeams[],
  payload: RealtimePostgresChangesPayload<Match>
): MatchWithTeams[] | null {
  if (payload.eventType !== 'UPDATE') return null

  const newRow = payload.new as Match
  const existing = matches.find(m => m.id === newRow.id)
  if (!existing) return null

  if (
    existing.team_home_id !== newRow.team_home_id ||
    existing.team_away_id !== newRow.team_away_id ||
    existing.group_id !== newRow.group_id
  ) {
    return null
  }

  return matches.map(m => (m.id === newRow.id ? { ...m, ...newRow } : m))
}

export function patchTpcEntries(
  contests: TpcContestFull[],
  payload: RealtimePostgresChangesPayload<TpcEntry>
): TpcContestFull[] | null {
  if (payload.eventType !== 'UPDATE') return null

  const newRow = payload.new as TpcEntry
  let found = false

  const updated = contests.map(contest => ({
    ...contest,
    tpc_rounds: contest.tpc_rounds.map(round => {
      if (round.id !== newRow.round_id) return round
      const entryIdx = round.tpc_entries.findIndex(e => e.id === newRow.id)
      if (entryIdx === -1) return round
      const existing = round.tpc_entries[entryIdx]
      if (existing.player_id !== newRow.player_id) return round
      found = true
      const nextEntries = [...round.tpc_entries]
      nextEntries[entryIdx] = { ...existing, ...newRow }
      return { ...round, tpc_entries: nextEntries }
    }),
  }))

  return found ? updated : null
}

function byScheduledThenSort(a: CalendarioEvent, b: CalendarioEvent) {
  const at = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Infinity
  const bt = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Infinity
  if (at !== bt) return at - bt
  return a.sort_order - b.sort_order
}

export function patchEvents(
  events: CalendarioEvent[],
  payload: RealtimePostgresChangesPayload<CalendarioEvent>
): CalendarioEvent[] {
  if (payload.eventType === 'DELETE') {
    const oldId = (payload.old as Partial<CalendarioEvent>).id
    return events.filter(e => e.id !== oldId)
  }
  const newRow = payload.new as CalendarioEvent
  const exists = events.some(e => e.id === newRow.id)
  const next = exists ? events.map(e => (e.id === newRow.id ? newRow : e)) : [...events, newRow]
  return next.sort(byScheduledThenSort)
}
