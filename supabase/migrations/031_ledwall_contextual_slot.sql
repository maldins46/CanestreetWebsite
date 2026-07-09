-- 031_ledwall_contextual_slot.sql
-- Make the contextual-mode rotation interval configurable instead of a
-- hardcoded 20s client constant.

alter table ledwall_state add column contextual_slot_seconds int not null default 20;
alter table ledwall_state add constraint ledwall_state_contextual_slot_seconds_check
  check (contextual_slot_seconds > 0);
