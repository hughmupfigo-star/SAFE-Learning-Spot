-- Migration 001: cross-device sync store
-- A general per-user key/value table that backs cross-device sync of
-- module progress, saved page position, private notes, reflections and
-- self-check ratings. Safe to run multiple times.

CREATE TABLE IF NOT EXISTS user_state (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  k          VARCHAR(200) NOT NULL,
  v          TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, k)
);

CREATE INDEX IF NOT EXISTS idx_user_state_user ON user_state(user_id);
CREATE INDEX IF NOT EXISTS idx_user_state_updated ON user_state(user_id, updated_at);
