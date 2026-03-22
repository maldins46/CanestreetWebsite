// ============================================================
// Database types — keep in sync with supabase/migrations/001_initial_schema.sql
// ============================================================

export type AdminRole = 'superadmin' | 'editor'
export type TeamStatus = 'pending' | 'approved' | 'rejected' | 'waitlisted'
export type TeamCategory = 'open' | 'u14' | 'u16' | 'u18'

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
  is_captain: boolean
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
