create table events (
  id              uuid primary key default uuid_generate_v4(),
  edition_id      uuid not null references editions(id) on delete cascade,
  name            text not null,
  description     text,
  scheduled_at    timestamptz,
  status          text not null default 'scheduled'
                    check (status in ('scheduled','in_progress','completed')),
  sort_order      int not null default 0,
  live_started_at timestamptz,
  created_at      timestamptz not null default now()
);

alter table events enable row level security;
create policy "Public read events" on events for select using (true);
create policy "Admin all events" on events for all using (is_admin());

create or replace function set_event_live_started_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'in_progress' and (old.status is null or old.status != 'in_progress') then
    new.live_started_at := now();
  end if;
  return new;
end;
$$;

create trigger trg_event_live_started_at
before update on events
for each row execute function set_event_live_started_at();
