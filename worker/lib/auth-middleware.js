// Extracts and verifies a JWT from the Authorization header.
// Returns the decoded payload on success, or null on failure.

import { verifyJwt } from './jwt.js';

export async function getUserFromRequest(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const payload = await verifyJwt(m[1], env.JWT_SECRET);
  if (!payload || !payload.userId) return null;
  return payload;
}
