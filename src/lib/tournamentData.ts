import type { SupabaseClient } from '@supabase/supabase-js'
import type { Edition, GroupWithTeams, MatchWithTeams, TpcContestFull, Sponsor, CalendarioEvent } from '@/types'

export type TournamentSnapshot = {
  edition: Edition | null
  matches: MatchWithTeams[]
  groups: GroupWithTeams[]
  tpcContests: TpcContestFull[]
  sponsors: Sponsor[]
  events: CalendarioEvent[]
}

// Shared by /ledwall and /showcase — both venue displays need the same
// tournament snapshot, just driven by realtime pushes instead of polling.
export async function fetchTournamentSnapshot(supabase: SupabaseClient): Promise<TournamentSnapshot> {
  const [
    { data: edition },
    { data: matches },
    { data: groups },
    { data: tpcContests },
    { data: sponsors },
    { data: events },
  ] = await Promise.all([
    supabase.from('editions').select('*').eq('is_current', true).maybeSingle(),
    supabase
      .from('matches')
      .select('*, team_home:teams!matches_team_home_id_fkey(id, name), team_away:teams!matches_team_away_id_fkey(id, name), group:groups!matches_group_id_fkey(id, name)')
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .order('sort_order'),
    supabase.from('groups').select('*, group_teams(*, teams(id, name))').order('sort_order'),
    supabase.from('tpc_contests').select('*, tpc_players(*), tpc_rounds(*, tpc_entries(*, tpc_players(id, name)))'),
    supabase.from('sponsors').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('events').select('*').order('scheduled_at', { ascending: true, nullsFirst: false }).order('sort_order'),
  ])

  return {
    edition: edition ?? null,
    matches: matches ?? [],
    groups: groups ?? [],
    tpcContests: tpcContests ?? [],
    sponsors: sponsors ?? [],
    events: events ?? [],
  }
}
