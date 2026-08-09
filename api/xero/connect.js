// /api/xero/connect.js — starts the Xero OAuth 2.0 flow.
// Uses the NEW granular scopes (apps created after 2 Mar 2026 require these).

const SCOPES = [
  "openid",
  "profile",
  "email",
  "accounting.invoices.read",
  "accounting.contacts.read",
  "offline_access",
].join(" ");

export default function handler(req, res) {
  const clientId = process.env.XERO_CLIENT_ID;
  const redirectUri = process.env.XERO_REDIRECT_URI
    || `https://${req.headers.host}/api/xero/callback`;

  if (!clientId) {
    res.status(500).json({ error: "XERO_CLIENT_ID not configured." });
    return;
  }

  const state = Math.random().toString(36).slice(2);

  // Build manually so scope separators are %20 (Xero rejects "+").
  const params = [
    `response_type=code`,
    `client_id=${encodeURIComponent(clientId)}`,
    `redirect_uri=${encodeURIComponent(redirectUri)}`,
    `scope=${encodeURIComponent(SCOPES)}`,
    `state=${encodeURIComponent(state)}`,
  ].join("&");

  const url = "https://login.xero.com/identity/connect/authorize?" + params;

  if (req.query && req.query.debug) {
    res.setHeader("Content-Type", "text/plain");
    res.status(200).send("AUTHORIZE URL:\n\n" + url + "\n\nSCOPES:\n" + SCOPES);
    return;
  }

  res.writeHead(302, { Location: url });
  res.end();
}
