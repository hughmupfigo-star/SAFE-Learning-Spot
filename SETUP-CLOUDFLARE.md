# Cloudflare backend setup

This Worker serves the static site **and** the `/api/*` backend (auth, progress, sync) in one deploy. Storage is a Cloudflare D1 database. Run these steps once.

## Prerequisites

Install/upgrade Wrangler if you haven't recently:

```
npm install -g wrangler
wrangler login
```

## 1. Create the D1 database

From the project root (the `SAFE-Learning-Spot` folder):

```
wrangler d1 create safe-learning-spot
```

Output ends with a block like:

```
[[d1_databases]]
binding = "DB"
database_name = "safe-learning-spot"
database_id = "abcdef12-3456-7890-abcd-ef1234567890"
```

Copy that `database_id`. Open `wrangler.toml` and replace `REPLACE_WITH_D1_DATABASE_ID` with it.

## 2. Apply the schema

Push tables to the live (remote) database, and also to the local one if you want to run `wrangler dev`:

```
wrangler d1 execute safe-learning-spot --remote --file=./schema-d1.sql
wrangler d1 execute safe-learning-spot --local  --file=./schema-d1.sql
```

You should see `Executed XX commands in YYY.YYms`.

## 3. Set the JWT secret

This signs the tokens that prove a user is logged in. Generate a random 64-char hex string and store it as a Worker secret:

PowerShell:

```
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secret = ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
$secret | wrangler secret put JWT_SECRET
```

Or in Git Bash / WSL:

```
wrangler secret put JWT_SECRET
# (paste a long random string when prompted, e.g. from `openssl rand -hex 32`)
```

## 4. Deploy

```
wrangler deploy
```

Or just push to GitHub — your Cloudflare Pages/Workers Git integration will redeploy automatically.

## 5. Sanity check

Once deployed, open these in a browser or with curl:

- `https://<your-domain>/api/health` → `{"status":"ok"}`
- `https://<your-domain>/api/auth/login` (POST with bad body) → JSON error, not HTML

If you get HTML back, the Worker isn't routing `/api` — double-check `main = "worker/index.js"` in `wrangler.toml`.

## 6. Test signup + login

Open the deployed site, click **Create account**, fill in name / email / password (≥ 8 chars), submit. You should be signed in and redirected. Try logging out and back in. Then check the database:

```
wrangler d1 execute safe-learning-spot --remote --command="SELECT id, email, first_name, last_name FROM users"
```

## Notes

- **Old Express code is still in the repo** (`server.js`, `routes/`, `lib/`, `database/`). It's no longer used by Cloudflare but you can keep it as reference. Delete it any time.
- **Stripe payments** (`routes/payment.js`) are NOT yet ported. The Worker has no payment endpoint. That's a follow-up.
- **Password hashing changed** from bcrypt to PBKDF2-SHA256 (210k iterations). Any users created against the old Postgres backend would not be able to log in here — but you said there's no production data to migrate, so that's fine.
- **Local dev:** `wrangler dev` runs the Worker against the **local** D1 database. Make sure you applied the schema to `--local` (step 2) before testing.
