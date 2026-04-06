-- ============================================================
-- Player contact + gender-aware categories
-- Adds email, phone, city, is_vice_captain to players.
-- Renames category IDs to include gender: open → open_m, u14 → u14_m, etc.
-- Adds new open_f (Open Femminile) category.
-- Replaces register_team RPC with updated signature.
-- ============================================================

-- 1. Add new columns to players
alter table players
  add column email           text,
  add column phone           text,
  add column city            text,
  add column is_vice_captain boolean not null default false;

-- 2. Migrate existing category values BEFORE replacing the constraint
update teams   set category = 'open_m' where category = 'open';
update teams   set category = 'u14_m'  where category = 'u14';
update teams   set category = 'u16_m'  where category = 'u16';
update teams   set category = 'u18_m'  where category = 'u18';

update groups  set category = 'open_m' where category = 'open';
update groups  set category = 'u14_m'  where category = 'u14';
update groups  set category = 'u16_m'  where category = 'u16';
update groups  set category = 'u18_m'  where category = 'u18';

update matches set category = 'open_m' where category = 'open';
update matches set category = 'u14_m'  where category = 'u14';
update matches set category = 'u16_m'  where category = 'u16';
update matches set category = 'u18_m'  where category = 'u18';

-- 3. Replace the category check constraint
alter table teams drop constraint teams_category_check;
alter table teams add  constraint teams_category_check
  check (category in ('open_m', 'open_f', 'u14_m', 'u16_m', 'u18_m'));

-- 4. Replace register_team RPC
--    Removes separate p_captain_email / p_captain_phone params —
--    captain contact is now derived from the players array.
create or replace function register_team(
  p_edition_id uuid,
  p_name       text,
  p_category   text,   -- one of: open_m, open_f, u14_m, u16_m, u18_m
  p_players    jsonb   -- array: name, birth_date, codice_fiscale, instagram,
                       --   club, email, phone, city, is_captain, is_vice_captain
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
  v_captain_email     text;
  v_captain_phone     text;
begin
  select registration_open into v_registration_open
  from editions where id = p_edition_id;

  if not found then raise exception 'Edition not found'; end if;
  if not v_registration_open then raise exception 'Registrations are currently closed'; end if;

  -- Derive captain email + phone from the players array
  select v->>'email', v->>'phone'
    into v_captain_email, v_captain_phone
    from jsonb_array_elements(p_players) v
   where coalesce((v->>'is_captain')::boolean, false) = true
   limit 1;

  insert into teams (edition_id, name, category, captain_email, captain_phone)
  values (p_edition_id, p_name, p_category, v_captain_email, v_captain_phone)
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
