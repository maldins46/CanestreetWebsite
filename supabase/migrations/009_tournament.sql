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
