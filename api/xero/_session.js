// /api/xero/_session.js — stores the Xero session in a secure browser cookie
// so the connection PERSISTS across page reloads and serverless cold starts.
// No database needed. We store only the refresh_token + tenant (small, safe);
// the short-lived access token is re-derived on each data call.

const COOKIE = "xs";
const MAX_AGE = 60 * 60 * 24 * 55; // ~55 days (Xero refresh tokens last 60)

export function parseSession(req) {
  const raw = req.headers.cookie || "";
  const hit = raw.split(";").map(s => s.trim()).find(s => s.startsWith(COOKIE + "="));
  if (!hit) return null;
  try {
    const b64 = decodeURIComponent(hit.slice(COOKIE.length + 1));
    const json = Buffer.from(b64, "base64").toString("utf8");
    const s = JSON.parse(json);
    return (s && s.refresh_token && s.tenantId) ? s : null;
  } catch { return null; }
}

export function buildSessionCookie(session) {
  const b64 = Buffer.from(JSON.stringify(session), "utf8").toString("base64");
  return `${COOKIE}=${encodeURIComponent(b64)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
