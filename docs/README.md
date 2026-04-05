# Canestreet Website User Guide

This guide covers all features of the Canestreet 3×3 tournament website — both the public-facing site and the admin backoffice.

## Features

### [1. Tournament Management](01-tournament-management.md)
The core tournament system: group phases, live match scheduling, standings, and elimination brackets.

**For visitors:**
- View live match calendar with current scores and team matchups
- Track group standings updated in real-time
- Follow the elimination bracket from quarterfinals to the championship

**For admins:**
- Create groups and assign teams to each group
- Schedule matches with dates and times
- Enter live scores and manage match status (scheduled / live / completed)
- Auto-generate brackets from final standings
- Override bracket teams and set up the tournament tree

---

### [2. 3-Point Contest](02-three-point-contest.md)
A shooting competition running alongside the tournament, with qualifications and finals.

**For visitors:**
- Watch live participant scores as they shoot
- See who's advancing to the next round (marked as "Qualificato")
- Follow the live shooter with a pulsing indicator

**For admins:**
- Create contests per category (Open, Under)
- Add players and organize them into rounds (e.g., Qualifications → Semifinals → Finals)
- Set live scores and mark qualifiers
- Broadcast the live shooter status to the public page

---

### [3. Showcase Screen](03-showcase-screen.md)
A dedicated full-screen display optimized for large monitors at the tournament venue.

**For venues:**
- Display live match calendars with auto-scroll to the active game
- Show real-time group standings and brackets
- Rotate through 3-Point Contest rounds with auto-scrolling to live players
- Show sponsor logos and rotate between sponsors
- High-contrast "Sunlight Mode" for outdoor visibility

**For admins:**
- Switch between display modes (Tournament Open/Under, 3-Point Contest, Sponsors)
- Toggle sunlight-friendly theme for outdoor displays
- Page auto-refreshes every 15 seconds — set it and forget it

---

### [4. Team Registration](04-team-registration.md)
Team sign-up and management system for each tournament edition.

**For visitors:**
- Register a team for the tournament
- Provide team name, roster, and category (Open, U18, U16, U14)
- Receive confirmation once submitted

**For admins:**
- View all team registrations (approved, pending, rejected, waitlisted)
- Approve or reject teams
- Manage the waitlist
- Export team rosters

---

## Architecture

- **Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase (Postgres + Auth + Storage)
- **Public site:** Responsive design for mobile and desktop, optimized for both fans and participants
- **Backoffice:** Protected admin dashboard for tournament operators
- **Database:** All data stored in Postgres with row-level security (RLS) enforced at the database level
- **Real-time:** Admin changes (scores, mode switches) are reflected on public pages without page reload

## For developers

If you're exploring the codebase:

- See `CLAUDE.md` for setup instructions, stack details, and database schema
- Each feature guide above includes info about public pages, admin pages, and key implementation patterns
- Database migrations live in `supabase/migrations/` — check there for the authoritative schema

---

**Last updated:** April 2026
