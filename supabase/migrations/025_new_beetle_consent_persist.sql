-- Ensure consent_new_beetle is always persisted as true on new registrations.
-- The register_team RPC in 022 omitted the column, relying on the column default,
-- which is false in production. This migration:
--   1. Hardens the column default to true.
--   2. Replaces register_team to explicitly insert true (no dependency on the default).

-- 1. Harden column default
alter table teams alter column consent_new_beetle set default true;

-- 2. Replace register_team RPC (same signature as 022, only teams insert changes)
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

  -- Explicitly set consent_new_beetle = true (mandatory checkbox in UI)
  insert into teams (edition_id, name, category, captain_email, captain_phone, schedule_notes, consent_new_beetle)
  values (p_edition_id, p_name, p_category, v_captain_email, v_captain_phone, p_schedule_notes, true)
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
