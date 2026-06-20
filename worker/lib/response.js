// JSON response helpers + CORS preflight support.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

export function error(message, status = 400) {
  return json({ error: message }, status);
}

export function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
