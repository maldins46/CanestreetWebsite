-- ============================================================
-- Registration Revamp
-- Adds players table, registration_open toggle on editions,
-- and an atomic register_team RPC function.
-- ============================================================

-- Add registration_open toggle to editions
alter table editions add column registration_open boolean not null default false;

-- ============================================================
-- PLAYERS
-- Per-player data for each registered team
-- ============================================================
create table players (
  id              uuid primary key default uuid_generate_v4(),
  team_id         uuid not null references teams(id) on delete cascade,
  name            text not null,
  birth_date      date not null,
  codice_fiscale  text not null,
  instagram       text,
  club            text,            -- used for under categories (società)
  is_captain      boolean not null default false,
  sort_order      int  not null default 0,
  created_at      timestamptz not null default now()
);

alter table players enable row level security;

-- Public can insert players via the register_team RPC (security definer bypasses this)
-- Admins can read/update/delete
create policy "players_public_insert" on players for insert with check (true);
create policy "players_admin_read"    on players for select using (is_admin());
create policy "players_admin_update"  on players for update using (is_admin());
create policy "players_admin_delete"  on players for delete using (is_admin());

-- ============================================================
-- Teams table changes
-- Add category and schedule_notes; make legacy player name
-- columns nullable for backward compat with existing rows.
-- ============================================================
alter table teams add column category text not null default 'open'
  check (category in ('open', 'u14', 'u16', 'u18'));

alter table teams add column schedule_notes text;

-- Legacy flat-player columns — no longer required for new registrations
alter table teams alter column captain_name  drop not null;
alter table teams alter column player2_name  drop not null;
alter table teams alter column player3_name  drop not null;

-- ============================================================
-- register_team RPC
-- Atomically inserts a team + its players in one transaction.
-- Uses security definer so public users can write to players
-- without a direct RLS insert policy.
-- ============================================================
create or replace function register_team(
  p_edition_id    uuid,
  p_name          text,
  p_category      text,
  p_captain_email text,
  p_captain_phone text,
  p_schedule_notes text,
  p_players       jsonb   -- array of player objects
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration_open boolean;
  v_team_id           uuid;
  v_player            jsonb;
  v_idx               int := 0;
begin
  -- Guard: registrations must be open for this edition
  select registration_open into v_registration_open
  from editions where id = p_edition_id;

  if not found then
    raise exception 'Edition not found';
  end if;

  if not v_registration_open then
    raise exception 'Registrations are currently closed';
  end if;

  -- Insert the team
  insert into teams (edition_id, name, category, captain_email, captain_phone, schedule_notes)
  values (p_edition_id, p_name, p_category, p_captain_email, p_captain_phone, p_schedule_notes)
  returning id into v_team_id;

  -- Insert each player
  for v_player in select * from jsonb_array_elements(p_players)
  loop
    insert into players (team_id, name, birth_date, codice_fiscale, instagram, club, is_captain, sort_order)
    values (
      v_team_id,
      v_player->>'name',
      (v_player->>'birth_date')::date,
      upper(v_player->>'codice_fiscale'),
      nullif(v_player->>'instagram', ''),
      nullif(v_player->>'club', ''),
      coalesce((v_player->>'is_captain')::boolean, false),
      v_idx
    );
    v_idx := v_idx + 1;
  end loop;

  return v_team_id;
end;
$$;
