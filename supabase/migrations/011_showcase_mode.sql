-- 011_showcase_mode.sql
-- Controls the public showcase screen mode

create table if not exists showcase_modes (
  id          text primary key default 'default',
  mode        text not null check (mode in ('open', 'under', 'tpc_open', 'tpc_under', 'sponsors')),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references admins(user_id) on delete set null
);

-- Single row for current mode
insert into showcase_modes (id, mode) values ('default', 'open')
on conflict (id) do nothing;

-- RLS
alter table showcase_modes enable row level security;

create policy "Public read showcase_modes"
  on showcase_modes for select
  using (true);

create policy "Admins update showcase_modes"
  on showcase_modes for update
  using (
    exists (
      select 1 from admins
      where admins.user_id = auth.uid()
    )
  );