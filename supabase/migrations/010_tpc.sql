-- ============================================================
-- 010_tpc.sql — 3-Point Contest tables
-- ============================================================

-- One contest per edition+category (open or under)
create table tpc_contests (
  id          uuid primary key default uuid_generate_v4(),
  edition_id  uuid not null references editions(id) on delete cascade,
  category    text not null check (category in ('open', 'under')),
  created_at  timestamptz not null default now(),
  unique (edition_id, category)
);

create index tpc_contests_edition_idx on tpc_contests(edition_id);
alter table tpc_contests enable row level security;

create policy "tpc_contests_public_read"
  on tpc_contests for select using (true);
create policy "tpc_contests_admin_all"
  on tpc_contests for all using (is_admin()) with check (is_admin());

-- Players: participants in a contest (name only, admin-managed)
create table tpc_players (
  id          uuid primary key default uuid_generate_v4(),
  contest_id  uuid not null references tpc_contests(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create index tpc_players_contest_idx on tpc_players(contest_id);
alter table tpc_players enable row level security;

create policy "tpc_players_public_read"
  on tpc_players for select using (true);
create policy "tpc_players_admin_all"
  on tpc_players for all using (is_admin()) with check (is_admin());

-- Rounds: sequential rounds within a contest
create table tpc_rounds (
  id            uuid primary key default uuid_generate_v4(),
  contest_id    uuid not null references tpc_contests(id) on delete cascade,
  round_number  int not null,
  name          text not null,
  created_at    timestamptz not null default now(),
  unique (contest_id, round_number)
);

create index tpc_rounds_contest_idx on tpc_rounds(contest_id);
alter table tpc_rounds enable row level security;

create policy "tpc_rounds_public_read"
  on tpc_rounds for select using (true);
create policy "tpc_rounds_admin_all"
  on tpc_rounds for all using (is_admin()) with check (is_admin());

-- Entries: a player's participation in a specific round
create table tpc_entries (
  id            uuid primary key default uuid_generate_v4(),
  round_id      uuid not null references tpc_rounds(id) on delete cascade,
  player_id     uuid not null references tpc_players(id) on delete cascade,
  score         int,
  is_qualified  boolean not null default false,
  is_live       boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  unique (round_id, player_id)
);

create index tpc_entries_round_idx on tpc_entries(round_id);
create index tpc_entries_player_idx on tpc_entries(player_id);
alter table tpc_entries enable row level security;

create policy "tpc_entries_public_read"
  on tpc_entries for select using (true);
create policy "tpc_entries_admin_all"
  on tpc_entries for all using (is_admin()) with check (is_admin());
