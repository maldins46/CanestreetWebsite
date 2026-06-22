-- ============================================================
-- Per-category registration settings
-- ============================================================

create table edition_category_settings (
  id                uuid        primary key default uuid_generate_v4(),
  edition_id        uuid        not null references editions(id) on delete cascade,
  category          text        not null check (category in ('open_m','open_f','u14_m','u16_m','u18_m')),
  registration_open boolean     not null default true,
  max_teams         int,
  created_at        timestamptz not null default now(),
  unique (edition_id, category)
);

alter table edition_category_settings enable row level security;

create policy "public read" on edition_category_settings
  for select using (true);

create policy "admin write" on edition_category_settings
  for all using (is_admin());

-- Returns non-rejected team counts per category for an edition, bypassing RLS.
-- Used by the public registration page to show accurate capacity info.
create or replace function get_category_team_counts(p_edition_id uuid)
returns table (category text, count bigint)
language sql
security definer
set search_path = public
as $$
  select category, count(*) as count
  from teams
  where edition_id = p_edition_id
    and status != 'rejected'
  group by category
$$;

-- Update register_team() to enforce per-category settings
create or replace function register_team(
  p_edition_id     uuid,
  p_name           text,
  p_category       text,
  p_players        jsonb,
  p_schedule_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration_open boolean;
  v_cat_open          boolean;
  v_max_teams         int;
  v_team_count        bigint;
  v_team_id           uuid;
  v_player            jsonb;
  v_idx               int := 0;
  v_captain_email     text;
  v_captain_phone     text;
begin
  select registration_open into v_registration_open
  from editions where id = p_edition_id;

  if not found then raise exception 'Edition not found'; end if;
  if not v_registration_open then raise exception 'Registrations are currently closed'; end if;

  -- Per-category check: skip entirely if no settings row exists for this category
  select registration_open, max_teams
    into v_cat_open, v_max_teams
    from edition_category_settings
   where edition_id = p_edition_id and category = p_category;

  if found then
    if not v_cat_open then
      raise exception 'Registrations are currently closed for this category';
    end if;
    if v_max_teams is not null then
      select count(*) into v_team_count
        from teams
       where edition_id = p_edition_id
         and category = p_category
         and status != 'rejected';
      if v_team_count >= v_max_teams then
        raise exception 'Maximum number of teams reached for this category';
      end if;
    end if;
  end if;

  select v->>'email', v->>'phone'
    into v_captain_email, v_captain_phone
    from jsonb_array_elements(p_players) v
   where coalesce((v->>'is_captain')::boolean, false) = true
   limit 1;

  insert into teams (edition_id, name, category, captain_email, captain_phone, schedule_notes)
  values (p_edition_id, p_name, p_category, v_captain_email, v_captain_phone, p_schedule_notes)
  returning id into v_team_id;

  for v_player in select * from jsonb_array_elements(p_players)
  loop
    insert into players (
      team_id, name, birth_date, codice_fiscale, instagram, club,
      email, phone, city, is_captain, is_vice_captain, sort_order
    )
    values (
      v_team_id,
      v_player->>'name',
      (v_player->>'birth_date')::date,
      upper(v_player->>'codice_fiscale'),
      nullif(v_player->>'instagram', ''),
      nullif(v_player->>'club', ''),
      nullif(v_player->>'email', ''),
      nullif(v_player->>'phone', ''),
      nullif(v_player->>'city', ''),
      coalesce((v_player->>'is_captain')::boolean, false),
      coalesce((v_player->>'is_vice_captain')::boolean, false),
      v_idx
    );
    v_idx := v_idx + 1;
  end loop;

  return v_team_id;
end;
$$;
