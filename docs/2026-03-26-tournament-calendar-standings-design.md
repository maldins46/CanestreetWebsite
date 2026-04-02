# Tournament Calendar, Standings & Bracket Feature

## Context

Canestreet is a 3x3 basketball tournament with multiple categories (open, u14, u16, u18). Each edition has a **group phase** (round-robin within groups) followed by a **single-elimination bracket**. Currently there is no way to show match schedules, live results, group standings, or brackets on the website. The old `standings` table was dropped (migration 006) and this feature is a complete redesign.

**Problem:** Players and fans have no way to see when their matches are, what the current group standings are, or how the bracket is shaping up. Admins manage all of this on paper or spreadsheets.

**Goal:** Build a full tournament management system — admin tools to set up groups, schedule matches, enter scores, and generate brackets; plus a public page where anyone can follow the tournament live.

---

## Database Schema

### New Tables

#### `groups`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid, PK | |
| `edition_id` | uuid, FK → editions | ON DELETE CASCADE |
| `category` | text | `'open' \| 'u14' \| 'u16' \| 'u18'` |
| `name` | text | e.g., "A", "B", "C" |
| `sort_order` | int | Display ordering |
| `created_at` | timestamptz | |

**Index:** `groups_edition_category_idx` on `(edition_id, category)`

#### `group_teams`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid, PK | |
| `group_id` | uuid, FK → groups | ON DELETE CASCADE |
| `team_id` | uuid, FK → teams | ON DELETE CASCADE |
| `seed` | int, nullable | Optional ordering within group |
| `created_at` | timestamptz | |

**Unique constraint:** `(group_id, team_id)` — a team can only be in a group once.

#### `matches`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid, PK | |
| `edition_id` | uuid, FK → editions | ON DELETE CASCADE |
| `category` | text | Denormalized for easy calendar queries |
| `phase` | text | `'group' \| 'bracket'` |
| `group_id` | uuid, FK → groups, nullable | Set when `phase = 'group'` |
| `bracket_round` | text, nullable | e.g., `'quarterfinal'`, `'semifinal'`, `'final'` |
| `bracket_position` | int, nullable | Ordering within a round |
| `next_match_id` | uuid, FK → matches, nullable | Self-ref: winner advances here |
| `next_match_slot` | text, nullable | `'home' \| 'away'` — which slot the winner fills |
| `team_home_id` | uuid, FK → teams, nullable | Nullable for TBD bracket matches |
| `team_away_id` | uuid, FK → teams, nullable | Nullable for TBD bracket matches |
| `score_home` | int, nullable | |
| `score_away` | int, nullable | |
| `scheduled_at` | timestamptz, nullable | Day + time of the match |
| `status` | text | `'scheduled' \| 'in_progress' \| 'completed'` |
| `sort_order` | int | Calendar ordering fallback |
| `created_at` | timestamptz | |

**Indexes:**
- `matches_edition_idx` on `(edition_id)`
- `matches_calendar_idx` on `(edition_id, scheduled_at)` — main calendar query
- `matches_group_idx` on `(group_id)` — standings computation

**Constraint:** At most one match per edition can have `status = 'in_progress'`. Enforced application-side: when setting a match to live, first `UPDATE matches SET status = 'scheduled' WHERE edition_id = ? AND status = 'in_progress'`, then `UPDATE matches SET status = 'in_progress' WHERE id = ?`. Both updates in a single server action for atomicity.

### RLS Policies

All three tables follow the existing pattern:
- **Public:** `SELECT` on all tables (everyone can see groups, matches, results)
- **Admins:** Full CRUD via `is_admin()` function

### Standings Computation

Group standings are **computed from match results**, never stored. The ranking algorithm follows the official rules from the regolamento:

1. **Wins** (descending)
2. **Point differential** (points scored − points conceded, descending)
3. **Points scored** (descending)

With ~20-30 group matches per category, this computation is instant. Implemented as application-side logic in a shared utility function (used by both admin bracket generation and public standings display).

---

## Admin UI

### Location

New admin page: `/admin/torneo` with a "Torneo" entry in the sidebar (between "Edizioni" and "News").

### Layout

Top bar with:
- **Edition switcher** — same `EditionSwitcher` component as Teams page
- **Category filter** — same `CategoryFilter` component as Teams page
- **3 tabs:** Gironi | Calendario | Tabellone

### Tab 1: Gironi (Groups)

**Purpose:** Create groups and assign approved teams.

- Displays group cards in a grid (2-3 per row)
- Each group card shows: name, team count, list of assigned teams
- Each team has a remove button (×)
- At the bottom of each group card: a `<select>` dropdown showing approved teams for the selected category that aren't assigned to any group yet
- **"+ Nuovo Girone"** button creates a new group (auto-named: A, B, C...)
- **"Genera Partite Girone"** button creates all round-robin matches for every group in the selected category — matches are created with `status = 'scheduled'` and no `scheduled_at` (unscheduled). If group matches already exist for this category, a confirmation dialog asks: "Partite già generate per questa categoria. Rigenerare? Le partite esistenti saranno eliminate." — this deletes existing group matches for the category and recreates them (idempotent regeneration)
- Groups can be deleted (cascades to group_teams; associated matches must be deleted manually or via confirmation)

### Tab 2: Calendario (Match Schedule & Scores)

**Purpose:** Schedule matches and enter scores. Single chronological view across all categories.

- Table/list of all matches for the edition, ordered by `scheduled_at` (then `sort_order`)
- Can be filtered by category
- Each row shows: scheduled time (editable datetime input), category badge, phase label (e.g., "Gir. A" or "Semifinale"), home team, score inputs, away team, status
- **Score entry:** Two number inputs for home/away score. When both are filled and saved, `status` auto-sets to `'completed'`
- **Live toggle:** An "Avvia" button on scheduled matches sets `status = 'in_progress'`. This first clears any other `in_progress` match in the edition. The button becomes a red "LIVE" toggle to stop it
- **Bracket advancement:** When a bracket match is completed, the winner (team with higher score) is automatically written to the `next_match` (in the slot specified by `next_match_slot`)

### Tab 3: Tabellone (Bracket)

**Purpose:** Visual bracket management per category.

- Displays the elimination bracket as a tree: rounds as columns, matches as cards
- Each match card shows: round label, home team, away team, scores (if completed)
- **"Genera da Classifiche"** button (admin first selects desired bracket size: 4, 8, or 16):
  1. Reads final group standings for the selected category
  2. Collects enough top finishers from each group to fill the bracket (e.g., for 8-team bracket with 2 groups: top 4 from each; with 4 groups: top 2 from each)
  3. Ranks same-position teams across groups using their group-phase stats with the same tiebreaker criteria (wins → point differential → points scored). For example, all 2nd-place teams are ranked among themselves by comparing their group-phase win count, then point differential, then points scored
  4. Applies standard tournament seeding (1 vs last, 2 vs second-to-last)
  5. Creates bracket matches with proper `next_match_id` / `next_match_slot` linkages
  6. Admin reviews and can click any team slot to override with a different team
- **"+ Aggiungi Round"** for manual bracket construction
- Admin can edit any team slot in the bracket by clicking on it (dropdown of available teams)

---

## Public UI

### New Page: `/torneo`

New top-level page accessible from the main navigation. The "Torneo" nav link is always visible on `PublicNav` / `MobileBottomNav`. To make space on the mobile nav, remove the regolamento icon from there.

### Page Structure

The page has a **category filter** at the top (sticky on mobile, horizontally scrollable pills: "Tutte", "Open", "U18", "U16", "U14") and 3 sections:

#### Section 1: Calendario (Match Schedule)

- All matches in chronological order, grouped by day (date headers)
- Match cards show: time, category badge (color-coded), phase label, home team, score or "vs", away team
- **Completed matches:** Green left border, scores displayed with winner score highlighted in green
- **Live match (`in_progress`):** Red left border, red-tinted background, pulsing red dot + "LIVE" label replacing the time. Subtle glow/shadow effect
- **Scheduled matches:** Neutral left border, "vs" between team names
- **TBD bracket matches:** Teams show placeholders like "1° Gir. A" or "Winner SF1"
- Category filter applies here — "Tutte" shows all categories interleaved

#### Section 2: Classifiche (Group Standings)

- One standings table per group, filtered by category (no "Tutte" — must pick a category, default to first available)
- Groups displayed in a responsive grid (2 per row on desktop, stacked on mobile)
- Table columns: #, Squadra, V (wins), S (losses), PF (points for), PS (points against), +/- (differential)
- Top qualifying positions highlighted with orange tint
- Computed live from match results

#### Section 3: Tabellone (Bracket)

- Read-only bracket visualization per category
- Rounds as columns: Quarti → Semifinali → Finale
- Match cards show: team names + scores (if completed), winner name in bold
- Winners auto-advance visually
- **Mobile:** Rounds stack vertically with round headers. Horizontal scroll as fallback for large brackets

### Mobile Responsiveness

- **Calendar:** Match cards stack; team names above/below score instead of left/right
- **Standings:** Groups stack vertically; table hides PF/PS columns on smallest screens, keeps V, S, +/-
- **Bracket:** Rounds stack vertically with clear round headers
- **Category filter:** Sticky horizontal scroll pills

### Matches not ready yet
If we don't have matches, show proper empty placeholders on the sections.

---

## TypeScript Types

New types to add to `src/types/index.ts`:

```typescript
// Group
export interface Group {
  id: string
  edition_id: string
  category: TeamCategory
  name: string
  sort_order: number
  created_at: string
}

// Group-team junction
export interface GroupTeam {
  id: string
  group_id: string
  team_id: string
  seed: number | null
  created_at: string
}

// Match phase
export type MatchPhase = 'group' | 'bracket'

// Match status
export type MatchStatus = 'scheduled' | 'in_progress' | 'completed'

// Bracket round labels
export type BracketRound = 'round_of_16' | 'quarterfinal' | 'semifinal' | 'final'

// Match
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
  teams: (GroupTeam & { team: Pick<Team, 'id' | 'name'> })[]
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
```

---

## Key Files to Create/Modify

### New Files
- `supabase/migrations/009_tournament.sql` — new tables, indexes, RLS
- `src/app/admin/torneo/page.tsx` — admin tournament page (server component)
- `src/components/admin/TournamentGroups.tsx` — group management tab
- `src/components/admin/TournamentCalendar.tsx` — calendar/scores tab
- `src/components/admin/TournamentBracket.tsx` — bracket management tab
- `src/app/(public)/torneo/page.tsx` — public tournament page
- `src/components/public/MatchCard.tsx` — reusable match card component
- `src/components/public/StandingsTable.tsx` — group standings table
- `src/components/public/BracketView.tsx` — bracket visualization
- `src/lib/standings.ts` — shared standings computation utility

### Modified Files
- `src/types/index.ts` — add new interfaces
- `src/components/admin/AdminSidebar.tsx` — add "Torneo" nav entry
- `src/components/public/PublicNav.tsx` — add "Torneo" link
- `src/components/public/MobileBottomNav.tsx` — add "Torneo" entry, remove regolamento entry

---

## Verification Plan

1. **Schema:** Run `supabase db reset` and verify all tables are created with correct columns, indexes, and RLS
2. **Admin — Groups:** Create groups for a category, assign teams, verify round-robin match generation produces the correct number of matches (n*(n-1)/2 per group)
3. **Admin — Calendar:** Schedule matches, enter scores, verify standings update. Test live toggle (only one at a time)
4. **Admin — Bracket:** Generate bracket from standings, verify crossover seeding. Override a team slot. Complete a bracket match and verify winner advancement
5. **Public — Calendar:** Verify all matches display in order, category filter works, live match has pulsing indicator, completed matches show scores
6. **Public — Standings:** Verify standings are computed correctly (wins → diff → scored). Test with ties at each level
7. **Public — Bracket:** Verify bracket renders correctly for 4, 8, 16-team sizes. Verify winner advancement displays
8. **Mobile:** Test all three sections on mobile viewport
9. **Build:** Run `npm run build` to verify no TypeScript errors
