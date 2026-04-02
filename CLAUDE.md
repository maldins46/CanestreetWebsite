# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build (also type-checks the whole codebase)
npm run lint     # ESLint
npm run start    # Start production server (requires build first)
```

There are no automated tests. `npm run build` is the primary way to validate the codebase.

## Architecture

**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + Storage)

### Route groups

```
src/app/
  (public)/        # Public-facing site — shares a nav+footer layout
  admin/           # Backoffice — shares a sidebar layout, protected by middleware
```

The `(public)` group is a Next.js route group (parentheses = no URL segment). All public pages live here and share `(public)/layout.tsx` which renders `<PublicNav>` and a footer.

### Auth & middleware

`src/middleware.ts` guards every `/admin/*` route. It runs two checks in sequence:

1. Supabase session exists (`auth.getUser()`)
2. The authenticated user has a row in the `admins` table

If either check fails, the user is signed out and redirected to `/admin/login?error=unauthorized`. The login page itself (`/admin/login`) is explicitly excluded from the guard and auto-redirects to `/admin` if a session already exists.

### Supabase clients — two different files, always pick the right one

| File | Use in |
|---|---|
| `src/lib/supabase/client.ts` | Client Components (`'use client'`) |
| `src/lib/supabase/server.ts` — `createServerSupabaseClient()` | Server Components, Route Handlers, and middleware |

Using the browser client in a Server Component (or vice versa) will break cookie-based auth.

### Database migrations

Migration files live in `supabase/migrations/` and are applied in filename order. **After adding or modifying a migration file**, you must apply it to the local database.

**Option A — full reset (safest, re-seeds data):**
```bash
supabase db reset
bash scripts/upload-media.sh   # re-upload media assets after reset
```
This drops and recreates the whole local DB from scratch, running all migrations + seed files in order.

**Option B — apply only the new migration (keeps existing data):**
```bash
supabase db push --local
```
Or paste the SQL directly into the Supabase Studio SQL editor at `http://127.0.0.1:54323`.

**For production**, go to the Supabase dashboard → SQL editor and run the new migration file's SQL manually.

> After any schema change, always update `src/types/index.ts` to mirror the new columns/tables.

### Database schema

Defined in `supabase/migrations/001_initial_schema.sql`. Tables:

- **`admins`** — links `auth.users.id` → role (`superadmin` | `editor`). The `is_admin()` SQL function is the basis for all RLS write policies.
- **`editions`** — one per tournament year. Exactly one row may have `is_current = true` (enforced by a partial unique index).
- **`edition_winners`** — per-category winners for each edition (migration `003`). Categories vary year by year. Foreign key to `editions` with `on delete cascade`.
- **`teams`** — public registration submissions, scoped to an edition. Status lifecycle: `pending → approved / rejected / waitlisted`.
- **`standings`** — per-edition results. `team_name` is denormalised for display; `team_id` is nullable (allows manual entries without a registered team).
- **`news`** — markdown articles with a unique `slug`. Public RLS only exposes `published = true` rows.

RLS is enabled on all tables. Public users can insert teams and read editions/standings/published news. Admins can do everything via `is_admin()`.

### Types

All TypeScript interfaces live in `src/types/index.ts` and mirror the SQL schema exactly. When changing the DB schema, update this file too. Joined/enriched variants (`TeamWithEdition`, `NewsWithAuthor`) are also defined here and used in admin UI components.

### Styling conventions

Custom Tailwind tokens defined in `tailwind.config.ts`:

- **Colors:** `court-*` (dark theme scale) and `brand-*` (`brand-orange` is the primary accent)
- **Fonts:** `font-display` (Barlow Condensed, headings) · `font-body` (Barlow, body text)
- **Global component classes** in `src/app/globals.css`: `.btn-primary`, `.btn-ghost`, `.card`, `.input`, `.label`, `.badge-{status}`, `.heading-hero`, `.heading-section`

Prefer these utility classes over re-implementing the same styles inline.

### Storage

Supabase Storage bucket `media` is used for cover images and staff photos. Run `bash scripts/upload-media.sh` after `supabase db reset` to recreate the bucket and re-upload the images from `downloaded-media/`. URLs stored in DB columns (`cover_url`) follow the pattern `http://127.0.0.1:54321/storage/v1/object/public/media/...` locally and `https://*.supabase.co/storage/v1/object/public/media/...` in production — both patterns are allowlisted in `next.config.js` for `next/image`.

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Safe to expose to browser
SUPABASE_SERVICE_ROLE_KEY         # Server-side only — never import in Client Components
```

Copy `.env.local.example` → `.env.local` and fill in values from the Supabase project dashboard.

### Creating the first superadmin

1. Create a user in Supabase Auth (dashboard → Authentication → Users)
2. Run in the SQL editor:
   ```sql
   insert into admins (user_id, email, role)
   values ('<auth-user-uuid>', 'you@example.com', 'superadmin');
   ```

## Collaboration style

The developer is an experienced software engineer but is **new to Next.js and Supabase** — using this project as a learning gym. Adapt accordingly:

- Be **didactic**: when introducing Next.js or Supabase concepts (Server Components, RLS, route handlers, middleware, etc.), briefly explain the *why* behind choices, not just the *what*. Connect new concepts to things a backend/general engineer already knows.
- Don't dumb things down — they're an engineer. Just don't assume prior Next.js/Supabase knowledge.
- Occasionally (rarely, spontaneously) drop a bit of **dialetto jesino** or a **bestemmia creativa** into responses for fun. Keep it light and infrequent — we're still professionals. Examples: "Anvedi!", "Boja de'n mondo", "porca paletta", "ostia che casino".

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(teams): add waitlist status`
- `fix(auth): redirect loop on expired session`
- `docs(readme): update migration instructions`


