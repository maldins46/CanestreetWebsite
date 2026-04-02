-- 012_showcase_light_mode.sql
-- Add light_mode column for sunlight visibility

alter table showcase_modes add column light_mode boolean default false;