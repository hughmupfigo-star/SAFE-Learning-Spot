// Safe Learning Spot Centre — Cloudflare Worker entry point.
//
// Routes /api/* to handlers, falls through to static assets for everything else.
// Bindings (from wrangler.toml):
//   env.DB      — D1 database
//   env.ASSETS  — static asset fetcher
//   env.JWT_SECRET — set with `wrangler secret put JWT_SECRET`

import { corsPreflight, error, json } from './lib/response.js';
import { signup, login, verify } from './routes/auth.js';
import {
  listProgress, getCourseProgress, setCourseProgress,
} from './routes/progress.js';
import { listSync, upsertSync } from './routes/sync.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Anything outside /api goes straight to static assets.
    if (!url.pathname.startsWith('/api')) {
      return env.ASSETS.fetch(request);
    }

    // Reject API calls if secrets aren't set up yet.
    if (!env.JWT_SECRET) {
      return error('Server misconfigured: JWT_SECRET is not set', 500);
    }

    if (request.method === 'OPTIONS') return corsPreflight();

    try {
      return await route(request, env, url);
    } catch (err) {
      console.error('Unhandled API error:', err && err.stack || err);
      return error('Internal server error', 500);
    }
  },
};

async function route(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  // Health
  if (method === 'GET' && path === '/api/health') {
    return json({ status: 'ok' });
  }

  // Auth
  if (method === 'POST' && path === '/api/auth/signup') return signup(request, env);
  if (method === 'POST' && path === '/api/auth/login')  return login(request, env);
  if (method === 'POST' && path === '/api/auth/verify') return verify(request, env);

  // Progress
  if (method === 'GET' && path === '/api/progress')      return listProgress(request, env);
  let m = path.match(/^\/api\/progress\/(\d+)$/);
  if (m && method === 'GET')  return getCourseProgress(request, env, { courseId: m[1] });
  if (m && method === 'POST') return setCourseProgress(request, env, { courseId: m[1] });

  // Sync
  if (path === '/api/sync' && method === 'GET') return listSync(request, env);
  if (path === '/api/sync' && method === 'PUT') return upsertSync(request, env);

  return error('Not found', 404);
}
