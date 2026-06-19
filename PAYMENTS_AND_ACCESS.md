# Payments, cart & course access

This explains how the paid courses are locked, how the homepage cart works, and
the one setup step that makes purchases unlock automatically.

## What's locked vs free

- **Paid:** Courses 1–10 and the Healing Stage Assessment. These are gated — a
  locked visitor sees a "buy" screen instead of the content.
- **Free (never gated):** Courses 11–16 (Trees, Festivals, Inner Child,
  Emotional Regulation, The Permissionless Portfolio, Under-18 Financial
  Sovereignty).

> **Honest caveat:** because the course pages are static files, this is a *soft*
> lock — it gates the UI and drives purchases, but a determined person could open
> a file directly. Real enforcement arrives when the backend is deployed (below).

## The homepage cart

- Every paid course card has an **+ Add to cart** button; owned courses show
  **Owned ✓**.
- A floating **Cart** button opens a drawer with the running total and a
  **bundle upsell** (once a selection reaches £88-worth, it offers all 10 +
  assessment for £88).
- Checkout:
  - **1 item** → that product's Stripe payment link.
  - **Bundle** → the bundle payment link.
  - **Several items** → if the backend is deployed, one combined Stripe Checkout
    for everything; otherwise it nudges to the bundle or buys items one at a time.

## ⭐ Required setup step — make purchases unlock

Each Stripe **Payment Link** must send buyers back to the site with a `?paid=`
tag so the course unlocks. In the Stripe Dashboard, open each Payment Link →
**After payment → Redirect customers to your website**, and set the URL to your
live site plus the tag below:

| Product | Redirect URL to set in Stripe |
|---|---|
| Course 1 | `https://YOURSITE/index.html?paid=1` |
| Course 2 | `https://YOURSITE/index.html?paid=2` |
| … | `…?paid=3` … `…?paid=10` |
| Course 10 | `https://YOURSITE/index.html?paid=10` |
| Assessment | `https://YOURSITE/index.html?paid=assessment` |
| Bundle | `https://YOURSITE/index.html?paid=bundle` |

When a buyer returns to `?paid=4`, the course unlocks (and `?paid=bundle` unlocks
everything). Replace `YOURSITE` with your real domain.

If a Payment Link's price or URL ever changes, update the matching link in
`slsc-access.js` (the `PAID` map and `BUNDLE`).

## Upgrading to one combined checkout (optional, needs the backend)

The cart can send a multi-course selection to a **single** professional Stripe
Checkout. That needs the backend deployed:

1. Deploy the backend (`server.js` + routes) with your `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `DATABASE_URL`, and `FRONTEND_URL` set to your live
   site. Run `database/schema.sql` (includes the `course_access` table).
2. In `slsc-sync.js`, set `API_BASE` to your deployed API origin (this is the
   same switch that enables cross-device sync).
3. In Stripe, add a webhook to `https://YOUR-API/api/payment/webhook` for the
   `checkout.session.completed` event.

Once live: multi-item carts call `POST /api/payment/checkout` (no Stripe Price
IDs needed — prices are built server-side at £11/course, £88 bundle), the webhook
grants access in the database, and the client reads the authoritative owned list
from `GET /api/payment/access`. The assessment is stored as `course_id = 100`.

## Files

- `slsc-access.js` — the access model, Stripe links, and the unlock-on-return
  handler. Loaded on the homepage and every paid page.
- `slsc-cart.js` — the homepage cart UI and checkout logic.
- `routes/payment.js` — combined Checkout Session, webhook, and access endpoints.
- The paywall gate is injected into each paid course landing, its modules, and
  `assessment.html`.
