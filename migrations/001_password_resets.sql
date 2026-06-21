-- Apply with:
--   wrangler d1 execute safe-learning-spot --remote --file=./migrations/001_password_resets.sql

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,           -- epoch ms
  used_at    INTEGER,                    -- epoch ms; NULL = still valid
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
