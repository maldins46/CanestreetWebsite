-- 030_ledwall_launchpad.sql
-- Pulsantiera animation trigger: add launchpad_text and launchpad_count to ledwall_state.
-- When launchpad_count increments, the public page fires an animation with launchpad_text.
-- This is simpler than a separate table: just UPDATE ledwall_state, and the existing
-- realtime listener on ledwall_state detects the count increment and fires the animation.

alter table ledwall_state add column launchpad_text text;
alter table ledwall_state add column launchpad_count int not null default 0;
