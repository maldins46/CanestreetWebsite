-- 028_ledwall_bacheca.sql
-- New "Bacheca" ledwall scene: a pinboard of operator-uploaded images.
-- Adds 'bacheca' to the fixed_scene check and creates the image library table.

ALTER TABLE ledwall_state DROP CONSTRAINT ledwall_state_fixed_scene_check;
ALTER TABLE ledwall_state ADD CONSTRAINT ledwall_state_fixed_scene_check
  CHECK (fixed_scene IN ('standings', 'finals', 'matches', 'sponsors', 'tpc', 'bacheca'));

CREATE TABLE ledwall_bacheca_images (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  url        text        NOT NULL,
  label      text        NOT NULL DEFAULT '',
  sort_order int         NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ledwall_bacheca_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read bacheca images"
  ON ledwall_bacheca_images FOR SELECT
  USING (true);

CREATE POLICY "Admins manage bacheca images"
  ON ledwall_bacheca_images FOR ALL
  USING  (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()));
