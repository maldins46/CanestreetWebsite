# Tournament Calendar, Standings & Bracket — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers-extended-cc:subagent-driven-development (if subagents available) or superpowers-extended-cc:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full tournament management system with group setup, match scheduling, score entry, bracket generation (admin) and a public live calendar + standings + bracket page.

**Architecture:** Unified `matches` table for both group and bracket phases. Groups via `groups` + `group_teams` junction. Standings computed from match results. Self-referencing FK for bracket advancement. Admin: 3-tab page (Gironi, Calendario, Tabellone). Public: new `/torneo` page with 3 sections.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase (Postgres + RLS)

**Spec:** `docs/superpowers/specs/2026-03-26-tournament-calendar-standings-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `supabase/migrations/009_tournament.sql` | DB schema: groups, group_teams, matches tables + indexes + RLS |
| `src/types/index.ts` (modify) | Add Group, GroupTeam, Match, MatchWithTeams, GroupWithTeams, StandingsRow types |
| `src/lib/standings.ts` | Shared standings computation: matches → ranked StandingsRow[] |
| `src/app/admin/torneo/page.tsx` | Admin server component: fetches editions, groups, matches, teams |
| `src/components/admin/TournamentGroups.tsx` | Client component: group CRUD, team assignment, match generation |
| `src/components/admin/TournamentCalendar.tsx` | Client component: match list, inline scheduling, score entry, live toggle |
| `src/components/admin/TournamentBracket.tsx` | Client component: bracket visualization, generation from standings, team override |
| `src/app/(public)/torneo/page.tsx` | Public server component: fetches current edition tournament data |
| `src/components/public/MatchCard.tsx` | Match card with live/completed/scheduled states |
| `src/components/public/StandingsTable.tsx` | Group standings table per group |
| `src/components/public/BracketView.tsx` | Read-only bracket visualization |

### Modified Files
| File | Change |
|------|--------|
| `src/types/index.ts` | Add tournament-related types |
| `src/components/admin/AdminSidebar.tsx` | Add "Torneo" nav entry (between Edizioni and News) |
| `src/components/public/PublicNav.tsx` | Add "Torneo" link (between News and Edizioni) |
| `src/components/public/MobileBottomNav.tsx` | Replace "Regolam." with "Torneo" |

---

### Task 0: Database Migration & TypeScript Types

**Goal:** Create the 3 new tables (groups, group_teams, matches) and add all TypeScript interfaces.

**Files:**
- Create: `supabase/migrations/009_tournament.sql`
- Modify: `src/types/index.ts`

**Acceptance Criteria:**
- [ ] `groups`, `group_teams`, `matches` tables exist with correct columns and constraints
- [ ] RLS policies: public SELECT, admin full CRUD
- [ ] All TypeScript types match the DB schema exactly
- [ ] `npm run build` passes

**Verify:** `npm run build` → success (no type errors)

**Steps:**

- [ ] **Step 1: Create migration file `supabase/migrations/009_tournament.sql`**

```sql
-- ============================================================
-- 009_tournament.sql — Groups, group_teams, and matches
-- ============================================================

-- Groups: named groups scoped to edition + category
create table groups (
  id          uuid primary key default uuid_generate_v4(),
  edition_id  uuid not null references editions(id) on delete cascade,
  category    text not null check (category in ('open','u14','u16','u18')),
  name        text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index groups_edition_category_idx on groups(edition_id, category);
alter table groups enable row level security;

create policy "groups_public_read"
  on groups for select using (true);
create policy "groups_admin_all"
  on groups for all using (is_admin()) with check (is_admin());

-- Group-team junction: assigns teams to groups
create table group_teams (
  id          uuid primary key default uuid_generate_v4(),
  group_id    uuid not null references groups(id) on delete cascade,
  team_id     uuid not null references teams(id) on delete cascade,
  seed        int,
  created_at  timestamptz not null default now(),
  unique(group_id, team_id)
);

alter table group_teams enable row level security;

create policy "group_teams_public_read"
  on group_teams for select using (true);
create policy "group_teams_admin_all"
  on group_teams for all using (is_admin()) with check (is_admin());

-- Matches: unified table for group and bracket phases
create table matches (
  id               uuid primary key default uuid_generate_v4(),
  edition_id       uuid not null references editions(id) on delete cascade,
  category         text not null check (category in ('open','u14','u16','u18')),
  phase            text not null check (phase in ('group','bracket')),
  group_id         uuid references groups(id) on delete set null,
  bracket_round    text check (bracket_round in ('round_of_16','quarterfinal','semifinal','final')),
  bracket_position int,
  next_match_id    uuid references matches(id) on delete set null,
  next_match_slot  text check (next_match_slot in ('home','away')),
  team_home_id     uuid references teams(id) on delete set null,
  team_away_id     uuid references teams(id) on delete set null,
  score_home       int,
  score_away       int,
  scheduled_at     timestamptz,
  status           text not null default 'scheduled'
                     check (status in ('scheduled','in_progress','completed')),
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);

create index matches_edition_idx on matches(edition_id);
create index matches_calendar_idx on matches(edition_id, scheduled_at);
create index matches_group_idx on matches(group_id);
alter table matches enable row level security;

create policy "matches_public_read"
  on matches for select using (true);
create policy "matches_admin_all"
  on matches for all using (is_admin()) with check (is_admin());
```

- [ ] **Step 2: Add TypeScript types to `src/types/index.ts`**

After the existing `Sponsor` interface, add:

```typescript
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
  group_teams: (GroupTeam & { teams: Pick<Team, 'id' | 'name'> })[]
}

export interface MatchWithTeams extends Match {
  team_home: Pick<Team, 'id' | 'name'> | null
  team_away: Pick<Team, 'id' | 'name'> | null
  group: Pick<Group, 'id' | 'name'> | null
}

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

- [ ] **Step 3: Apply migration and verify build**

```bash
# If local Supabase is running:
supabase db push --local
# Then:
npm run build
```

---

### Task 1: Standings Computation Utility

**Goal:** Create the shared utility that computes group standings from match results.

**Files:**
- Create: `src/lib/standings.ts`

**Acceptance Criteria:**
- [ ] Given an array of completed group matches, returns StandingsRow[] sorted by wins → point differential → points scored
- [ ] Handles partial data (matches not yet completed are excluded)
- [ ] Pure function, no DB calls — receives matches as input

**Verify:** `npm run build` → success

**Steps:**

- [ ] **Step 1: Create `src/lib/standings.ts`**

```typescript
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

---

### Task 2: Navigation Updates (Admin Sidebar + Public Nav)

**Goal:** Add "Torneo" entries to admin sidebar, public nav, and mobile bottom nav.

**Files:**
- Modify: `src/components/admin/AdminSidebar.tsx:10-18`
- Modify: `src/components/public/PublicNav.tsx:7-15`
- Modify: `src/components/public/MobileBottomNav.tsx:4,7-13`

**Acceptance Criteria:**
- [ ] Admin sidebar shows "Torneo" between "Edizioni" and "News"
- [ ] Public desktop nav shows "Torneo" between "News" and "Edizioni"
- [ ] Mobile bottom nav shows "Torneo" icon instead of "Regolam."
- [ ] `npm run build` passes

**Verify:** `npm run build` → success; visually check both navs in browser

**Steps:**

- [ ] **Step 1: Add Torneo to admin sidebar**

In `src/components/admin/AdminSidebar.tsx`, add `Calendar` import from lucide-react and insert a new entry in the `nav` array after the "Edizioni" entry:

```typescript
import { Users, Newspaper, Image as ImageIcon, ShieldCheck, LogOut, Home, ExternalLink, Trophy, UserCircle, Menu, X, Handshake, Calendar } from 'lucide-react'

const nav = [
  { href: '/admin',           label: 'Dashboard',  icon: Home },
  { href: '/admin/teams',     label: 'Squadre',    icon: Users },
  { href: '/admin/editions',  label: 'Edizioni',   icon: Trophy },
  { href: '/admin/torneo',    label: 'Torneo',     icon: Calendar },
  { href: '/admin/news',      label: 'News',       icon: Newspaper },
  { href: '/admin/staff',     label: 'Staff',      icon: UserCircle },
  { href: '/admin/sponsors',  label: 'Sponsor',    icon: Handshake },
  { href: '/admin/media',     label: 'Media',      icon: ImageIcon },
  { href: '/admin/admins',    label: 'Admins',     icon: ShieldCheck },
]
```

- [ ] **Step 2: Add Torneo to public desktop nav**

In `src/components/public/PublicNav.tsx`, insert between News and Edizioni:

```typescript
const links = [
  { href: '/',             label: 'Home' },
  { href: '/news',         label: 'News' },
  { href: '/torneo',       label: 'Torneo' },
  { href: '/editions',     label: 'Edizioni' },
  { href: '/chi-siamo',    label: 'Chi siamo' },
  { href: '/regolamento',  label: 'Regolamento' },
  { href: '/sponsor',      label: 'Sponsor' },
  { href: '/register',     label: 'Iscriviti',  accent: true },
]
```

- [ ] **Step 3: Replace Regolamento with Torneo in mobile bottom nav**

In `src/components/public/MobileBottomNav.tsx`, add `Calendar` import and replace the regolamento entry:

```typescript
import { Home, Trophy, Users, Calendar, Handshake } from 'lucide-react'

const tabs = [
  { href: '/',             label: 'Home',      Icon: Home },
  { href: '/sponsor',      label: 'Sponsor',   Icon: Handshake },
  { href: '/torneo',       label: 'Torneo',    Icon: Calendar },
  { href: '/editions',     label: 'Edizioni',  Icon: Trophy },
  { href: '/chi-siamo',    label: 'Chi siamo', Icon: Users },
]
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

---

### Task 3: Admin Tournament Page — Server Component & Groups Tab

**Goal:** Create the admin `/admin/torneo` page with edition/category switcher and the Gironi (Groups) tab for creating groups, assigning teams, and generating round-robin matches.

**Files:**
- Create: `src/app/admin/torneo/page.tsx`
- Create: `src/components/admin/TournamentGroups.tsx`

**Acceptance Criteria:**
- [ ] Page loads with edition switcher and category filter (reusing existing components)
- [ ] Can create groups (auto-named A, B, C...) for the selected category
- [ ] Can assign approved teams to groups via dropdown (only shows unassigned teams)
- [ ] Can remove teams from groups
- [ ] Can delete groups
- [ ] "Genera Partite" creates round-robin matches for all groups in the category
- [ ] Regeneration: if matches exist, confirms before deleting and recreating
- [ ] `npm run build` passes

**Verify:** `npm run build` → success; create groups, assign teams, generate matches in the browser

**Steps:**

- [ ] **Step 1: Create `src/app/admin/torneo/page.tsx`**

Server component that fetches all needed data and renders the 3-tab layout. Initially only the Groups tab is functional (Calendar and Bracket tabs come in later tasks).

The page follows the same pattern as `/admin/teams/page.tsx`:
- Fetches editions for the switcher
- Determines active edition from URL param or `is_current`
- Fetches groups with their teams for the active edition
- Fetches all approved teams for the active edition (for assignment dropdowns)
- Fetches all matches for the active edition (needed for Calendar and Bracket tabs)
- Uses `searchParams` for edition, category, and tab state
- Passes data to client components

Key query patterns:
```typescript
// Fetch groups with their team assignments
const { data: groups } = await supabase
  .from('groups')
  .select('*, group_teams(*, teams(id, name))')
  .eq('edition_id', activeEdition.id)
  .order('sort_order')

// Fetch approved teams for the edition (for assignment dropdown)
const { data: approvedTeams } = await supabase
  .from('teams')
  .select('id, name, category')
  .eq('edition_id', activeEdition.id)
  .eq('status', 'approved')
  .order('name')

// Fetch all matches for the edition
const { data: matches } = await supabase
  .from('matches')
  .select('*, team_home:teams!matches_team_home_id_fkey(id, name), team_away:teams!matches_team_away_id_fkey(id, name), group:groups!matches_group_id_fkey(id, name)')
  .eq('edition_id', activeEdition.id)
  .order('scheduled_at', { ascending: true, nullsFirst: false })
  .order('sort_order')
```

Tab switching: use a `tab` search param (`gironi`, `calendario`, `tabellone`), default `gironi`. Render tab content conditionally.

- [ ] **Step 2: Create `src/components/admin/TournamentGroups.tsx`**

Client component (`'use client'`) receiving props:
- `editionId: string`
- `category: TeamCategory`
- `groups: GroupWithTeams[]`
- `approvedTeams: Pick<Team, 'id' | 'name' | 'category'>[]`
- `hasGroupMatches: boolean` (whether group matches already exist for this category)

Functionality:
- **Create group:** Button calls `supabase.from('groups').insert(...)` with auto-generated name (next letter: A, B, C...) based on existing group names. Then `router.refresh()`.
- **Delete group:** Button with `window.confirm()`, calls `supabase.from('groups').delete().eq('id', groupId)`. Then `router.refresh()`.
- **Assign team:** `<select>` at bottom of each group card. Filters `approvedTeams` to show only teams matching the current category that aren't already in any group. On change, calls `supabase.from('group_teams').insert({ group_id, team_id })`. Then `router.refresh()`.
- **Remove team:** × button calls `supabase.from('group_teams').delete().eq('id', groupTeamId)`. Then `router.refresh()`.
- **Generate matches:** Button triggers round-robin generation. If `hasGroupMatches`, show confirmation dialog first, then delete existing group matches (`supabase.from('matches').delete().eq('edition_id', editionId).eq('category', category).eq('phase', 'group')`). Then for each group, generate all n*(n-1)/2 match combinations:

```typescript
function generateRoundRobin(groupId: string, teamIds: string[], editionId: string, category: string): Partial<Match>[] {
  const matches: Partial<Match>[] = []
  let sortOrder = 0
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matches.push({
        edition_id: editionId,
        category,
        phase: 'group',
        group_id: groupId,
        team_home_id: teamIds[i],
        team_away_id: teamIds[j],
        status: 'scheduled',
        sort_order: sortOrder++,
      })
    }
  }
  return matches
}
```

Insert all generated matches in bulk with `supabase.from('matches').insert(allMatches)`. Then `router.refresh()`.

UI layout: grid of group cards (responsive 1-3 columns), each card shows group name, team count, listed teams with × buttons, team selector dropdown. Below: action buttons.

- [ ] **Step 3: Verify build and test in browser**

```bash
npm run build
```

Then test: create groups for Open category, assign teams, generate matches.

---

### Task 4: Admin Tournament Calendar Tab

**Goal:** Build the Calendar tab for scheduling matches, entering scores, toggling live status, and handling bracket advancement.

**Files:**
- Create: `src/components/admin/TournamentCalendar.tsx`
- Modify: `src/app/admin/torneo/page.tsx` (wire up Calendar tab)

**Acceptance Criteria:**
- [ ] Shows all matches for the edition in chronological order
- [ ] Can filter by category
- [ ] Can edit scheduled_at (datetime input) for each match
- [ ] Can enter scores (two number inputs) — saving auto-sets status to 'completed'
- [ ] "Avvia" button sets match to `in_progress`, clearing any other live match first
- [ ] "LIVE" button toggles back to `scheduled`
- [ ] When a bracket match is completed, winner auto-advances to next_match
- [ ] `npm run build` passes

**Verify:** `npm run build` → success; schedule matches, enter scores, test live toggle

**Steps:**

- [ ] **Step 1: Create `src/components/admin/TournamentCalendar.tsx`**

Client component receiving props:
- `editionId: string`
- `matches: MatchWithTeams[]`
- `category: TeamCategory | null` (filter)

Key functionality:

**Scheduling:** Inline `<input type="datetime-local">` per match. On blur/change, update:
```typescript
await supabase.from('matches').update({ scheduled_at: value }).eq('id', matchId)
router.refresh()
```

**Score entry:** Two `<input type="number">` per match. Save button per row. On save:
```typescript
const updates: Partial<Match> = { score_home, score_away }
if (score_home != null && score_away != null) {
  updates.status = 'completed'
}
await supabase.from('matches').update(updates).eq('id', matchId)

// Bracket advancement: if this match has next_match_id, put winner there
if (match.phase === 'bracket' && match.next_match_id && match.next_match_slot && score_home != null && score_away != null) {
  const winnerId = score_home > score_away ? match.team_home_id : match.team_away_id
  const advanceField = match.next_match_slot === 'home' ? 'team_home_id' : 'team_away_id'
  await supabase.from('matches').update({ [advanceField]: winnerId }).eq('id', match.next_match_id)
}
router.refresh()
```

**Live toggle:** "Avvia" button for scheduled matches:
```typescript
// Clear any other live match first
await supabase.from('matches').update({ status: 'scheduled' }).eq('edition_id', editionId).eq('status', 'in_progress')
// Set this match as live
await supabase.from('matches').update({ status: 'in_progress' }).eq('id', matchId)
router.refresh()
```

"LIVE" button on in_progress matches toggles back to `scheduled`.

UI: Table layout (responsive — cards on mobile). Each row: datetime input, category badge (colored), phase label (group name or bracket round), home team name, score inputs, away team name, status button. Category colors: open=orange, u18=blue, u16=purple, u14=green.

- [ ] **Step 2: Wire Calendar tab into page**

In `src/app/admin/torneo/page.tsx`, render `<TournamentCalendar>` when `tab === 'calendario'`.

- [ ] **Step 3: Verify build and test**

```bash
npm run build
```

---

### Task 5: Admin Tournament Bracket Tab

**Goal:** Build the Bracket tab with visual bracket display, "Genera da Classifiche" auto-fill, and team slot override.

**Files:**
- Create: `src/components/admin/TournamentBracket.tsx`
- Modify: `src/app/admin/torneo/page.tsx` (wire up Bracket tab)

**Acceptance Criteria:**
- [ ] Shows bracket matches as a visual tree (rounds as columns)
- [ ] "Genera da Classifiche" button: admin selects bracket size (4/8/16), generates bracket from group standings with crossover seeding
- [ ] If bracket matches already exist, confirms before regenerating
- [ ] Admin can click any team slot to override with a dropdown
- [ ] `npm run build` passes

**Verify:** `npm run build` → success; generate bracket, verify seeding, override a slot

**Steps:**

- [ ] **Step 1: Create `src/components/admin/TournamentBracket.tsx`**

Client component receiving props:
- `editionId: string`
- `category: TeamCategory`
- `bracketMatches: MatchWithTeams[]`
- `groupMatches: Match[]`
- `groups: GroupWithTeams[]`
- `approvedTeams: Pick<Team, 'id' | 'name' | 'category'>[]`

**Bracket generation logic:**

```typescript
import { computeStandings } from '@/lib/standings'

function generateBracket(
  bracketSize: 4 | 8 | 16,
  groups: GroupWithTeams[],
  groupMatches: Match[],
  editionId: string,
  category: string
) {
  // 1. Compute standings per group
  const groupStandings = groups.map(g => {
    const gMatches = groupMatches.filter(m => m.group_id === g.id)
    const gTeams = g.group_teams.map(gt => ({ id: gt.teams.id, name: gt.teams.name }))
    return { group: g, standings: computeStandings(gMatches, gTeams) }
  })

  // 2. Determine how many teams qualify per group
  const teamsPerGroup = Math.floor(bracketSize / groups.length)
  // Collect qualifiers: position by position
  const qualifiers: { team_id: string; team_name: string; seed: number }[] = []
  for (let pos = 0; pos < teamsPerGroup; pos++) {
    // Collect all teams at this position across groups
    const atPosition = groupStandings
      .map(gs => gs.standings[pos])
      .filter(Boolean)
      .sort((a, b) => b.wins - a.wins || b.point_differential - a.point_differential || b.points_for - a.points_for)

    for (const row of atPosition) {
      qualifiers.push({ team_id: row.team_id, team_name: row.team_name, seed: qualifiers.length + 1 })
    }
  }

  // 3. Standard tournament seeding: 1 vs N, 2 vs N-1, etc.
  const seeded: [string, string][] = []
  for (let i = 0; i < qualifiers.length / 2; i++) {
    seeded.push([qualifiers[i].team_id, qualifiers[qualifiers.length - 1 - i].team_id])
  }

  // 4. Build bracket matches with next_match_id linkage
  // ... create matches round by round from final backward, linking next_match_id
}
```

The bracket is built from the final match backward. Create the final first, then semis pointing to it, then quarters pointing to semis. Each match gets `bracket_round`, `bracket_position`, `next_match_id`, `next_match_slot`.

**Team slot override:** Each team name in the bracket is clickable → shows a `<select>` dropdown with all approved teams in the category. On select:
```typescript
await supabase.from('matches').update({ [slot]: teamId }).eq('id', matchId)
router.refresh()
```

**UI layout:** Flexbox columns for each round. Match cards show round label, home team, away team, scores if completed. Connecting lines between rounds via CSS borders or SVG.

- [ ] **Step 2: Wire Bracket tab into page**

In `src/app/admin/torneo/page.tsx`, render `<TournamentBracket>` when `tab === 'tabellone'`.

- [ ] **Step 3: Verify build and test**

```bash
npm run build
```

---

### Task 6: Public Tournament Page — Calendar Section

**Goal:** Create the public `/torneo` page with the unified match calendar showing all categories, live indicator, and completed scores.

**Files:**
- Create: `src/app/(public)/torneo/page.tsx`
- Create: `src/components/public/MatchCard.tsx`

**Acceptance Criteria:**
- [ ] Shows all matches for current edition, grouped by day
- [ ] Category filter pills (Tutte, Open, U18, U16, U14)
- [ ] Completed matches: green left border, scores with winner highlighted
- [ ] Live match: red border, pulsing red dot, "LIVE" label, red-tinted background
- [ ] Scheduled matches: neutral border, "vs" text
- [ ] TBD bracket matches: placeholder team names ("1° Gir. A")
- [ ] Empty state when no matches exist
- [ ] `npm run build` passes

**Verify:** `npm run build` → success; check page at `/torneo`

**Steps:**

- [ ] **Step 1: Create `src/app/(public)/torneo/page.tsx`**

Server component that:
1. Fetches current edition (`is_current = true`)
2. Fetches all matches with team names joined:
```typescript
const { data: matches } = await supabase
  .from('matches')
  .select('*, team_home:teams!matches_team_home_id_fkey(id, name), team_away:teams!matches_team_away_id_fkey(id, name), group:groups!matches_group_id_fkey(id, name)')
  .eq('edition_id', edition.id)
  .order('scheduled_at', { ascending: true, nullsFirst: false })
  .order('sort_order')
```
3. Fetches groups with teams (for standings section)
4. Renders category filter + 3 sections (Calendar, Standings, Bracket)

Category filter: client component with URL search params (same pattern as admin). Section switching via anchor links or scroll-to sections.

Page layout:
- Hero header: "Torneo 2025" with edition title
- Sticky category pills
- Section 1: Calendario
- Section 2: Classifiche
- Section 3: Tabellone

- [ ] **Step 2: Create `src/components/public/MatchCard.tsx`**

Client component receiving a `MatchWithTeams` prop. Renders differently based on `status`:

- **completed:** Green left border (`border-l-green-500`). Scores shown, winner score in green bold.
- **in_progress:** Red left border, `bg-red-500/5`, pulsing red dot animation. "LIVE" label replaces time.
- **scheduled:** Subtle border. Time + "vs" text.

```tsx
// Pulse animation: use Tailwind animate-pulse on a red dot
<span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
```

Mobile: stack team names vertically (above/below score) using `flex-col sm:flex-row`.

Category badge colors:
```typescript
const categoryColors: Record<TeamCategory, string> = {
  open: 'bg-brand-orange',
  u18: 'bg-blue-500',
  u16: 'bg-purple-500',
  u14: 'bg-green-500',
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

---

### Task 7: Public Tournament Page — Standings & Bracket Sections

**Goal:** Add the group standings tables and read-only bracket visualization to the public tournament page.

**Files:**
- Create: `src/components/public/StandingsTable.tsx`
- Create: `src/components/public/BracketView.tsx`
- Modify: `src/app/(public)/torneo/page.tsx` (wire up sections 2 and 3)

**Acceptance Criteria:**
- [ ] Standings tables per group, computed from match results
- [ ] Columns: #, Squadra, V, S, PF, PS, +/- — PF/PS hidden on mobile
- [ ] Top qualifying positions highlighted in orange
- [ ] Read-only bracket view with rounds as columns
- [ ] Completed bracket matches show scores, winners in bold
- [ ] Mobile: bracket rounds stack vertically
- [ ] Empty states for both sections when no data
- [ ] `npm run build` passes

**Verify:** `npm run build` → success; check standings computation and bracket rendering

**Steps:**

- [ ] **Step 1: Create `src/components/public/StandingsTable.tsx`**

Props: `groupName: string`, `standings: StandingsRow[]`, `qualifyCount?: number` (default 2 — for highlighting)

Table with columns: #, Squadra, V, S, PF (hidden `sm:table-cell`), PS (hidden `sm:table-cell`), +/-

Top `qualifyCount` rows get `bg-brand-orange/10` background and orange position number.

Point differential: green if positive, red if negative.

- [ ] **Step 2: Create `src/components/public/BracketView.tsx`**

Props: `matches: MatchWithTeams[]`

Groups matches by `bracket_round` and orders by `bracket_position`. Renders rounds as flex columns with match cards. Completed matches show scores, winner (higher score) in bold green.

Desktop: horizontal flex layout (rounds left to right).
Mobile: vertical stack with round headers ("Quarti di finale", "Semifinali", "Finale").

Round label mapping:
```typescript
const roundLabels: Record<BracketRound, string> = {
  round_of_16: 'Ottavi di finale',
  quarterfinal: 'Quarti di finale',
  semifinal: 'Semifinali',
  final: 'Finale',
}
```

- [ ] **Step 3: Wire into public torneo page**

In `src/app/(public)/torneo/page.tsx`:
- Section 2 (Classifiche): for each group in selected category, compute standings using `computeStandings()` and render `<StandingsTable>`. Filter to category (required — no "Tutte" for standings).
- Section 3 (Tabellone): filter bracket matches by category, render `<BracketView>`.
- Empty states: "Le classifiche saranno disponibili durante il torneo" / "Il tabellone sarà disponibile al termine dei gironi"

- [ ] **Step 4: Verify build**

```bash
npm run build
```

---

### Task 8: Final Integration, Polish & Verification

**Goal:** End-to-end testing, UI polish, and build verification.

**Files:**
- Potentially touch any files from previous tasks for fixes

**Acceptance Criteria:**
- [ ] Full admin workflow works: create groups → assign teams → generate matches → schedule → enter scores → generate bracket → play finals
- [ ] Public page shows calendar, standings, bracket correctly
- [ ] Live indicator works (admin toggles, public shows pulsing dot)
- [ ] Bracket advancement works (completing a bracket match puts winner in next round)
- [ ] All empty states render properly
- [ ] Mobile responsive on all 3 public sections
- [ ] `npm run build` passes cleanly

**Verify:**
```bash
npm run build
npm run dev
# Manual test: full tournament workflow
```

**Steps:**

- [ ] **Step 1: Test admin workflow end-to-end**
  - Create groups for Open category
  - Assign 4 teams to Group A, 4 to Group B
  - Generate group matches (should create 6+6=12 matches)
  - Schedule all matches with times
  - Enter scores for all group matches
  - Check that standings are correct
  - Generate 4-team bracket from standings
  - Verify crossover seeding
  - Complete semifinal matches, verify advancement
  - Complete final

- [ ] **Step 2: Test public page**
  - Open `/torneo` — calendar shows all matches
  - Filter by category
  - Check standings tables match admin scores
  - Check bracket shows correct advancement
  - Toggle a match to "live" in admin, verify pulsing dot on public page

- [ ] **Step 3: Test mobile responsiveness**
  - Check calendar cards on mobile viewport
  - Check standings table column hiding
  - Check bracket vertical stacking
  - Check sticky category pills

- [ ] **Step 4: Fix any issues found and run final build**

```bash
npm run build
```

- [ ] **Step 5: Commit all changes**

```bash
git add -A
git commit -m "feat: add tournament calendar, standings & bracket system

- New DB tables: groups, group_teams, matches (migration 009)
- Admin /admin/torneo: 3-tab interface (Gironi, Calendario, Tabellone)
- Public /torneo: live calendar, group standings, bracket view
- Standings computed from match results (wins → diff → scored)
- Live match indicator with pulsing red dot
- Bracket auto-generation from group standings with crossover seeding
- Winner auto-advancement on bracket match completion"
```
