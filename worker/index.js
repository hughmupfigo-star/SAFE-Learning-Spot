// Safe Learning Spot Centre — Cloudflare Worker entry point.
//
// Routes /api/* to handlers, falls through to static assets for everything else.
// Bindings (from wrangler.toml):
//   env.DB      — D1 database
//   env.ASSETS  — static asset fetcher
//   env.JWT_SECRET — set with `wrangler secret put JWT_SECRET`

import { corsPreflight, error, json } from './lib/response.js';
import { signup, login, verify, requestReset, resetPassword, recoverEmail } from './routes/auth.js';
import { googleStart, googleCallback } from './routes/oauth-google.js';
import {
  listProgress, getCourseProgress, setCourseProgress,
} from './routes/progress.js';
import { listSync, upsertSync } from './routes/sync.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Anything outside /api goes straight to static assets.
    if (!url.pathname.startsWith('/api')) {
      // With html_handling = "none" (wrangler.toml) assets are served exactly
      // as named, so the bare root "/" (and any "/folder/" path) no longer maps
      // to index.html automatically. Map directory-style requests ourselves so
      // visiting safelearningspot.com still loads the home page.
      if (url.pathname === '/' || url.pathname.endsWith('/')) {
        const indexUrl = new URL(url.pathname + 'index.html', url.origin);
        return env.ASSETS.fetch(new Request(indexUrl.toString(), { headers: request.headers }));
      }
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
  if (method === 'POST' && path === '/api/auth/signup')        return signup(request, env);
  if (method === 'POST' && path === '/api/auth/login')         return login(request, env);
  if (method === 'POST' && path === '/api/auth/verify')        return verify(request, env);
  if (method === 'POST' && path === '/api/auth/request-reset') return requestReset(request, env);
  if (method === 'POST' && path === '/api/auth/reset')         return resetPassword(request, env);
  if (method === 'POST' && path === '/api/auth/recover-email') return recoverEmail(request, env);

  // Google OAuth (GETs because browser does the redirects)
  if (method === 'GET' && path === '/api/auth/google/start')    return googleStart(request, env);
  if (method === 'GET' && path === '/api/auth/google/callback') return googleCallback(request, env);

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
