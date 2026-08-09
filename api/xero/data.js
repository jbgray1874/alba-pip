// /api/xero/data.js — reads the session cookie, refreshes the access token,
// fetches REAL invoices + contacts, maps them to the finance drill-down shape,
// and rotates the refresh token back into the cookie.

import { parseSession, buildSessionCookie } from "./_session.js";

async function xget(path, token, tenantId) {
  const r = await fetch("https://api.xero.com/api.xro/2.0/" + path, {
    headers: { "Authorization": `Bearer ${token}`, "Xero-tenant-id": tenantId, "Accept": "application/json" },
  });
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  const s = parseSession(req);
  if (!s) { res.status(200).json({ connected: false }); return; }

  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;

  try {
    // Refresh the access token from the stored refresh token
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tr = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: { "Authorization": `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: s.refresh_token }).toString(),
    });
    if (!tr.ok) { res.status(200).json({ connected: false, error: "refresh_failed" }); return; }
    const nt = await tr.json();

    // Rotate the refresh token back into the cookie
    const newSession = { ...s, refresh_token: nt.refresh_token || s.refresh_token };
    res.setHeader("Set-Cookie", buildSessionCookie(newSession));

    const token = nt.access_token, tenant = s.tenantId;
    const now = new Date();

    // Receivables (ACCREC) → overdue list
    const invRes = await xget('Invoices?where=Type=="ACCREC"&order=DueDate', token, tenant);
    const invoices = invRes.Invoices || [];
    const overdue = invoices
      .filter(i => i.AmountDue > 0 && i.DueDateString && new Date(i.DueDateString) < now)
      .map(i => ({
        invoice: i.InvoiceNumber || (i.InvoiceID || "").slice(0, 8),
        party: i.Contact?.Name || "Customer",
        amount: Math.round(i.AmountDue),
        daysOverdue: Math.max(0, Math.round((now - new Date(i.DueDateString)) / 86400000)),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    const overdueTotal = overdue.reduce((sum, i) => sum + i.amount, 0);
    const receivableTotal = invoices.reduce((sum, i) => sum + (i.AmountDue || 0), 0);

    res.status(200).json({
      connected: true,
      tenantName: s.tenantName,
      source: "Xero · live",
      syncedAt: now.toISOString(),
      data: {
        receivableTotal: Math.round(receivableTotal),
        overdueTotal: Math.round(overdueTotal),
        overdueInvoices: overdue,
      },
    });
  } catch (e) {
    res.status(200).json({ connected: true, error: e.message, source: "Xero · error" });
  }
}
