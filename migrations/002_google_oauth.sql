-- Apply with:
--   wrangler d1 execute safe-learning-spot --remote --file=./migrations/002_google_oauth.sql

-- Track the Google account that's linked to each user (NULL = no Google link).
ALTER TABLE users ADD COLUMN google_id TEXT;

-- Allow users who signed up via Google to have no password_hash.
-- SQLite's ALTER TABLE doesn't support DROP NOT NULL directly, so we
-- recreate via a default empty string for old rows and update the
-- column constraint via a CHECK. In D1 / SQLite we can't actually drop
-- NOT NULL on an existing column without rebuilding the table — but the
-- insert path for Google users stores '' as a sentinel "no password set"
-- value, which is fine because verifyPassword('') against '' fails.

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
