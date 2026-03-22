-- ============================================================
-- Staff
-- Team members shown on the Chi Siamo public page
-- ============================================================
create table staff (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  title      text not null,      -- nickname, e.g. "Il CEO"
  bio        text not null default '',
  photo_url  text,               -- nullable; falls back to initial avatar
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

create index staff_sort_order_idx on staff(sort_order);

-- RLS — same pattern as edition_winners
alter table staff enable row level security;

create policy "staff_public_read"
  on staff for select using (true);

create policy "staff_admin_insert"
  on staff for insert with check (is_admin());

create policy "staff_admin_update"
  on staff for update using (is_admin());

create policy "staff_admin_delete"
  on staff for delete using (is_admin());

-- Seed the 6 founding staff members
-- photo_url uses local dev URLs consistent with existing cover_url pattern.
-- For production: update via the admin backoffice after deployment.
insert into staff (name, title, bio, photo_url, sort_order) values
(
  'Michele Mosca',
  'Il CEO',
  'Signore e signori, il CEO, er capoccia, niente popodimeno che Michele Mosca: è lui il primo firmatario del torneo, colui che tiene insieme la baracca e che ogni anno si fa il culo giù in pieno inverno per la buona riuscita del torneo. Se esistiamo è grazie e soprattutto a questo ragazzo.',
  'http://127.0.0.1:54321/storage/v1/object/public/media/weare_michi.jpg',
  1
),
(
  'Lorenzo Fava',
  'Lo ZIO',
  'Lorenzo Fava: lo speaker ufficiale del torneo. Expat con furore dalla Lituania, è anche grazie a lui se il torneo è sempre così pieno di vita. Questo ragazzo abita a Vilnius, e tutti gli anni si prende una settimana di permesso per venir giù, solo per noi. Se non è questo amore, non sappiamo davvero cosa potrebbe esserlo.',
  'http://127.0.0.1:54321/storage/v1/object/public/media/weare_el.jpg',
  2
),
(
  'Giacomo Mosca',
  'Il BRO',
  'Dietro ad ogni grande CEO di successo, c''è sempre un grande fratello del CEO di successo. Giacomo Mosca, fratello minore der Capoccia, è entrato nel circuito Canestreet da ormai diversi anni. Assieme al nostro C-level preferito, si occupa della buona riuscita del torneo, dagli aspetti burocratici fino a quelli schifosamente pratici.',
  'http://127.0.0.1:54321/storage/v1/object/public/media/weare_jack.jpg',
  3
),
(
  'Marco Rossetti',
  'Il Senior',
  'Marco Rossetti è uno degli acquisti più recenti del CaneStaff. Assume il ruolo di tuttofare: Michi indica, e lui esegue, da bravo Canestreeter.',
  'http://127.0.0.1:54321/storage/v1/object/public/media/weare_marcone.jpg',
  4
),
(
  'Federico Rossetti',
  'Il Salame',
  'Federico Rossetti, classe ''97, nasce a Jesi. Conosce il CEO in tenera età nei campi da basket jesini. I due frequentano lo stesso istituto tecnico, e cuciono un saldo legame che arriva fino ai giorni nostri. Assieme a loro, è uno dei padri fondatori del torneo. Comunemente detto il Salame, perché dai è un Salame, palese.',
  'http://127.0.0.1:54321/storage/v1/object/public/media/weare_fede.jpg',
  5
),
(
  'Riccardo Maldini',
  'Lo Hacker',
  'Vivo a Milano, ma son nato nella ridente Jesi. Sono la persona che sta dietro al sito, ai social, mente creativa, quello che attacca gli amplificatori. Non ho ancora imparato le regole del 3×3, ma nonostante tutto sono qua, chi l''averebbe mai detto. Se mi vedi a segnare i punti, in genere non è un buon segno.',
  'http://127.0.0.1:54321/storage/v1/object/public/media/weare_ricco.jpg',
  6
);
