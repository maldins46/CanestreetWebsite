-- 024_live_started_at.sql
-- Adds live_started_at timestamp to matches and tpc_entries.
-- Set automatically by triggers when a row goes "live" — no changes needed to admin code.
-- The Ledwall uses this to determine which event went live most recently (contextual mode).

alter table matches      add column if not exists live_started_at timestamptz;
alter table tpc_entries  add column if not exists live_started_at timestamptz;

-- ── matches: stamp when status transitions to 'in_progress' ───────────────────

create or replace function fn_match_live_started_at()
returns trigger language plpgsql as $$
begin
  if NEW.status = 'in_progress'
     and (OLD.status is null or OLD.status <> 'in_progress') then
    NEW.live_started_at := now();
  end if;
  return NEW;
end;
$$;

create trigger trg_match_live_started_at
  before update on matches
  for each row execute function fn_match_live_started_at();

-- ── tpc_entries: stamp when is_live flips to true ─────────────────────────────

create or replace function fn_tpc_entry_live_started_at()
returns trigger language plpgsql as $$
begin
  if NEW.is_live = true
     and (OLD.is_live is null or OLD.is_live = false) then
    NEW.live_started_at := now();
  end if;
  return NEW;
end;
$$;

create trigger trg_tpc_entry_live_started_at
  before update on tpc_entries
  for each row execute function fn_tpc_entry_live_started_at();
