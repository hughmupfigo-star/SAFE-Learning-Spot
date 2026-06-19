# Cross-device sync — how it works and how to switch it on

Learners' progress, saved page position, private notes, reflections and
self-check ratings can follow them from phone to laptop. This is **off by
default** and the site behaves exactly as before until you complete the steps
below. Nothing here can break the live site if the backend is down — everything
falls back to the browser's local storage.

## What was added

- **`database/migrations/001_user_state.sql`** — a `user_state` table
  (`user_id, k, v, updated_at`) that stores each learner's synced keys.
- **`routes/sync.js`** — authenticated `GET /api/sync` and `PUT /api/sync`
  (batch upsert). Mounted in `server.js`; JSON body limit raised to 1 MB.
- **`slsc-sync.js`** — a small, offline-first client loaded on every module page,
  the homepage and the login page. It mirrors the learning-data localStorage
  keys to the backend when a learner is signed in, and pulls + merges on load.
- **`login.html`** — sign-in and sign-up now call the real backend
  (`/api/auth/login`, `/api/auth/signup`) and store the JWT in
  `localStorage['slsc_token']`. If the backend is unset or unreachable, they
  fall back to the existing local accounts, so the page always works.

## To turn it on

1. **Deploy the backend** (Railway or similar) with the Postgres database, and
   set the environment variables in `.env.example` (`DATABASE_URL`, `JWT_SECRET`,
   Stripe keys, etc.). Note the public API URL, e.g.
   `https://your-api.up.railway.app`.

2. **Run the database setup** (creates every table including `user_state`):

   ```bash
   psql "$DATABASE_URL" -f database/schema.sql
   # or just the new table on an existing database:
   psql "$DATABASE_URL" -f database/migrations/001_user_state.sql
   ```

3. **Point the site at the API.** In `slsc-sync.js`, set the one config line:

   ```js
   var API_BASE = 'https://your-api.up.railway.app'; // no trailing slash
   ```

4. **Allow the site's origin in CORS.** Set `FRONTEND_URL` (used by
   `server.js` CORS) to the origin where the static site is served, e.g.
   `https://safelearningspot.example`. If you serve the site from more than one
   origin, widen the CORS config accordingly.

5. **Deploy the static files** (including `slsc-sync.js`) and test: sign up on
   one device, complete part of a module, then sign in on another device — the
   homepage "Continue where you left off" banner and the module's saved page
   should match.

## Good to know

- **Conflict handling is last-write-wins** per key (the server timestamps each
  write). For progress and notes this is fine; simultaneous edits of the *same*
  note on two offline devices will keep whichever syncs last.
- **Existing local accounts don't migrate.** Accounts created before the backend
  was connected live only in that browser. Once the backend is on, learners sign
  up for a real account; their on-device notes/progress are pushed up on first
  sign-in (gap-fill), so nothing already on that device is lost.
- **Shared devices:** logging out clears the token and stops syncing, but cached
  learning data stays in that browser's local storage. If you expect multiple
  people to use one browser profile, consider clearing the `slsc_*` /
  `safespot_c*` keys on logout too.
- **Device-only keys are never synced:** theme, text-zoom, the token itself, and
  the local-auth fallback list stay on the device.
