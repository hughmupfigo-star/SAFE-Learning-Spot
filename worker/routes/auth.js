// Auth handlers: signup, login, verify.
// Mirrors the Express routes that lived in /routes/auth.js,
// but uses D1 instead of Postgres and Web Crypto instead of bcrypt/jsonwebtoken.

import { hashPassword, verifyPassword } from '../lib/password.js';
import { signJwt, verifyJwt } from '../lib/jwt.js';
import { json, error, readJson } from '../lib/response.js';

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
