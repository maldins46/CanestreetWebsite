import type { Match, StandingsRow } from '@/types'

/**
 * Compute group standings from completed matches.
 * Sorting: wins DESC → point_differential DESC → points_for DESC
 */
export function computeStandings(
  matches: Match[],
  teams: { id: string; name: string }[]
): StandingsRow[] {
  const map = new Map<string, StandingsRow>()

  // Initialize all teams with zero stats
  for (const t of teams) {
    map.set(t.id, {
      team_id: t.id,
      team_name: t.name,
      played: 0,
      wins: 0,
      losses: 0,
      points_for: 0,
      points_against: 0,
      point_differential: 0,
    })
  }

  // Accumulate from completed matches only
  for (const m of matches) {
    if (m.status !== 'completed' || m.score_home == null || m.score_away == null) continue
    if (!m.team_home_id || !m.team_away_id) continue

    const home = map.get(m.team_home_id)
    const away = map.get(m.team_away_id)
    if (!home || !away) continue

    home.played++
    away.played++
    home.points_for += m.score_home
    home.points_against += m.score_away
    away.points_for += m.score_away
    away.points_against += m.score_home

    if (m.score_home > m.score_away) {
      home.wins++
      away.losses++
    } else {
      away.wins++
      home.losses++
    }
  }

  // Compute differentials and sort
  const rows = Array.from(map.values())
  for (const r of rows) {
    r.point_differential = r.points_for - r.points_against
  }

  rows.sort((a, b) =>
    b.wins - a.wins
    || b.point_differential - a.point_differential
    || b.points_for - a.points_for
  )

  return rows
}
