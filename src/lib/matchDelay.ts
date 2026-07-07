export interface DelayableRow {
  scheduled_at: string | null
  status: 'scheduled' | 'in_progress' | 'completed'
  live_started_at: string | null
}

function dayKey(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' })
}

// While still scheduled, lateness grows with the clock. Once a row has actually
// started, `live_started_at` gives a fixed, non-growing delay instead.
function ownDelayMinutes(row: DelayableRow, now: number): number {
  if (!row.scheduled_at) return 0
  const scheduledMs = new Date(row.scheduled_at).getTime()

  if (row.status === 'scheduled') {
    const diffMs = now - scheduledMs
    return diffMs > 0 ? Math.floor(diffMs / 60_000) : 0
  }

  if (!row.live_started_at) return 0
  const diffMs = new Date(row.live_started_at).getTime() - scheduledMs
  return diffMs > 0 ? Math.round(diffMs / 60_000) : 0
}

// The calendar is a sequence of near-back-to-back slots: once one match/event
// runs late, everything after it the same day slips by the same amount, until
// something actually starts later than expected (which resets the baseline).
// Rows must already be sorted chronologically by `scheduled_at`. Only rows
// still `scheduled` (not yet started) get a delay to display — a running/
// completed row shows its own LIVE badge or score instead — but every row's
// own delay still feeds the running total so later rows inherit it.
export function computeCascadingDelays(rows: DelayableRow[], now: number): number[] {
  let carried = 0
  let currentDay: string | null = null

  return rows.map(row => {
    const day = dayKey(row.scheduled_at)
    if (day !== currentDay) {
      currentDay = day
      carried = 0
    }

    carried = Math.max(carried, ownDelayMinutes(row, now))
    return row.status === 'scheduled' ? carried : 0
  })
}
