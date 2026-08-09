// /api/xero/_store.js — token storage + refresh.
// NOTE: serverless functions are stateless between cold starts, so this in-memory
// store works within a warm instance. For a prototype demo this is fine — the
// connection persists through a demo session. (Production would use a database /
// Vercel KV — that's on the 12-month roadmap.)

let TOKENS = globalThis.__XERO_TOKENS__ || null;

export function saveTokens(t) {
  TOKENS = t;
  globalThis.__XERO_TOKENS__ = t;
}
export function getTokens() {
  return TOKENS || globalThis.__XERO_TOKENS__ || null;
}

export async function getValidAccessToken() {
  const t = getTokens();
  if (!t) return null;

  // Still valid (60s buffer)
  if (Date.now() < t.expires_at - 60000) return t;

  // Refresh
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const r = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: { "Authorization": `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: t.refresh_token }).toString(),
  });
  if (!r.ok) return null;
  const nt = await r.json();
  const updated = {
    ...t,
    access_token: nt.access_token,
    refresh_token: nt.refresh_token || t.refresh_token,
    expires_at: Date.now() + (nt.expires_in * 1000),
  };
  saveTokens(updated);
  return updated;
}
