// /api/xero/callback.js — exchanges the auth code for tokens, picks the best
// organisation (PREFERS "Demo Company"), and saves a persistent session cookie.

import { buildSessionCookie } from "./_session.js";

export default async function handler(req, res) {
  const { code } = req.query;
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const redirectUri = process.env.XERO_REDIRECT_URI
    || `https://${req.headers.host}/api/xero/callback`;

  if (!code) { res.status(400).send("Missing authorization code"); return; }
  if (!clientId || !clientSecret) { res.status(500).send("Xero credentials not configured"); return; }

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: { "Authorization": `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const t = await tokenRes.text();
      res.status(502).send("Token exchange failed: " + t);
      return;
    }
    const tokens = await tokenRes.json();

    // Which organisations did the user authorise?
    const connRes = await fetch("https://api.xero.com/connections", {
      headers: { "Authorization": `Bearer ${tokens.access_token}`, "Content-Type": "application/json" },
    });
    const connections = await connRes.json();

    // PREFER the Demo Company (it has the rich sample data); else first org.
    const demo = (connections || []).find(c => /demo/i.test(c.tenantName || ""));
    const chosen = demo || (connections || [])[0] || {};

    const session = {
      refresh_token: tokens.refresh_token,
      tenantId: chosen.tenantId || null,
      tenantName: chosen.tenantName || null,
    };

    res.setHeader("Set-Cookie", buildSessionCookie(session));
    res.writeHead(302, { Location: "/?xero=connected" });
    res.end();
  } catch (e) {
    res.status(500).send("Callback error: " + e.message);
  }
}
