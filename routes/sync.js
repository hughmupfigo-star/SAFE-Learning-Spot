import express from 'express';
import { pool } from '../server.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Keys are namespaced client-side (slsc_pos_*, slsc_last, slsc_notes_*,
// slsc_recall_*, slsc_rate_*, safespot_cXmY). This store treats them as
// opaque key/value pairs so new synced features need no schema changes.

// GET /api/sync  -> all of the user's synced state
// Optional ?since=<epoch_ms> returns only rows changed after that time.
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const since = Number(req.query.since) || 0;

    let q = 'SELECT k, v, (EXTRACT(EPOCH FROM updated_at) * 1000)::bigint AS ts FROM user_state WHERE user_id = $1';
    const params = [userId];
    if (since > 0) {
      q += ' AND updated_at > to_timestamp($2 / 1000.0)';
      params.push(since);
    }

    const result = await pool.query(q, params);
    res.json({ items: result.rows.map((r) => ({ k: r.k, v: r.v, ts: Number(r.ts) })) });
  } catch (err) {
    console.error('Sync GET error:', err);
    res.status(500).json({ error: 'Failed to fetch sync state' });
  }
});

// PUT /api/sync  -> upsert a batch: { items: [{ k, v }, ...] }
// Last write wins (server timestamps each write).
router.put('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const items = Array.isArray(req.body && req.body.items) ? req.body.items : [];
  if (!items.length) return res.json({ success: true, count: 0 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let count = 0;
    for (const it of items) {
      if (!it || typeof it.k !== 'string' || !it.k) continue;
      const k = it.k.slice(0, 200);
      const v = it.v == null ? null : String(it.v);
      await client.query(
        `INSERT INTO user_state (user_id, k, v, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, k)
         DO UPDATE SET v = EXCLUDED.v, updated_at = CURRENT_TIMESTAMP`,
        [userId, k, v]
      );
      count++;
    }
    await client.query('COMMIT');
    res.json({ success: true, count });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Sync PUT error:', err);
    res.status(500).json({ error: 'Failed to save sync state' });
  } finally {
    client.release();
  }
});

export default router;
