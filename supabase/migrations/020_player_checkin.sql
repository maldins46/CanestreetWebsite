alter table players
  add column checkin_payment     boolean not null default false,
  add column checkin_kit         boolean not null default false,
  add column checkin_buono_pasto boolean not null default false;
