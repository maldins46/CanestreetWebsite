-- 027_showcase_contextual.sql
-- Add 'contextual' mode to showcase_modes: auto-selects screen based on live state

ALTER TABLE showcase_modes DROP CONSTRAINT showcase_modes_mode_check;
ALTER TABLE showcase_modes ADD CONSTRAINT showcase_modes_mode_check
  CHECK (mode IN ('open', 'under', 'tpc_open', 'tpc_under', 'sponsors', 'contextual'));
