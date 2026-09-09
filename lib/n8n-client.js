// lib/n8n-client.js
// ---------------------------------------------------------------------------
// Connection client for the n8n workflow-automation instance running on this
// VPS. n8n is deployed as the docker container `n8n-n8n-1` (n8nio/n8n) and
// listens on 127.0.0.1:5678 locally; it is also reachable publicly through the
// cloudflared tunnel at https://n8n.mrtc.xyz.
//
// This module is the wiring that lets Bitty Box *connect to* that instance:
//   - probe its health (read-only), and
//   - trigger n8n webhooks so Bitty Box events can drive automation flows.
//
// No new dependencies: uses Node 18+ global `fetch`.
// ---------------------------------------------------------------------------

// Resolve the n8n base URL. Prefer BITTYBOX_N8N_URL; fall back to N8N_BASE_URL;
// default to the on-host docker endpoint so it works without external network.
export const N8N_BASE_URL =
  process.env.BITTYBOX_N8N_URL ||
  process.env.N8N_BASE_URL ||
  'http://localhost:5678';

export function n8nBaseUrl() {
  return N8N_BASE_URL;
}

/**
 * Read-only health probe. n8n exposes GET /healthz (and /health).
 * Returns { ok, status, url, error? }.
 */
export async function n8nHealth(baseUrl = N8N_BASE_URL) {
  const target = new URL('/healthz', baseUrl).toString();
  try {
    const res = await fetch(target, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
    });
    return { ok: res.ok, status: res.status, url: target };
  } catch (err) {
    return { ok: false, status: 0, url: target, error: err.message };
  }
}

/**
 * Trigger an n8n webhook. `path` is the path n8n generates for a webhook node
 * (e.g. '/webhook/abc123' or '/webhook-test/abc123'). The webhook node must be
 * active in n8n for the call to succeed.
 *
 * Returns { ok, status, url, data } where `data` is parsed JSON (or raw text).
 */
export async function triggerN8nWebhook(
  path,
  payload = {},
  { method = 'POST', baseUrl = N8N_BASE_URL, headers = {} } = {}
) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const target = new URL(cleanPath, baseUrl).toString();
  const res = await fetch(target, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: method === 'GET' ? undefined : JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, url: target, data };
}
