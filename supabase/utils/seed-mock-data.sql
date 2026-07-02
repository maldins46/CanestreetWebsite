-- seed-mock-data.sql
--
-- Manual dev utility — NOT a migration. Never applied by `supabase db reset`
-- or `supabase db push --local` (those only run files in supabase/migrations/).
--
-- Seeds mock teams + players + sponsors for the current edition
-- (editions.is_current = true), all teams status='approved':
--   u14_m: 12   u16_m: 16   u18_m: 12   open_m: 12   open_f: 0
-- Plus 20 sponsors (no logo images).
-- Plus 20 3-Point Contest entrants for 'under' and 20 for 'open', each with 2 rounds:
--   'Qualificazioni' (all 20 players; first half scored, second half not yet scored)
--   'Finals' (empty)
-- Plus gironi (groups), teams filled in order (A first, then B, ...):
--   u16_m: A, B, C, D (4 groups)   u14_m/u18_m/open_m: A, B, C (3 groups)   open_f: none
-- Plus round-robin group-phase matches for every girone, scheduled 14-16 July 2026
-- between 15:00 and 24:00, each at a distinct time (non-open: 5 min apart, 15:00-16:35;
-- open_m: 10 min apart, always from 18:00). All 14 July matches are 'completed' with a
-- random score (as if day 1 already happened); 15-16 July matches are still 'scheduled'
-- with no score.
-- Plus empty final-stage bracket matches (quarterfinal -> semifinal -> final, no
-- teams/scores yet) for u14_m/u16_m/u18_m/open_m, scheduled on 17 July 2026
-- (open_m again after 18:00).
-- Plus 6 calendar events (30-min slots): 3PT Qualificazioni/Finals for under+open,
-- and the two exhibition slots (Lunatics dance school, Cantanti Emergenti).
--
-- Run against local Supabase (requires `supabase start`):
--   supabase db query --local -f supabase/utils/seed-mock-data.sql
-- (or, if you have psql installed:
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/utils/seed-mock-data.sql)
--
-- Re-running adds another batch (no uniqueness constraint on team/sponsor/tpc_player/group name).
-- To fully wipe prior mock data first:
--   supabase db query --local "delete from teams where captain_email like '%@mockmail.test';"
--   supabase db query --local "delete from sponsors where name like 'Sponsor Mock %';"
--   supabase db query --local "delete from groups where edition_id = (select id from editions where is_current=true) and category in ('u14_m','u16_m','u18_m','open_m');"
--   supabase db query --local "delete from matches where edition_id = (select id from editions where is_current=true) and category in ('u14_m','u16_m','u18_m','open_m');"
--   supabase db query --local "delete from events where edition_id = (select id from editions where is_current=true) and (name like '%3-Point Contest%' or name like 'Esibizione%');"
-- (deleting teams cascades to players and group_teams rows via on delete cascade, but NOT to
-- matches — matches.team_home_id/team_away_id use `on delete set null`, so the matches delete
-- above is required too, which also clears the empty-of-teams bracket matches)
-- Note: mock 3-Point Contest entrants have no distinguishing marker (tpc_players is
-- name-only) and reuse the edition's real 'under'/'open' contest if one already exists —
-- remove them manually in Studio if needed, there's no safe bulk-delete query for them.

do $$
declare
  v_edition_id      uuid;
  v_team_id         uuid;
  v_category        text;
  v_count           int;
  v_categories      text[] := array['u14_m','u16_m','u18_m','open_m'];
  v_counts          int[]  := array[12,16,12,12];
  v_group_counts    int[]  := array[3,4,3,3];
  v_birth_ranges    date[][] := array[
    array[date '2012-01-01', date '2013-12-31'],  -- u14_m
    array[date '2010-01-01', date '2011-12-31'],  -- u16_m
    array[date '2008-01-01', date '2009-12-31'],  -- u18_m
    array[date '1990-01-01', date '2006-12-31']   -- open_m
  ];
  v_range_lo        date;
  v_range_hi        date;
  v_team_ids        uuid[];
  v_group_count     int;
  v_group_id        uuid;
  v_group_size      int;
  v_group_remainder int;
  v_next_team_idx   int;
  g int;
  v_group_count_total int := 0;
  v_group_team_count  int := 0;
  v_group_team_ids    uuid[];
  v_is_open            boolean;
  v_nonopen_counter    int := 0;   -- global slot counter for non-open group matches (10 min apart, from 15:00)
  v_open_counter       int := 0;   -- global slot counter for open_m group matches (10 min apart, from 18:00)
  v_match_slot         int;
  v_match_date         date;
  v_match_time         time;
  v_scheduled_at       timestamptz;
  v_match_status       text;
  v_score_home         int;
  v_score_away         int;
  v_home_idx           int;
  v_away_idx           int;
  v_group_match_idx    int;
  v_group_match_total  int;
  v_group_dates        date[] := array[date '2026-07-14', date '2026-07-15', date '2026-07-16'];
  v_group_match_count  int := 0;
  v_bracket_categories text[] := array['u14_m','u16_m','u18_m','open_m'];
  -- naive (no tz) local Italian wall-clock times — converted to timestamptz via
  -- `at time zone 'Europe/Rome'` at the point of use, since the DB session runs UTC
  -- and a bare `timestamptz '...'` literal would otherwise be parsed as UTC, not local time.
  v_bracket_bases      timestamp[] := array[
    timestamp '2026-07-17 10:00:00',  -- u14_m
    timestamp '2026-07-17 11:30:00',  -- u16_m
    timestamp '2026-07-17 13:00:00',  -- u18_m
    timestamp '2026-07-17 18:00:00'   -- open_m (must stay after 18:00)
  ];
  v_bracket_base       timestamp;
  v_bracket_naive       timestamp;
  v_bracket_round_names text[] := array['final','semifinal','quarterfinal'];  -- built in this (reversed) order so next_match_id can point forward
  v_bracket_round       text;
  v_prev_round_ids      uuid[];
  v_cur_round_ids        uuid[];
  v_bracket_match_id    uuid;
  v_next_match_id       uuid;
  v_next_match_slot     text;
  v_bracket_sort        int;
  v_bracket_match_count int := 0;
  ri int;
  pos int;
  v_first_names     text[] := array['Marco','Luca','Andrea','Matteo','Alessandro','Davide','Simone','Federico','Riccardo','Giovanni','Francesco','Lorenzo','Tommaso','Gabriele','Nicolo','Edoardo'];
  v_last_names      text[] := array['Rossi','Bianchi','Ferrari','Russo','Colombo','Ricci','Marino','Greco','Bruno','Gallo','Conti','De Luca','Costa','Giordano','Mancini','Rizzo'];
  v_cities          text[] := array['Jesi','Ancona','Falconara','Senigallia','Chiaravalle','Fabriano','Osimo','Castelfidardo'];
  v_tiers           text[] := array['gold','silver','bronze'];  -- no 'main' for mock data
  v_players_per_team int   := 4;  -- registration form caps rosters at 4 (captain, vice-captain, 2 others)
  v_tpc_categories  text[] := array['under','open'];
  v_tpc_contest_id  uuid;
  v_tpc_category    text;
  v_tpc_player_id   uuid;
  v_tpc_player_ids  uuid[];
  v_qual_round_id   uuid;
  i int;
  t int;
  p int;
  v_team_count int := 0;
  v_player_count int := 0;
  v_sponsor_count int := 0;
  v_tpc_player_count int := 0;
begin
  select id into v_edition_id from editions where is_current = true limit 1;
  if v_edition_id is null then
    raise exception 'No current edition found (editions.is_current = true). Aborting.';
  end if;

  -- ============================================================
  -- Sponsors (global, not scoped to an edition)
  -- ============================================================
  for i in 1..20 loop
    insert into sponsors (name, tier, sort_order)
    values ('Sponsor Mock ' || i, v_tiers[1 + ((i - 1) % 3)], i);
    v_sponsor_count := v_sponsor_count + 1;
  end loop;

  -- ============================================================
  -- Teams + players
  -- ============================================================
  for i in 1..array_length(v_categories, 1) loop
    v_category := v_categories[i];
    v_count    := v_counts[i];
    v_range_lo := v_birth_ranges[i][1];
    v_range_hi := v_birth_ranges[i][2];
    v_team_ids := array[]::uuid[];
    v_is_open  := (v_category = 'open_m');

    for t in 1..v_count loop
      insert into teams (edition_id, name, category, captain_email, captain_phone, status)
      values (
        v_edition_id,
        upper(v_category) || ' Team ' || lpad(t::text, 2, '0'),
        v_category,
        lower(v_category) || '.team' || lpad(t::text, 2, '0') || '@mockmail.test',
        '333' || lpad((1000000 + (i * 1000) + t)::text, 7, '0'),
        'approved'
      )
      returning id into v_team_id;
      v_team_count := v_team_count + 1;
      v_team_ids := array_append(v_team_ids, v_team_id);

      for p in 1..v_players_per_team loop
        insert into players (team_id, name, birth_date, codice_fiscale, club, city, is_captain, is_vice_captain, sort_order)
        values (
          v_team_id,
          v_first_names[1 + floor(random() * array_length(v_first_names, 1))::int] || ' ' ||
            v_last_names[1 + floor(random() * array_length(v_last_names, 1))::int],
          v_range_lo + floor(random() * (v_range_hi - v_range_lo + 1))::int,
          upper(substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
          'ASD Mock ' || lpad(t::text, 2, '0'),
          v_cities[1 + floor(random() * array_length(v_cities, 1))::int],
          (p = 1),
          (p = 2),
          p
        );
        v_player_count := v_player_count + 1;
      end loop;
    end loop;

    -- Gironi (groups): fill A first, then B, etc. — group.name is just the
    -- letter, the admin/public UI prefixes "Girone" itself when displaying it.
    v_group_count := v_group_counts[i];
    v_next_team_idx := 1;
    for g in 1..v_group_count loop
      v_group_size      := v_count / v_group_count;
      v_group_remainder := v_count % v_group_count;
      if g <= v_group_remainder then
        v_group_size := v_group_size + 1;
      end if;

      insert into groups (edition_id, category, name, sort_order)
      values (v_edition_id, v_category, chr(64 + g), g)
      returning id into v_group_id;
      v_group_count_total := v_group_count_total + 1;

      v_group_team_ids := array[]::uuid[];
      for t in 1..v_group_size loop
        insert into group_teams (group_id, team_id, seed)
        values (v_group_id, v_team_ids[v_next_team_idx], t);
        v_group_team_ids := array_append(v_group_team_ids, v_team_ids[v_next_team_idx]);
        v_next_team_idx := v_next_team_idx + 1;
        v_group_team_count := v_group_team_count + 1;
      end loop;

      -- Round-robin matches within this girone (every possible pairing).
      -- Matches on the first day (14 July) are already 'completed' with a random
      -- score, as if the tournament is mid-way through; the 15th/16th are still
      -- 'scheduled' with no score — a clean past/future split, not scattered.
      v_group_match_idx := 0;
      v_group_match_total := v_group_size * (v_group_size - 1) / 2;
      for v_home_idx in 1..v_group_size loop
        for v_away_idx in v_home_idx + 1..v_group_size loop
          if v_is_open then
            v_match_slot := v_open_counter;
            v_match_date := v_group_dates[1 + (v_match_slot / 6)];
            v_match_time := time '18:00' + ((v_match_slot % 6) * interval '10 minutes');
            v_open_counter := v_open_counter + 1;
          else
            v_match_slot := v_nonopen_counter;
            v_match_date := v_group_dates[1 + (v_match_slot / 20)];
            -- 5 min apart, 20/day keeps every slot before 18:00 (15:00-16:35), no overlap with open_m's 18:00+ slots
            v_match_time := time '15:00' + ((v_match_slot % 20) * interval '5 minutes');
            v_nonopen_counter := v_nonopen_counter + 1;
          end if;
          v_scheduled_at := (v_match_date + v_match_time) at time zone 'Europe/Rome';

          if v_match_date = v_group_dates[1] then
            v_match_status := 'completed';
            v_score_home := 12 + floor(random() * 10)::int;
            v_score_away := 12 + floor(random() * 10)::int;
            if v_score_home = v_score_away then
              v_score_away := v_score_away + 1;
            end if;
          else
            v_match_status := 'scheduled';
            v_score_home := null;
            v_score_away := null;
          end if;

          insert into matches (
            edition_id, category, phase, group_id,
            team_home_id, team_away_id, score_home, score_away,
            scheduled_at, status, sort_order
          ) values (
            v_edition_id, v_category, 'group', v_group_id,
            v_group_team_ids[v_home_idx], v_group_team_ids[v_away_idx], v_score_home, v_score_away,
            v_scheduled_at, v_match_status, v_group_match_idx
          );

          v_group_match_idx := v_group_match_idx + 1;
          v_group_match_count := v_group_match_count + 1;
        end loop;
      end loop;
    end loop;
  end loop;

  -- ============================================================
  -- 3-Point Contest entrants (get-or-create the contest per category,
  -- so we don't clobber a contest that already has real entrants) +
  -- 'Qualificazioni' (all players, half scored) and empty 'Finals' rounds
  -- ============================================================
  for i in 1..array_length(v_tpc_categories, 1) loop
    v_tpc_category := v_tpc_categories[i];
    v_tpc_player_ids := array[]::uuid[];

    insert into tpc_contests (edition_id, category)
    values (v_edition_id, v_tpc_category)
    on conflict (edition_id, category) do update set category = excluded.category
    returning id into v_tpc_contest_id;

    for p in 1..20 loop
      insert into tpc_players (contest_id, name)
      values (
        v_tpc_contest_id,
        v_first_names[1 + floor(random() * array_length(v_first_names, 1))::int] || ' ' ||
          v_last_names[1 + floor(random() * array_length(v_last_names, 1))::int]
      )
      returning id into v_tpc_player_id;
      v_tpc_player_ids := array_append(v_tpc_player_ids, v_tpc_player_id);
      v_tpc_player_count := v_tpc_player_count + 1;
    end loop;

    insert into tpc_rounds (contest_id, round_number, name)
    values (v_tpc_contest_id, 1, 'Qualificazioni')
    on conflict (contest_id, round_number) do update set name = excluded.name
    returning id into v_qual_round_id;

    insert into tpc_rounds (contest_id, round_number, name)
    values (v_tpc_contest_id, 2, 'Finals')
    on conflict (contest_id, round_number) do update set name = excluded.name;

    -- Qualificazioni: all 20 entered, first half already scored, second half not yet
    for p in 1..20 loop
      insert into tpc_entries (round_id, player_id, score, sort_order)
      values (
        v_qual_round_id,
        v_tpc_player_ids[p],
        case when p <= 10 then floor(random() * 26)::int else null end,
        p
      );
    end loop;
    -- Finals round stays empty
  end loop;

  -- ============================================================
  -- Final-stage bracket matches: quarterfinal -> semifinal -> final,
  -- empty (no teams, no scores), one bracket per category, scheduled
  -- 17 July 2026. Mirrors the "Genera tabellone vuoto" logic in
  -- TournamentBracket.tsx with a fixed 8-team (quarterfinal-start) format.
  -- ============================================================
  for i in 1..array_length(v_bracket_categories, 1) loop
    v_category      := v_bracket_categories[i];
    v_bracket_base  := v_bracket_bases[i];
    v_prev_round_ids := array[]::uuid[];
    v_bracket_sort  := 0;

    for ri in 0..2 loop  -- 0: final, 1: semifinal, 2: quarterfinal (built in this order to link next_match_id forward)
      v_bracket_round := v_bracket_round_names[ri + 1];
      v_cur_round_ids := array[]::uuid[];

      for pos in 0..(2 ^ ri)::int - 1 loop
        if v_prev_round_ids is not null and array_length(v_prev_round_ids, 1) > 0 then
          v_next_match_id   := v_prev_round_ids[1 + (pos / 2)];
          v_next_match_slot := case when pos % 2 = 0 then 'home' else 'away' end;
        else
          v_next_match_id   := null;
          v_next_match_slot := null;
        end if;

        v_bracket_naive := case v_bracket_round
          when 'quarterfinal' then v_bracket_base + (pos * interval '10 minutes')
          when 'semifinal'    then v_bracket_base + interval '40 minutes' + (pos * interval '10 minutes')
          else                     v_bracket_base + interval '70 minutes'  -- final
        end;
        v_scheduled_at := v_bracket_naive at time zone 'Europe/Rome';

        insert into matches (
          edition_id, category, phase, bracket_round, bracket_position,
          next_match_id, next_match_slot, team_home_id, team_away_id,
          status, sort_order, scheduled_at
        ) values (
          v_edition_id, v_category, 'bracket', v_bracket_round, pos,
          v_next_match_id, v_next_match_slot, null, null,
          'scheduled', v_bracket_sort, v_scheduled_at
        )
        returning id into v_bracket_match_id;

        v_cur_round_ids := array_append(v_cur_round_ids, v_bracket_match_id);
        v_bracket_sort  := v_bracket_sort + 1;
        v_bracket_match_count := v_bracket_match_count + 1;
      end loop;

      v_prev_round_ids := v_cur_round_ids;
    end loop;
  end loop;

  -- ============================================================
  -- Calendar events (30-min slots)
  -- ============================================================
  insert into events (edition_id, name, scheduled_at, status, sort_order) values
    (v_edition_id, '3-Point Contest — Qualificazioni Under', (timestamp '2026-07-14 19:00:00' at time zone 'Europe/Rome'), 'scheduled', 100),
    (v_edition_id, '3-Point Contest — Qualificazioni Open',  (timestamp '2026-07-14 19:30:00' at time zone 'Europe/Rome'), 'scheduled', 101),
    (v_edition_id, '3-Point Contest — Finals Under',         (timestamp '2026-07-15 19:00:00' at time zone 'Europe/Rome'), 'scheduled', 102),
    (v_edition_id, '3-Point Contest — Finals Open',          (timestamp '2026-07-15 19:30:00' at time zone 'Europe/Rome'), 'scheduled', 103),
    (v_edition_id, 'Esibizione scuola di danza Lunatics',    (timestamp '2026-07-16 19:00:00' at time zone 'Europe/Rome'), 'scheduled', 104),
    (v_edition_id, 'Esibizione Cantanti Emergenti',          (timestamp '2026-07-16 19:30:00' at time zone 'Europe/Rome'), 'scheduled', 105);

  raise notice 'Seeded edition %: % teams, % players, % sponsors, % 3PT contest entrants, % gironi (% team slots), % group matches, % bracket matches, 6 events.',
    v_edition_id, v_team_count, v_player_count, v_sponsor_count, v_tpc_player_count,
    v_group_count_total, v_group_team_count, v_group_match_count, v_bracket_match_count;
end $$;
