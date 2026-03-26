'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { computeStandings } from '@/lib/standings'
import type { GroupWithTeams, MatchWithTeams, Match, BracketRound, TeamCategory } from '@/types'

interface Props {
  editionId: string
  category: TeamCategory
  bracketMatches: MatchWithTeams[]
  groupMatches: Match[]
  groups: GroupWithTeams[]
  approvedTeams: { id: string; name: string; category: string }[]
}

const roundLabels: Record<BracketRound, string> = {
  round_of_16: 'Ottavi',
  quarterfinal: 'Quarti',
  semifinal: 'Semifinali',
  final: 'Finale',
}

// Rounds from earliest to latest
const roundOrder: BracketRound[] = ['round_of_16', 'quarterfinal', 'semifinal', 'final']

export default function TournamentBracket({
  editionId, category, bracketMatches, groupMatches, groups, approvedTeams
}: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [editingSlot, setEditingSlot] = useState<{ matchId: string; slot: 'home' | 'away' } | null>(null)
  const [bracketSize, setBracketSize] = useState<4 | 8 | 16>(4)

  // Group bracket matches by round for display
  const roundsPresent = roundOrder.filter(r => bracketMatches.some(m => m.bracket_round === r))

  async function overrideTeam(matchId: string, slot: 'home' | 'away', teamId: string) {
    if (!teamId) { setEditingSlot(null); return }
    setSaving(true)
    const field = slot === 'home' ? 'team_home_id' : 'team_away_id'
    await supabase.from('matches').update({ [field]: teamId }).eq('id', matchId)
    setEditingSlot(null)
    router.refresh()
    setSaving(false)
  }

  async function generateBracket() {
    if (bracketMatches.length > 0) {
      if (!window.confirm('Tabellone già esistente per questa categoria. Rigenerare?')) return
      // Delete existing bracket matches for this category
      await supabase.from('matches').delete()
        .eq('edition_id', editionId)
        .eq('category', category)
        .eq('phase', 'bracket')
    }

    // 1. Compute standings per group
    const groupStandings = groups.map(g => {
      const gMatches = groupMatches.filter(m => m.group_id === g.id)
      const gTeams = g.group_teams.flatMap(gt => gt.teams ? [{ id: gt.teams.id, name: gt.teams.name }] : [])
      return { group: g, standings: computeStandings(gMatches, gTeams) }
    })

    // 2. Collect qualifiers position by position (1st from all groups, then 2nd, etc.)
    const teamsPerGroup = Math.ceil(bracketSize / Math.max(groups.length, 1))
    const qualifiers: { id: string; name: string }[] = []

    for (let pos = 0; pos < teamsPerGroup; pos++) {
      const atPosition = groupStandings
        .map(gs => gs.standings[pos])
        .filter(Boolean)
        .sort((a, b) =>
          b.wins - a.wins
          || b.point_differential - a.point_differential
          || b.points_for - a.points_for
        )
      for (const row of atPosition) {
        if (qualifiers.length < bracketSize) {
          qualifiers.push({ id: row.team_id, name: row.team_name })
        }
      }
    }

    // Pad with nulls if not enough teams qualified
    while (qualifiers.length < bracketSize) qualifiers.push({ id: '', name: '' })

    // 3. Determine bracket rounds needed
    const rounds: BracketRound[] = []
    if (bracketSize >= 16) rounds.push('round_of_16')
    if (bracketSize >= 8) rounds.push('quarterfinal')
    rounds.push('semifinal')
    rounds.push('final')

    // 4. Build matches from final backward, collecting IDs as we go
    // We'll insert all at once using temporary IDs and link them
    // Strategy: use crypto.randomUUID() for IDs, build all matches, then insert
    type MatchInsert = {
      id: string
      edition_id: string
      category: string
      phase: 'bracket'
      bracket_round: BracketRound
      bracket_position: number
      next_match_id: string | null
      next_match_slot: 'home' | 'away' | null
      team_home_id: string | null
      team_away_id: string | null
      status: 'scheduled'
      sort_order: number
    }

    const allMatches: MatchInsert[] = []
    let sortOrder = 0

    // Build round by round from final → earliest
    // At each round, the number of matches halves
    const roundsReversed = [...rounds].reverse()
    let previousRoundMatches: MatchInsert[] = []

    for (let ri = 0; ri < roundsReversed.length; ri++) {
      const round = roundsReversed[ri]
      const matchCount = Math.pow(2, ri) // final=1, semi=2, quarter=4, r16=8
      const currentRoundMatches: MatchInsert[] = []

      for (let pos = 0; pos < matchCount; pos++) {
        const matchId = crypto.randomUUID()
        // Find which next match this feeds into
        const nextMatchIndex = Math.floor(pos / 2)
        const nextMatch = previousRoundMatches[nextMatchIndex] ?? null
        const nextSlot: 'home' | 'away' = pos % 2 === 0 ? 'home' : 'away'

        let homeTeamId: string | null = null
        let awayTeamId: string | null = null

        // Only the first round (earliest) gets seeded teams
        if (ri === roundsReversed.length - 1) {
          // Standard tournament seeding: 1 vs N, 2 vs N-1, ...
          // For pos in this round, pair seed[pos] vs seed[matchCount*2 - 1 - pos]
          const seedA = pos
          const seedB = matchCount * 2 - 1 - pos
          homeTeamId = qualifiers[seedA]?.id || null
          awayTeamId = qualifiers[seedB]?.id || null
        }

        const m: MatchInsert = {
          id: matchId,
          edition_id: editionId,
          category,
          phase: 'bracket',
          bracket_round: round,
          bracket_position: pos,
          next_match_id: nextMatch?.id ?? null,
          next_match_slot: nextMatch ? nextSlot : null,
          team_home_id: homeTeamId || null,
          team_away_id: awayTeamId || null,
          status: 'scheduled',
          sort_order: sortOrder++,
        }

        currentRoundMatches.push(m)
        allMatches.push(m)
      }

      previousRoundMatches = currentRoundMatches
    }

    setSaving(true)
    // Insert in reverse so foreign keys (next_match_id) point to already-inserted rows
    // Actually we need to insert final first, then semis, etc. — our allMatches is already in reverse round order
    for (const m of allMatches) {
      await supabase.from('matches').insert(m)
    }
    setSaving(false)
    router.refresh()
  }

  const categoryTeams = approvedTeams.filter(t => t.category === category)

  return (
    <div>
      {/* Generation controls */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-court-muted text-sm font-display uppercase">Formato:</span>
          {([4, 8, 16] as const).map(size => (
            <button
              key={size}
              onClick={() => setBracketSize(size)}
              className={`px-3 py-1.5 font-display uppercase tracking-wide text-xs border transition-colors ${
                bracketSize === size
                  ? 'bg-brand-orange border-brand-orange text-court-dark'
                  : 'border-court-border text-court-muted hover:border-court-muted hover:text-court-white'
              }`}
            >
              {size} squadre
            </button>
          ))}
        </div>
        <button
          onClick={generateBracket}
          disabled={saving || groups.length === 0}
          className="btn-primary text-sm px-4 py-2"
        >
          {bracketMatches.length > 0 ? 'Rigenera da Classifiche' : 'Genera da Classifiche'}
        </button>
      </div>

      {/* Bracket display */}
      {roundsPresent.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-court-gray">Nessun tabellone ancora. Completa i gironi e genera il tabellone.</p>
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-4">
          {roundsPresent.map(round => {
            const roundMatches = bracketMatches
              .filter(m => m.bracket_round === round)
              .sort((a, b) => (a.bracket_position ?? 0) - (b.bracket_position ?? 0))

            return (
              <div key={round} className="flex flex-col gap-4 min-w-[180px]">
                <h3 className="font-display uppercase text-xs text-court-muted tracking-widest">
                  {roundLabels[round]}
                </h3>
                {roundMatches.map(match => (
                  <div key={match.id} className="card p-3 space-y-2">
                    {/* Home slot */}
                    {editingSlot?.matchId === match.id && editingSlot.slot === 'home' ? (
                      <select
                        className="input py-1 px-2 text-xs w-full"
                        autoFocus
                        onChange={e => overrideTeam(match.id, 'home', e.target.value)}
                        onBlur={() => setEditingSlot(null)}
                        defaultValue=""
                      >
                        <option value="">— Seleziona —</option>
                        {categoryTeams.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        className="text-sm text-left w-full hover:text-brand-orange transition-colors"
                        onClick={() => setEditingSlot({ matchId: match.id, slot: 'home' })}
                      >
                        {match.team_home?.name ?? <span className="opacity-40 italic text-xs">TBD</span>}
                        {match.score_home != null && (
                          <span className={`ml-2 font-bold ${match.score_home > (match.score_away ?? -1) ? 'text-green-400' : 'text-court-muted'}`}>
                            {match.score_home}
                          </span>
                        )}
                      </button>
                    )}

                    <div className="border-t border-court-border" />

                    {/* Away slot */}
                    {editingSlot?.matchId === match.id && editingSlot.slot === 'away' ? (
                      <select
                        className="input py-1 px-2 text-xs w-full"
                        autoFocus
                        onChange={e => overrideTeam(match.id, 'away', e.target.value)}
                        onBlur={() => setEditingSlot(null)}
                        defaultValue=""
                      >
                        <option value="">— Seleziona —</option>
                        {categoryTeams.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        className="text-sm text-left w-full hover:text-brand-orange transition-colors"
                        onClick={() => setEditingSlot({ matchId: match.id, slot: 'away' })}
                      >
                        {match.team_away?.name ?? <span className="opacity-40 italic text-xs">TBD</span>}
                        {match.score_away != null && (
                          <span className={`ml-2 font-bold ${match.score_away > (match.score_home ?? -1) ? 'text-green-400' : 'text-court-muted'}`}>
                            {match.score_away}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
