// ============================================================
// Database types — keep in sync with supabase/migrations/001_initial_schema.sql
// ============================================================

export type AdminRole = 'superadmin' | 'editor'
export type TeamStatus = 'pending' | 'approved' | 'rejected' | 'waitlisted'

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
  cover_url: string | null
  created_at: string
}

export interface Team {
  id: string
  edition_id: string
  name: string
  captain_name: string
  captain_email: string
  captain_phone: string | null
  player2_name: string
  player3_name: string
  player4_name: string | null
  notes: string | null
  status: TeamStatus
  created_at: string
}

export interface Standing {
  id: string
  edition_id: string
  team_id: string | null
  team_name: string
  played: number
  won: number
  lost: number
  points_for: number
  points_against: number
  rank: number | null
  created_at: string
  updated_at: string
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

// ============================================================
// Joined / enriched types used in UI
// ============================================================

export interface TeamWithEdition extends Team {
  editions?: Pick<Edition, 'year' | 'title'>
}

export interface NewsWithAuthor extends NewsArticle {
  admins?: Pick<Admin, 'email'>
}
