import type { Match, StandingsRow } from '@/types'

type CompletedMatch = Match & {
  score_home: number
  score_away: number
  team_home_id: string
  team_away_id: string
}

function isCompleted(m: Match): m is CompletedMatch {
  return m.status === 'completed' && m.score_home != null && m.score_away != null
    && m.team_home_id != null && m.team_away_id != null
}

/**
 * Compute group standings from completed matches.
 * Sorting: wins DESC → scontri diretti → punti fatti DESC → alfabetico ASC.
 * See resolveStandingsOrder() for how ties on wins are broken.
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

  const completed = matches.filter(isCompleted)

  // Accumulate from completed matches only
  for (const m of completed) {
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

  const rows = Array.from(map.values())
  for (const r of rows) {
    r.point_differential = r.points_for - r.points_against
  }

  return resolveStandingsOrder(rows, completed)
}

/** Wins a team recorded against a specific opponent, from a set of completed matches. */
function winsAgainst(teamId: string, opponentId: string, matches: CompletedMatch[]): number {
  return matches.filter(m =>
    (m.team_home_id === teamId && m.team_away_id === opponentId && m.score_home > m.score_away)
    || (m.team_away_id === teamId && m.team_home_id === opponentId && m.score_away > m.score_home)
  ).length
}

function byPointsThenName(a: StandingsRow, b: StandingsRow): number {
  return b.points_for - a.points_for || a.team_name.localeCompare(b.team_name)
}

/**
 * Orders rows by wins DESC, breaking ties on wins via scontri diretti
 * (differenza canestri is intentionally never used):
 * - 2 teams tied: the winner of their head-to-head match ranks first.
 * - 3+ teams tied: a mini-league using only matches among the tied teams
 *   decides order; teams still tied after that (e.g. a cyclical result)
 *   fall back to punti fatti, then alfabetico.
 */
function resolveStandingsOrder(rows: StandingsRow[], completed: CompletedMatch[]): StandingsRow[] {
  const byWinsDesc = [...rows].sort((a, b) => b.wins - a.wins)

  const result: StandingsRow[] = []
  let i = 0
  while (i < byWinsDesc.length) {
    let j = i + 1
    while (j < byWinsDesc.length && byWinsDesc[j].wins === byWinsDesc[i].wins) j++
    result.push(...resolveTiedBucket(byWinsDesc.slice(i, j), completed))
    i = j
  }
  return result
}

function resolveTiedBucket(bucket: StandingsRow[], completed: CompletedMatch[]): StandingsRow[] {
  if (bucket.length === 1) return bucket

  if (bucket.length === 2) {
    const [a, b] = bucket
    const aWins = winsAgainst(a.team_id, b.team_id, completed)
    const bWins = winsAgainst(b.team_id, a.team_id, completed)
    if (aWins !== bWins) {
      const winner = aWins > bWins ? a : b
      const loser = aWins > bWins ? b : a
      winner.head_to_head_note = `Davanti per scontro diretto vinto vs ${loser.team_name}`
      winner.head_to_head_favorable = true
      loser.head_to_head_note = `Scontro diretto perso vs ${winner.team_name}`
      loser.head_to_head_favorable = false
      return [winner, loser]
    }
    // Not played yet (or no decisive result): fall through to punti fatti / alfabetico
    return [...bucket].sort(byPointsThenName)
  }

  // 3+ teams tied on wins: mini-league using only matches between bucket members
  const miniWins = new Map<string, number>()
  for (const r of bucket) {
    let w = 0
    for (const opp of bucket) {
      if (opp.team_id === r.team_id) continue
      w += winsAgainst(r.team_id, opp.team_id, completed)
    }
    miniWins.set(r.team_id, w)
  }
  const anyPlayed = [...miniWins.values()].some(w => w > 0)
  if (anyPlayed) {
    for (const r of bucket) {
      const beat = bucket.filter(o =>
        o.team_id !== r.team_id
        && winsAgainst(r.team_id, o.team_id, completed) > winsAgainst(o.team_id, r.team_id, completed)
      ).length
      const lostTo = bucket.filter(o =>
        o.team_id !== r.team_id
        && winsAgainst(r.team_id, o.team_id, completed) < winsAgainst(o.team_id, r.team_id, completed)
      ).length
      r.head_to_head_note = `Scontri diretti nel girone ristretto: ${miniWins.get(r.team_id)}V`
      r.head_to_head_favorable = beat > lostTo
    }
  }

  const sorted = [...bucket].sort((a, b) => miniWins.get(b.team_id)! - miniWins.get(a.team_id)!)

  const result: StandingsRow[] = []
  let i = 0
  while (i < sorted.length) {
    let j = i + 1
    while (j < sorted.length && miniWins.get(sorted[j].team_id) === miniWins.get(sorted[i].team_id)) j++
    const sub = sorted.slice(i, j)
    sub.sort(byPointsThenName)
    result.push(...sub)
    i = j
  }
  return result
}
