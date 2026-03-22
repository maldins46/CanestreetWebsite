# CanestreetWebsite

Tournament website built with Next.js 14, Tailwind CSS, and Supabase.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) — `brew install supabase/tap/supabase`

## Local development setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start local Supabase

Make sure Docker Desktop is running, then:

```bash
supabase start
```

This spins up a local Postgres database, Auth, and Storage. Migrations are applied automatically.

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with the values printed by `supabase start` (or run `supabase status -o env` to retrieve them again):

| Variable | Value from Supabase output |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `API URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` |

### 4. Start the dev server

```bash
npm run dev
```

App is available at [http://localhost:3000](http://localhost:3000).
Local Supabase Studio (database dashboard) is at [http://localhost:54323](http://localhost:54323).

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build + type check
npm run lint     # ESLint
npm run start    # Start production server (requires build first)

supabase start   # Start local Supabase stack
supabase stop    # Stop local Supabase stack (add --backup to preserve data)
supabase db reset  # Re-apply all migrations (resets data)
supabase status  # Show local URLs and keys
```

## Creating the first admin user

1. Open Supabase Studio at [http://127.0.0.1:54323](http://127.0.0.1:54323) → Authentication → Users → Add user
2. Run in the SQL editor (Studio → SQL Editor):

```sql
insert into admins (user_id, email, role)
values ('<auth-user-uuid>', 'you@example.com', 'superadmin');
```

3. Sign in at [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

## Storage (cover images)

The `media` bucket must be created manually:

1. Open Supabase Studio → Storage
2. Create a new bucket named `media`, set to **public**
