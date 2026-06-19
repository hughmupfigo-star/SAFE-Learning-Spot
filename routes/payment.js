import express from 'express';
import Stripe from 'stripe';
import { pool } from '../server.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ---- pricing (GBP) ----
const CURRENCY = 'gbp';
const COURSE_PRICE_PENCE = 1100;  // £11 per course / assessment
const BUNDLE_PRICE_PENCE = 8800;  // £88 — all 10 courses + assessment

// Display names. Assessment is stored in course_access as course_id 100.
const ASSESSMENT_ID = 100;
const NAMES = {
  '1': 'Energy & Relationships', '2': 'Toxic Relationship Patterns', '3': 'Energy Body & Sovereignty',
  '4': 'Financial Sovereignty', '5': 'Generational Patterns & Family', '6': 'Institutional Conditioning',
  '7': 'Media & Narrative Control', '8': 'Food Is Medicine', '9': 'The Art of Becoming',
  '10': 'The Uncharted Mind', 'assessment': 'Healing Stage Assessment', 'bundle': 'Full Bundle (all 10 + assessment)'
};

function normaliseItems(body) {
  var raw = Array.isArray(body.items) ? body.items : (body.courseId != null ? [body.courseId] : []);
  var seen = {}, out = [];
  raw.map(String).forEach(function (id) { if (NAMES[id] && !seen[id]) { seen[id] = 1; out.push(id); } });
  return out;
}

// Create a single Stripe Checkout Session for one or many items.
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    let items = normaliseItems(req.body || {});
    if (!items.length) return res.status(400).json({ error: 'No valid items selected' });

    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    const userEmail = userResult.rows[0] && userResult.rows[0].email;

    let line_items;
    if (items.indexOf('bundle') >= 0) {
      items = ['bundle'];
      line_items = [{ price_data: { currency: CURRENCY, product_data: { name: NAMES.bundle }, unit_amount: BUNDLE_PRICE_PENCE }, quantity: 1 }];
    } else {
      line_items = items.map(function (id) {
        return { price_data: { currency: CURRENCY, product_data: { name: NAMES[id] || ('Course ' + id) }, unit_amount: COURSE_PRICE_PENCE }, quantity: 1 };
      });
    }

    const paidParam = items.join(',');
    const base = process.env.FRONTEND_URL || '';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      customer_email: userEmail,
      success_url: `${base}/index.html?paid=${encodeURIComponent(paidParam)}`,
      cancel_url: `${base}/index.html#pricing`,
      metadata: { userId: String(userId), items: paidParam }
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Grant access for every item bought in a completed session.
async function grantItems(userId, items) {
  const ids = [];
  items.forEach(function (id) {
    if (id === 'bundle') { for (let c = 1; c <= 10; c++) ids.push(c); ids.push(ASSESSMENT_ID); }
    else if (id === 'assessment') ids.push(ASSESSMENT_ID);
    else { const n = parseInt(id, 10); if (n >= 1 && n <= 10) ids.push(n); }
  });
  for (const cid of ids) {
    await pool.query(
      'INSERT INTO course_access (user_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, cid]
    );
  }
}

// Stripe webhook — the authoritative grant of access.
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata && session.metadata.userId;
      const items = ((session.metadata && session.metadata.items) || '').split(',').filter(Boolean);
      if (userId && items.length) await grantItems(userId, items);
      await pool.query('DELETE FROM pending_payments WHERE stripe_session_id = $1', [session.id]).catch(function () {});
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// Single-course access check (kept for backward compatibility).
router.get('/access/:courseId', authenticateToken, async (req, res) => {
  try {
    if (process.env.TEST_MODE === 'true') return res.json({ hasAccess: true });
    const userId = req.user.userId;
    const courseId = req.params.courseId === 'assessment' ? ASSESSMENT_ID : req.params.courseId;
    const result = await pool.query('SELECT id FROM course_access WHERE user_id = $1 AND course_id = $2', [userId, courseId]);
    res.json({ hasAccess: result.rows.length > 0 });
  } catch (err) {
    console.error('Access check error:', err);
    res.status(500).json({ error: 'Failed to check access' });
  }
});

// List everything the user owns, as ids the client understands ("4", "assessment").
router.get('/access', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    if (process.env.TEST_MODE === 'true') {
      return res.json({ owned: Object.keys(NAMES).filter(function (k) { return k !== 'bundle'; }) });
    }
    const result = await pool.query('SELECT course_id FROM course_access WHERE user_id = $1', [userId]);
    const owned = result.rows.map(function (r) { return r.course_id === ASSESSMENT_ID ? 'assessment' : String(r.course_id); });
    res.json({ owned });
  } catch (err) {
    console.error('Access list error:', err);
    res.status(500).json({ error: 'Failed to fetch access' });
  }
});

export default router;
