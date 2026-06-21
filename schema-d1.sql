-- D1 (SQLite) schema for Safe Learning Spot Centre.
-- Apply with:
--   wrangler d1 execute safe-learning-spot --remote --file=./schema-d1.sql
--   wrangler d1 execute safe-learning-spot --local  --file=./schema-d1.sql

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '',
  first_name    TEXT,
  last_name     TEXT,
  google_id     TEXT,
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  updated_at    INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

CREATE TABLE IF NOT EXISTS course_access (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id  INTEGER NOT NULL,
  granted_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS course_progress (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id  INTEGER NOT NULL,
  completed  INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS course_feedback (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id  INTEGER NOT NULL,
  feedback   TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

-- One-time password reset tokens (the token itself is stored as SHA-256 hash).
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  used_at    INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

-- Cross-device sync store: namespaced key/value pairs (slsc_pos_*, slsc_notes_*, etc.)
CREATE TABLE IF NOT EXISTS user_state (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  k          TEXT NOT NULL,
  v          TEXT,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  PRIMARY KEY (user_id, k)
);

CREATE INDEX IF NOT EXISTS idx_course_access_user_id   ON course_access(user_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_user_id ON course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_course_feedback_user_id ON course_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_state_user         ON user_state(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_user    ON password_resets(user_id);
