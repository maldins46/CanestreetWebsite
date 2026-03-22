-- ============================================================
-- Edition Winners
-- Per-category winners for each tournament edition
-- Categories may vary year by year (Senior, Under 18, etc.)
-- ============================================================
create table edition_winners (
  id          uuid primary key default uuid_generate_v4(),
  edition_id  uuid not null references editions(id) on delete cascade,
  category    text not null,           -- e.g. "Senior", "Under 18", "3-Point Contest"
  winner_name text not null,
  photo_url   text,                    -- optional winner/team photo from Supabase Storage
  sort_order  int not null default 0,  -- display ordering within an edition
  created_at  timestamptz not null default now()
);

create index edition_winners_edition_idx on edition_winners(edition_id);

-- RLS — same pattern as standings
alter table edition_winners enable row level security;

create policy "edition_winners_public_read"
  on edition_winners for select using (true);

create policy "edition_winners_admin_insert"
  on edition_winners for insert with check (is_admin());

create policy "edition_winners_admin_update"
  on edition_winners for update using (is_admin());

create policy "edition_winners_admin_delete"
  on edition_winners for delete using (is_admin());

-- Migrate existing winner_name values into the new table
insert into edition_winners (edition_id, category, winner_name, sort_order)
select id, 'Senior', winner_name, 0
from editions
where winner_name is not null;
