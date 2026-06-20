// Cross-device sync: opaque key/value store per user.
// Keys are namespaced client-side (slsc_pos_*, slsc_notes_*, safespot_cXmY, etc.).

import { json, error, readJson } from '../lib/response.js';
import { getUserFromRequest } from '../lib/auth-middleware.js';

export async function listSync(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return error('Unauthorized', 401);

  const url = new URL(request.url);
  const since = Number(url.searchParams.get('since')) || 0;

  let rs;
  if (since > 0) {
    rs = await env.DB.prepare(
      'SELECT k, v, updated_at AS ts FROM user_state WHERE user_id = ?1 AND updated_at > ?2'
    ).bind(user.userId, since).all();
  } else {
    rs = await env.DB.prepare(
      'SELECT k, v, updated_at AS ts FROM user_state WHERE user_id = ?1'
    ).bind(user.userId).all();
  }

  const items = (rs.results || []).map((r) => ({ k: r.k, v: r.v, ts: Number(r.ts) }));
  return json({ items });
}

export async function upsertSync(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return error('Unauthorized', 401);

  const body = await readJson(request);
  const items = Array.isArray(body && body.items) ? body.items : [];
  if (!items.length) return json({ success: true, count: 0 });

  const now = Date.now();
  const stmt = env.DB.prepare(
    `INSERT INTO user_state (user_id, k, v, updated_at)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(user_id, k)
     DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at`
  );

  const batch = [];
  let count = 0;
  for (const it of items) {
    if (!it || typeof it.k !== 'string' || !it.k) continue;
    const k = it.k.slice(0, 200);
    const v = it.v == null ? null : String(it.v);
    batch.push(stmt.bind(user.userId, k, v, now));
    count++;
  }

  if (batch.length) await env.DB.batch(batch);
  return json({ success: true, count });
}
