-- ============================================================
-- 017_fix_category_constraints.sql
-- Migration 013 updated category values in groups/matches but
-- forgot to replace their check constraints. Fix that now.
-- ============================================================

alter table groups drop constraint groups_category_check;
alter table groups add  constraint groups_category_check
  check (category in ('open_m', 'open_f', 'u14_m', 'u16_m', 'u18_m'));

alter table matches drop constraint matches_category_check;
alter table matches add  constraint matches_category_check
  check (category in ('open_m', 'open_f', 'u14_m', 'u16_m', 'u18_m'));
