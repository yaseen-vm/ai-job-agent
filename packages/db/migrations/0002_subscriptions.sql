-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan        TEXT NOT NULL CHECK(plan IN ('premium')) DEFAULT 'premium',
  status      TEXT NOT NULL CHECK(status IN ('active','cancelled','expired')) DEFAULT 'active',
  started_at  INTEGER NOT NULL,
  expires_at  INTEGER,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(status, expires_at);
