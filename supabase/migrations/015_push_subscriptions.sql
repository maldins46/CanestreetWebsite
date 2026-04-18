CREATE TABLE push_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint        TEXT UNIQUE NOT NULL,
  p256dh          TEXT NOT NULL,
  auth            TEXT NOT NULL,
  notify_news     BOOLEAN DEFAULT true,
  notify_matches  BOOLEAN DEFAULT true,
  notify_results  BOOLEAN DEFAULT true,
  notify_winners  BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can subscribe"   ON push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can unsubscribe" ON push_subscriptions FOR DELETE USING (true);

-- Grant table-level privileges so RLS policies can take effect
GRANT INSERT, DELETE ON push_subscriptions TO anon, authenticated;
