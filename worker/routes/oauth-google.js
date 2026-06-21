// Google OAuth 2.0 sign-in.
//
// Flow:
//   1. Browser → GET /api/auth/google/start
//      Worker generates a short-lived signed `state` parameter and 302s to
//      Google's consent screen.
//   2. User approves → Google redirects to
//      GET /api/auth/google/callback?code=...&state=...
//      Worker verifies state, exchanges code for tokens, fetches user info,
//      creates or matches the local user row, issues our JWT, and 302s to
//      /login.html#token=<jwt>&first_name=<name>&new_user=<0|1>
//   3. login.html JS picks the token out of the URL hash, stashes it in
//      localStorage, and continues to the post-login destination.
//
// Worker bindings required (set as secrets / variables):
//   GOOGLE_CLIENT_ID     — secret
//   GOOGLE_CLIENT_SECRET — secret
//   JWT_SECRET           — secret (already set)

import { signJwt } from '../lib/jwt.js';
import { error } from '../lib/response.js';

const GOOGLE_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO  = 'https://openidconnect.googleapis.com/v1/userinfo';

const STATE_TTL_MS = 10 * 60 * 1000;        // 10 minutes — plenty for user to approve
const TOKEN_DAYS   = 30;

function b64url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function fromB64url(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Sign `payload` (a string) with HMAC-SHA256(secret). Returns payload.signature.
async function signState(payload, secret) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return `${payload}.${b64url(new Uint8Array(sig))}`;
}
async function verifyState(state, secret) {
  if (typeof state !== 'string') return null;
  const dot = state.lastIndexOf('.');
  if (dot < 0) return null;
  const payload = state.slice(0, dot);
  const sigEnc  = state.slice(dot + 1);

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const ok = await crypto.subtle.verify(
    'HMAC', key, fromB64url(sigEnc),
    new TextEncoder().encode(payload)
  );
  if (!ok) return null;

  // payload format: "<nonce>.<expiresAtMs>.<returnTo>"
  const parts = payload.split('.');
  if (parts.length < 2) return null;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  return { nonce: parts[0], returnTo: parts.slice(2).join('.') || '/' };
}

function redirectUri(request) {
  // Build the callback URL from the incoming request so it works on
  // workers.dev, the production domain, and previews automatically.
  const u = new URL(request.url);
  return `${u.origin}/api/auth/google/callback`;
}

export async function googleStart(request, env) {
  if (!env.GOOGLE_CLIENT_ID) {
    return error('Google sign-in is not configured: GOOGLE_CLIENT_ID is missing', 500);
  }
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('return_to') || '/';

  const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = b64url(nonceBytes);
  const expiresAt = Date.now() + STATE_TTL_MS;
  const state = await signState(`${nonce}.${expiresAt}.${returnTo}`, env.JWT_SECRET);

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(request),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });

  return new Response(null, {
    status: 302,
    headers: { Location: `${GOOGLE_AUTH_URL}?${params.toString()}` },
  });
}

export async function googleCallback(request, env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return error('Google sign-in is not configured', 500);
  }
  const url = new URL(request.url);
  const code  = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errParam = url.searchParams.get('error');

  if (errParam) {
    return redirectToLogin(request, { error: errParam });
  }
  if (!code || !state) {
    return redirectToLogin(request, { error: 'missing_code_or_state' });
  }

  const verified = await verifyState(state, env.JWT_SECRET);
  if (!verified) {
    return redirectToLogin(request, { error: 'invalid_state' });
  }

  // Exchange auth code for tokens.
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(request),
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    console.error('[google] token exchange failed:', await tokenRes.text());
    return redirectToLogin(request, { error: 'token_exchange_failed' });
  }
  const tokens = await tokenRes.json();
  const accessToken = tokens && tokens.access_token;
  if (!accessToken) return redirectToLogin(request, { error: 'no_access_token' });

  // Fetch user profile.
  const userRes = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) {
    console.error('[google] userinfo failed:', await userRes.text());
    return redirectToLogin(request, { error: 'userinfo_failed' });
  }
  const profile = await userRes.json();

  // OpenID Connect userinfo: { sub, email, email_verified, given_name, family_name, picture, ... }
  const googleId   = String(profile.sub  || '');
  const email      = String(profile.email || '').trim().toLowerCase();
  const firstName  = String(profile.given_name  || '').trim();
  const lastName   = String(profile.family_name || '').trim();
  const verifiedEmail = profile.email_verified === true || profile.email_verified === 'true';

  if (!googleId || !email || !verifiedEmail) {
    return redirectToLogin(request, { error: 'incomplete_profile' });
  }

  // Look up existing user by google_id, then by email.
  let user = await env.DB.prepare(
    'SELECT id, email, first_name, last_name FROM users WHERE google_id = ?1'
  ).bind(googleId).first();

  let isNew = false;

  if (!user) {
    const byEmail = await env.DB.prepare(
      'SELECT id, email, first_name, last_name FROM users WHERE email = ?1'
    ).bind(email).first();

    if (byEmail) {
      // Existing email/password user is linking their Google account.
      await env.DB.prepare('UPDATE users SET google_id = ?1, updated_at = ?2 WHERE id = ?3')
        .bind(googleId, Date.now(), byEmail.id).run();
      user = byEmail;
    } else {
      // Brand-new user via Google. password_hash = '' marks "no password set",
      // so password login is impossible until they set one via reset flow.
      const inserted = await env.DB.prepare(
        `INSERT INTO users (email, password_hash, first_name, last_name, google_id)
         VALUES (?1, '', ?2, ?3, ?4)
         RETURNING id, email, first_name, last_name`
      ).bind(email, firstName, lastName, googleId).first();
      user = inserted;
      isNew = true;
    }
  }

  if (!user) return redirectToLogin(request, { error: 'user_create_failed' });

  const token = await signJwt({ userId: user.id }, env.JWT_SECRET, TOKEN_DAYS * 24 * 60 * 60);

  // Pass token via URL fragment (not query) so it stays out of server logs.
  const params = new URLSearchParams({
    token,
    first_name: user.first_name || firstName || '',
    last_name:  user.last_name  || lastName  || '',
    email:      user.email,
    new_user:   isNew ? '1' : '0',
    return_to:  verified.returnTo || '/',
  });

  const dest = new URL('/login.html', request.url);
  dest.hash = params.toString();

  return new Response(null, {
    status: 302,
    headers: { Location: dest.toString() },
  });
}

function redirectToLogin(request, extra) {
  const dest = new URL('/login.html', request.url);
  if (extra && extra.error) dest.hash = `oauth_error=${encodeURIComponent(extra.error)}`;
  return new Response(null, {
    status: 302,
    headers: { Location: dest.toString() },
  });
}
