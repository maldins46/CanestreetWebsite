// ============================================================
// Database types — keep in sync with supabase/migrations/001_initial_schema.sql
// ============================================================

export type AdminRole = 'superadmin' | 'editor'
export type TeamStatus = 'pending' | 'approved' | 'rejected' | 'waitlisted'
export type TeamCategory = 'open_m' | 'open_f' | 'u14_m' | 'u16_m' | 'u18_m'
export type SponsorTier = 'main' | 'gold' | 'silver' | 'bronze'

export interface Admin {
  id: string
  user_id: string
  email: string
  role: AdminRole
  created_at: string
}

export interface Edition {
  id: string
  year: number
  title: string
  subtitle: string | null
  description: string | null
  winner_name: string | null
  is_current: boolean
  registration_open: boolean
  cover_url: string | null
  created_at: string
}

export interface Team {
  id: string
  edition_id: string
  name: string
  category: TeamCategory
  captain_name: string | null  // legacy — flat form; null for new registrations
  captain_email: string
  captain_phone: string | null
  player2_name: string | null  // legacy
  player3_name: string | null  // legacy
  player4_name: string | null  // legacy
  schedule_notes: string | null
  notes: string | null
  consent_new_beetle: boolean
  status: TeamStatus
  created_at: string
}

export interface Player {
  id: string
  team_id: string
  name: string
  birth_date: string  // ISO date string
  codice_fiscale: string
  instagram: string | null
  club: string | null
  email: string | null
  phone: string | null
  city: string | null
  is_captain: boolean
  is_vice_captain: boolean
  sort_order: number
  created_at: string
}

export interface NewsArticle {
  id: string
  title: string
  slug: string
  excerpt: string | null
  body: string
  cover_url: string | null
  author_id: string | null
  published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface EditionWinner {
  id: string
  edition_id: string
  category: string
  winner_name: string
  photo_url: string | null
  sort_order: number
  created_at: string
}

// ============================================================
// Joined / enriched types used in UI
// ============================================================

export interface TeamWithEdition extends Team {
  editions?: Pick<Edition, 'year' | 'title'>
}

export interface TeamWithPlayers extends Team {
  players: Player[]
  editions?: Pick<Edition, 'year' | 'title'>
}

export interface NewsWithAuthor extends NewsArticle {
  admins?: Pick<Admin, 'email'>
}

export interface EditionWithWinners extends Edition {
  edition_winners: EditionWinner[]
}

export interface StaffMember {
  id: string
  name: string
  title: string       // nickname like "Il CEO"
  bio: string
  photo_url: string | null
  sort_order: number
  created_at: string
}

export interface Sponsor {
  id: string
  name: string
  tier: SponsorTier
  logo_url: string | null
  website_url: string | null
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

// ============================================================
// Tournament types — keep in sync with supabase/migrations/009_tournament.sql
// ============================================================

export type MatchPhase = 'group' | 'bracket'
export type MatchStatus = 'scheduled' | 'in_progress' | 'completed'
export type BracketRound = 'round_of_16' | 'quarterfinal' | 'semifinal' | 'final'

export interface Group {
  id: string
  edition_id: string
  category: TeamCategory
  name: string
  sort_order: number
  created_at: string
}

export interface GroupTeam {
  id: string
  group_id: string
  team_id: string
  seed: number | null
  created_at: string
}

export interface Match {
  id: string
  edition_id: string
  category: TeamCategory
  phase: MatchPhase
  group_id: string | null
  bracket_round: BracketRound | null
  bracket_position: number | null
  next_match_id: string | null
  next_match_slot: 'home' | 'away' | null
  team_home_id: string | null
  team_away_id: string | null
  score_home: number | null
  score_away: number | null
  scheduled_at: string | null
  status: MatchStatus
  sort_order: number
  created_at: string
}

// Enriched types for UI
export interface GroupWithTeams extends Group {
  group_teams: (GroupTeam & { teams: Pick<Team, 'id' | 'name'> | null })[]
}

export interface MatchWithTeams extends Match {
  team_home: Pick<Team, 'id' | 'name'> | null
  team_away: Pick<Team, 'id' | 'name'> | null
  group: Pick<Group, 'id' | 'name'> | null
}

// Computed standings row
export interface StandingsRow {
  team_id: string
  team_name: string
  played: number
  wins: number
  losses: number
  points_for: number
  points_against: number
  point_differential: number
}

// ============================================================
// TPC (3-Point Contest) types — keep in sync with 010_tpc.sql
// ============================================================

export type TpcCategory = 'open' | 'under'

export interface TpcContest {
  id: string
  edition_id: string
  category: TpcCategory
  created_at: string
}

export interface TpcPlayer {
  id: string
  contest_id: string
  name: string
  created_at: string
}

export interface TpcRound {
  id: string
  contest_id: string
  round_number: number
  name: string
  created_at: string
}

export interface TpcEntry {
  id: string
  round_id: string
  player_id: string
  score: number | null
  is_qualified: boolean
  is_live: boolean
  sort_order: number
  created_at: string
}

export interface TpcEntryWithPlayer extends TpcEntry {
  tpc_players: Pick<TpcPlayer, 'id' | 'name'>
}

export interface TpcRoundWithEntries extends TpcRound {
  tpc_entries: TpcEntryWithPlayer[]
}

export interface TpcContestFull extends TpcContest {
  tpc_players: TpcPlayer[]
  tpc_rounds: TpcRoundWithEntries[]
}

// ============================================================
// Showcase mode type
// ============================================================

export type ShowcaseMode = 'open' | 'under' | 'tpc_open' | 'tpc_under' | 'sponsors'

export interface ShowcaseModeRow {
  id: string
  mode: ShowcaseMode
  light_mode: boolean
  updated_at: string
  updated_by: string | null
}
