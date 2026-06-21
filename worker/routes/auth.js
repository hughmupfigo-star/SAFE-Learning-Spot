// Auth handlers: signup, login, verify.
// Mirrors the Express routes that lived in /routes/auth.js,
// but uses D1 instead of Postgres and Web Crypto instead of bcrypt/jsonwebtoken.

import { hashPassword, verifyPassword } from '../lib/password.js';
import { signJwt, verifyJwt } from '../lib/jwt.js';
import { json, error, readJson } from '../lib/response.js';
import { sendEmail, passwordResetEmail } from '../lib/email.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_DAYS = 30;

function userPublic(row) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
  };
}

export async function signup(request, env) {
  const body = await readJson(request);
  if (!body) return error('Invalid JSON', 400);

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();

  if (!EMAIL_RE.test(email)) return error('Invalid email address', 400);
  if (password.length < 8) return error('Password must be at least 8 characters', 400);
  if (!firstName) return error('First name is required', 400);
  if (!lastName) return error('Last name is required', 400);

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?1')
    .bind(email).first();
  if (existing) return error('An account already exists with this email', 400);

  const password_hash = await hashPassword(password);
  const result = await env.DB.prepare(
    `INSERT INTO users (email, password_hash, first_name, last_name)
     VALUES (?1, ?2, ?3, ?4)
     RETURNING id, email, first_name, last_name`
  ).bind(email, password_hash, firstName, lastName).first();

  if (!result) return error('Could not create account', 500);

  const token = await signJwt({ userId: result.id }, env.JWT_SECRET, TOKEN_DAYS * 24 * 60 * 60);
  return json({ user: userPublic(result), token }, 201);
}

export async function login(request, env) {
  const body = await readJson(request);
  if (!body) return error('Invalid JSON', 400);

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return error('Invalid credentials', 401);

  const row = await env.DB.prepare(
    'SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = ?1'
  ).bind(email).first();
  if (!row) return error('Invalid credentials', 401);

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) return error('Invalid credentials', 401);

  const token = await signJwt({ userId: row.id }, env.JWT_SECRET, TOKEN_DAYS * 24 * 60 * 60);
  return json({ user: userPublic(row), token });
}

export async function verify(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return error('No token provided', 401);

  const payload = await verifyJwt(m[1], env.JWT_SECRET);
  if (!payload || !payload.userId) return error('Invalid token', 401);
  return json({ valid: true, userId: payload.userId });
}

// ─── Password reset ───────────────────────────────────────────────────────

const RESET_TOKEN_BYTES = 32;       // 256 bits of entropy
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function bytesToB64Url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  const bytes = new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

/**
 * POST /api/auth/request-reset
 * Body: { email }
 *
 * Always returns 200 with a neutral message — we never reveal whether the
 * email is registered. If the user exists, we generate a single-use token,
 * store its SHA-256 hash, and (TODO) email the reset URL. Until email
 * sending is wired up, the URL is returned in the response under reset_url
 * so the flow can be tested end-to-end.
 */
export async function requestReset(request, env) {
  const body = await readJson(request);
  if (!body) return error('Invalid JSON', 400);

  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return error('Invalid email address', 400);

  const row = await env.DB.prepare(
    'SELECT id, first_name FROM users WHERE email = ?1'
  ).bind(email).first();

  // Always succeed so we don't leak account existence. If the user does
  // exist, create + store a reset token, and email the reset URL.
  if (row) {
    const tokenBytes = crypto.getRandomValues(new Uint8Array(RESET_TOKEN_BYTES));
    const token = bytesToB64Url(tokenBytes);
    const tokenHash = await sha256Hex(token);
    const expiresAt = Date.now() + RESET_TTL_MS;

    await env.DB.prepare(
      'INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?1, ?2, ?3)'
    ).bind(tokenHash, row.id, expiresAt).run();

    const origin = new URL(request.url).origin;
    const resetUrl = `${origin}/reset-password.html?token=${encodeURIComponent(token)}`;

    const { html, text } = passwordResetEmail({ resetUrl, firstName: row.first_name });
    const result = await sendEmail(env, {
      to: email,
      subject: 'Reset your Safe Spot password',
      html,
      text,
    });

    // If email isn't wired up yet (RESEND_API_KEY missing), return the URL
    // directly so the flow can still be tested end-to-end. Once the key is
    // set, this fallback won't trigger and the URL won't be leaked over HTTP.
    if (!result.sent && result.reason === 'missing_api_key') {
      console.log(`[password-reset] ${email} → ${resetUrl}`);
      return json({ ok: true, reset_url: resetUrl });
    }
  }

  // Neutral response — never reveals whether the email exists or whether
  // mail delivery actually succeeded.
  return json({ ok: true });
}

/**
 * POST /api/auth/recover-email
 * Body: { fullName, contactEmail, notes }
 *
 * For users who can't remember which email is on their account. Forwards
 * the request to the Safe Spot support inbox so a human can help. We do
 * NOT search the database from the Worker — that would let attackers
 * enumerate accounts by name.
 */
export async function recoverEmail(request, env) {
  const body = await readJson(request);
  if (!body) return error('Invalid JSON', 400);

  const fullName     = String(body.fullName     || '').trim();
  const contactEmail = String(body.contactEmail || '').trim().toLowerCase();
  const notes        = String(body.notes        || '').trim();

  if (!fullName)                    return error('Full name is required', 400);
  if (!EMAIL_RE.test(contactEmail)) return error('A valid contact email is required', 400);

  const supportTo = env.SUPPORT_EMAIL || 'enquiries@safespot.life';
  const subject = `Account recovery request from ${fullName}`;

  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  const text = [
    `A user has requested help recovering the email on their account.`,
    ``,
    `Full name:     ${fullName}`,
    `Contact email: ${contactEmail}`,
    `Notes:         ${notes || '(none)'}`,
    ``,
    `Please look up the account and reply to ${contactEmail}.`,
  ].join('\n');

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0a0a0a;max-width:560px;margin:0 auto;padding:24px;line-height:1.6">
    <h2 style="font-family:Georgia,serif;font-weight:300;margin:0 0 16px 0">Account recovery request</h2>
    <table cellpadding="6" style="border-collapse:collapse;font-size:14px">
      <tr><td style="color:#6b6b66">Full name</td><td><strong>${escapeHtml(fullName)}</strong></td></tr>
      <tr><td style="color:#6b6b66">Contact email</td><td><a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a></td></tr>
      <tr><td style="color:#6b6b66;vertical-align:top">Notes</td><td>${escapeHtml(notes) || '<em style="color:#6b6b66">(none)</em>'}</td></tr>
    </table>
    <p style="margin-top:22px;font-size:13px;color:#6b6b66">Please look up the account and reply directly to ${escapeHtml(contactEmail)}.</p>
  </div>`;

  const result = await sendEmail(env, {
    to: supportTo,
    subject,
    html,
    text,
  });

  // Don't reveal whether the support email actually went through — neutral OK.
  if (!result.sent) {
    console.warn(`[recover-email] sendEmail failed: ${JSON.stringify(result)}`);
  }
  return json({ ok: true });
}

/**
 * POST /api/auth/reset
 * Body: { token, password }
 *
 * Verifies the reset token, hashes the new password, updates the user row,
 * and marks the token used.
 */
export async function resetPassword(request, env) {
  const body = await readJson(request);
  if (!body) return error('Invalid JSON', 400);

  const token = String(body.token || '');
  const password = String(body.password || '');
  if (!token) return error('Missing reset token', 400);
  if (password.length < 8) return error('Password must be at least 8 characters', 400);

  const tokenHash = await sha256Hex(token);
  const reset = await env.DB.prepare(
    'SELECT user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?1'
  ).bind(tokenHash).first();

  if (!reset) return error('This reset link is invalid or has already been used.', 400);
  if (reset.used_at)         return error('This reset link has already been used.', 400);
  if (reset.expires_at < Date.now()) return error('This reset link has expired. Please request a new one.', 400);

  const password_hash = await hashPassword(password);
  const now = Date.now();

  // Update user + mark token used in the same batch
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash = ?1, updated_at = ?2 WHERE id = ?3')
      .bind(password_hash, now, reset.user_id),
    env.DB.prepare('UPDATE password_resets SET used_at = ?1 WHERE token_hash = ?2')
      .bind(now, tokenHash),
  ]);

  return json({ ok: true });
}

