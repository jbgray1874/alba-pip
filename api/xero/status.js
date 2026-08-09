// /api/xero/status.js — reads the session cookie. Because the cookie persists
// in the browser, the connection now survives reloads and cold starts.

import { parseSession } from "./_session.js";

export default function handler(req, res) {
  const s = parseSession(req);
  res.status(200).json({
    connected: !!(s && s.tenantId),
    tenantName: s?.tenantName || null,
  });
}
