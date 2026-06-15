-- ============================================================
-- Registration fixes:
-- 1. Drop consent_new_beetle (now a mandatory UI-only checkbox)
-- 2. Update register_team RPC: add p_schedule_notes, remove p_consent_new_beetle
-- ============================================================

-- 1. Drop the column (always true now that the checkbox is mandatory)
alter table teams
  drop column consent_new_beetle;

-- 2. Replace RPC with updated signature
create or replace function register_team(
  p_edition_id    uuid,
  p_name          text,
  p_category      text,
  p_players       jsonb,
  p_schedule_notes text default null
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
