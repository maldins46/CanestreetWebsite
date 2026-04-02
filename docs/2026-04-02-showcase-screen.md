# Showcase Screen Feature

## Context

The showcase screen is a dedicated public page (`/showcase`) displayed on a large PC monitor at the tournament venue. It shows live tournament information in a landscape-optimized layout, designed for constant display without user interaction.

**Problem:** No way to display live tournament information on a big screen for players and fans to consult.

**Goal:** Create an auto-refreshing showcase with multiple display modes controlled from the admin backoffice.

---

## Database Schema

### New Table: `showcase_modes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | text | Primary key, always `'default'` (single row) |
| `mode` | text | Current display mode: `'open' \| 'under' \| 'tpc_open' \| 'tpc_under' \| 'sponsors'` |
| `light_mode` | boolean | High-contrast white theme for sunlight visibility (default: `false`) |
| `updated_at` | timestamptz | Last mode change |
| `updated_by` | uuid, nullable | FK to admins(user_id) |

**Migration:** `supabase/migrations/011_showcase_mode.sql` + `012_showcase_light_mode.sql`

**RLS Policies:**
- **Public:** `SELECT` (everyone can read current mode)
- **Admins:** `UPDATE` via `is_admin()` function

---

## Light Mode ("Modalità Chioppo del Sole")

A high-contrast white theme designed for visibility under direct sunlight. When enabled, the showcase uses:
- White background instead of dark
- Dark text instead of white
- Light gray cards instead of dark surfaces
- Higher contrast for all UI elements

### Admin Toggle
Located on `/admin/showcase` page alongside the 5 mode buttons. Toggle switch to enable/disable.

### Implementation
- Theme passed as `theme` prop object to all showcase components
- Components use conditional Tailwind classes based on `theme.*` values
- Dark theme: `bg-court-dark`, `text-court-white`, `border-court-border`
- Light theme: `bg-white`, `text-gray-900`, `border-gray-300`

---

## Display Modes

---

## Admin Controls

### Location
`/admin/showcase` — added to sidebar navigation (between "Sponsor" and "Media")

### UI
- Current mode indicator with "Apri showcase" button to open the public page
- 5 large mode buttons with descriptions
- Mode switching happens client-side via Supabase client

### Usage
1. Navigate to `/admin/showcase`
2. Click a mode button to switch what displays on `/showcase`
3. Open `/showcase` in a new tab on the big screen

---

## Public Page (`/showcase`)

### Layout
- Full-screen, no navigation or footer (uses root layout, not public layout)
- Auto-refresh every 15 seconds
- Dark theme optimized for large displays

### Component Structure

#### Calendar (Open & Under modes)
- Shows all matches (group + bracket phases)
- **Auto-scroll to live match:** On mount and every refresh, if any match is `in_progress`, the calendar scrolls to center that match
- Phase labels: "Gir. A" for group matches, "Ottavi/Quarti/Semifinali/Finale" for bracket matches

#### Standings (Open & Under modes)
- Full-height right column (40%)
- Group standings computed client-side
- Under mode: Category carousel rotates every 20 seconds through U14 → U16 → U18

#### 3-Point Contest (tpc_open & tpc_under modes)
- Horizontal columns, one per round
- Table format: #, Giocatore, Punti
- **Auto-scroll to live player:** Centers the live player in their column
- Responsive column sizing: 1 column fills screen, 2 columns share space, 3+ columns fit as needed

#### Sponsors Mode
- Single large sponsor display, centered
- Rotates every 5 seconds with dot indicators
- Clickable if website URL exists

#### Sponsor Strip (All modes except sponsors)
- Horizontal scrolling strip at bottom (~10% height)
- Infinite scroll animation
- Grayscale logos, opacity 50%

---

## TypeScript Types

```typescript
export type ShowcaseMode = 'open' | 'under' | 'tpc_open' | 'tpc_under' | 'sponsors'

export interface ShowcaseModeRow {
  id: string
  mode: ShowcaseMode
  light_mode: boolean
  updated_at: string
  updated_by: string | null
}
```

---

## Key Files

### New Files
- `supabase/migrations/011_showcase_mode.sql` — Database table
- `supabase/migrations/012_showcase_light_mode.sql` — Light mode column
- `src/types/index.ts` — Add `ShowcaseMode` and `ShowcaseModeRow` types
- `src/app/admin/(protected)/showcase/page.tsx` — Admin control page
- `src/app/showcase/page.tsx` — Public showcase page (root level, no layout wrapper)
- `src/components/admin/AdminSidebar.tsx` — Added "Showcase" nav entry

### Modified Files
- (none)

---

## Verification Plan

1. **Admin page:** Navigate to `/admin/showcase`, verify all 5 mode buttons appear
2. **Mode switching:** Click each mode button, verify mode updates in DB and UI reflects change
3. **Public page:** Open `/showcase`, verify correct layout for each mode
4. **Auto-refresh:** Verify page updates every 15 seconds (check network or data changes)
5. **Calendar auto-scroll:** Start a match (set to `in_progress`), refresh showcase, verify it scrolls to center the live match
6. **Under carousel:** Switch to Under mode, verify category cycles every 20 seconds
7. **TPC auto-scroll:** Mark a player as `is_live`, verify TPC page scrolls to center them
8. **Sponsors mode:** Switch to Sponsors mode, verify single sponsor rotates every 5 seconds
9. **Sponsor strip:** Verify strip shows on all modes except Sponsors mode
10. **Light mode toggle:** Enable "Modalità Chioppo del Sole" in admin, verify showcase switches to white theme with high contrast
11. **Build:** Run `npm run build` to verify no TypeScript errors