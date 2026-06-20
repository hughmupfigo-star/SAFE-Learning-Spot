// Minimal HS256 JWT sign + verify using Web Crypto.
// Token format: header.payload.signature  (all base64url).

function b64urlEncode(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlEncodeStr(str) {
  return b64urlEncode(new TextEncoder().encode(str));
}

function b64urlDecodeToBytes(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlDecodeToStr(s) {
  return new TextDecoder().decode(b64urlDecodeToBytes(s));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Sign a JWT. `payload` is any JSON-serializable object.
 * `expiresInSeconds` adds an `exp` claim.
 */
export async function signJwt(payload, secret, expiresInSeconds = 60 * 60 * 24 * 30) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + expiresInSeconds, ...payload };

  const headerEnc = b64urlEncodeStr(JSON.stringify(header));
  const bodyEnc = b64urlEncodeStr(JSON.stringify(body));
  const signingInput = `${headerEnc}.${bodyEnc}`;

  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  const sigEnc = b64urlEncode(new Uint8Array(sig));

  return `${signingInput}.${sigEnc}`;
}

/**
 * Verify a JWT and return its payload, or null if invalid/expired.
 */
export async function verifyJwt(token, secret) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerEnc, bodyEnc, sigEnc] = parts;

  let header;
  try { header = JSON.parse(b64urlDecodeToStr(headerEnc)); } catch { return null; }
  if (!header || header.alg !== 'HS256') return null;

  const key = await hmacKey(secret);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    b64urlDecodeToBytes(sigEnc),
    new TextEncoder().encode(`${headerEnc}.${bodyEnc}`)
  );
  if (!valid) return null;

  let body;
  try { body = JSON.parse(b64urlDecodeToStr(bodyEnc)); } catch { return null; }
  if (!body || typeof body !== 'object') return null;

  const now = Math.floor(Date.now() / 1000);
  if (typeof body.exp === 'number' && body.exp < now) return null;
  return body;
}
