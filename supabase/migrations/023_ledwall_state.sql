-- 023_ledwall_state.sql
-- Singleton control row for the Ledwall public display screen.
-- Same RLS idiom as 011_showcase_mode.sql: one seeded row, public SELECT, admin-only UPDATE.

create table ledwall_state (
  id           text primary key default 'default',
  mode         text not null default 'contextual'
                 check (mode in ('fixed','contextual')),
  fixed_scene  text not null default 'matches'
                 check (fixed_scene in ('standings','finals','matches','sponsors','tpc')),
  scene_config jsonb not null default '{}'::jsonb,
  frame_url    text,
  transition   text not null default 'fade'
                 check (transition in ('fade','sting')),
  updated_at   timestamptz not null default now(),
  updated_by   uuid references admins(user_id) on delete set null
);

insert into ledwall_state (id) values ('default')
on conflict (id) do nothing;

alter table ledwall_state enable row level security;

create policy "Public read ledwall_state"
  on ledwall_state for select
  using (true);

create policy "Admins update ledwall_state"
  on ledwall_state for update
  using (
    exists (
      select 1 from admins
      where admins.user_id = auth.uid()
    )
  );
