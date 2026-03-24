create table sponsors (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  tier        text not null default 'bronze'
                check (tier in ('main','gold','silver','bronze')),
  logo_url    text,
  website_url text,
  description text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index sponsors_tier_sort_idx on sponsors(tier, sort_order, name);
alter table sponsors enable row level security;

-- Public can only read active sponsors
create policy "sponsors_public_read"
  on sponsors for select using (is_active = true);

-- Admins have full access (same pattern as all other tables)
create policy "sponsors_admin_all"
  on sponsors for all using (is_admin()) with check (is_admin());
