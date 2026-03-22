-- ============================================================
-- Canestreet 3x3 Tournament — Database Schema
-- Run this in the Supabase SQL editor to set up all tables
-- ============================================================

-- Enable UUID extension (already enabled on Supabase by default)
create extension if not exists "uuid-ossp";

-- ============================================================
-- ADMINS
-- Links Supabase auth users to admin roles
-- ============================================================
create table admins (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text not null,
  role        text not null default 'editor' check (role in ('superadmin', 'editor')),
  created_at  timestamptz not null default now(),
  unique(user_id)
);

-- ============================================================
-- EDITIONS
-- Each year's tournament instance
-- ============================================================
create table editions (
  id          uuid primary key default uuid_generate_v4(),
  year        int  not null unique,
  title       text not null,               -- e.g. "Summer Edition 2025"
  subtitle    text,
  description text,
  winner_name text,
  is_current  boolean not null default false,
  cover_url   text,                        -- Supabase Storage URL
  created_at  timestamptz not null default now()
);

-- Only one edition can be current
create unique index one_current_edition on editions(is_current) where is_current = true;

-- ============================================================
-- TEAMS
-- Registrations submitted via the public form
-- ============================================================
create table teams (
  id            uuid primary key default uuid_generate_v4(),
  edition_id    uuid not null references editions(id) on delete cascade,
  name          text not null,
  captain_name  text not null,
  captain_email text not null,
  captain_phone text,
  player2_name  text not null,
  player3_name  text not null,
  player4_name  text,                       -- optional 4th player (sub)
  notes         text,
  status        text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected', 'waitlisted')),
  created_at    timestamptz not null default now()
);

-- ============================================================
-- STANDINGS
-- Per-edition standings table
-- ============================================================
create table standings (
  id          uuid primary key default uuid_generate_v4(),
  edition_id  uuid not null references editions(id) on delete cascade,
  team_id     uuid references teams(id) on delete set null,
  team_name   text not null,               -- denormalised for display
  played      int  not null default 0,
  won         int  not null default 0,
  lost        int  not null default 0,
  points_for  int  not null default 0,
  points_against int not null default 0,
  rank        int,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- NEWS
-- Articles and updates written in the backoffice
-- ============================================================
create table news (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  slug        text not null unique,
  excerpt     text,
  body        text not null,               -- Markdown content
  cover_url   text,
  author_id   uuid references admins(id) on delete set null,
  published   boolean not null default false,
  published_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index news_slug_idx on news(slug);
create index news_published_idx on news(published, published_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- Public can read approved/published data.
-- Only admins can write anything.
-- ============================================================

alter table editions  enable row level security;
alter table teams     enable row level security;
alter table standings enable row level security;
alter table news      enable row level security;
alter table admins    enable row level security;

-- Helper: check if current user is an admin
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from admins where user_id = auth.uid()
  );
$$;

-- Editions: public read, admin write
create policy "editions_public_read"  on editions for select using (true);
create policy "editions_admin_insert" on editions for insert with check (is_admin());
create policy "editions_admin_update" on editions for update using (is_admin());
create policy "editions_admin_delete" on editions for delete using (is_admin());

-- Teams: public insert (registration), admin read/update
create policy "teams_public_insert"   on teams for insert with check (true);
create policy "teams_admin_read"      on teams for select using (is_admin());
create policy "teams_admin_update"    on teams for update using (is_admin());
create policy "teams_admin_delete"    on teams for delete using (is_admin());

-- Standings: public read, admin write
create policy "standings_public_read"  on standings for select using (true);
create policy "standings_admin_insert" on standings for insert with check (is_admin());
create policy "standings_admin_update" on standings for update using (is_admin());
create policy "standings_admin_delete" on standings for delete using (is_admin());

-- News: public can read published, admins read all
create policy "news_public_read"  on news for select using (published = true);
create policy "news_admin_read"   on news for select using (is_admin());
create policy "news_admin_insert" on news for insert with check (is_admin());
create policy "news_admin_update" on news for update using (is_admin());
create policy "news_admin_delete" on news for delete using (is_admin());

-- Admins: only admins can read the admins table
create policy "admins_self_read"   on admins for select using (user_id = auth.uid() or is_admin());
create policy "admins_super_write" on admins for insert with check (
  exists (select 1 from admins where user_id = auth.uid() and role = 'superadmin')
);

-- ============================================================
-- STORAGE BUCKETS
-- Run this after creating the schema
-- ============================================================

-- insert into storage.buckets (id, name, public) values ('media', 'media', true);

-- Storage RLS (uncomment and run separately in SQL editor):
-- create policy "media_public_read" on storage.objects for select using (bucket_id = 'media');
-- create policy "media_admin_upload" on storage.objects for insert with check (
--   bucket_id = 'media' and is_admin()
-- );

-- ============================================================
-- SEED DATA (optional — delete before production)
-- ============================================================

-- Insert a sample current edition
insert into editions (year, title, subtitle, is_current)
values (2025, 'Canestreet Summer 2025', '3x3 Street Basketball Tournament', true);
