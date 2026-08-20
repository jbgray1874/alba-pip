// ════════════════════════════════════════════════════════════════════════════
//  /api/ai/boardpack — a board pack whose figures are calculated, not written
//  ----------------------------------------------------------------------------
//  This endpoint used to send the model a dozen lines of pre-formatted strings
//  and ask it to return the entire schema, keyMetrics included. Every figure in
//  a generated board pack beyond those dozen lines was the model's invention,
//  and one of the dozen — cash "£413k" — was itself wrong: it traces to the
//  Streamlit prototype's mock, while FIN_SEED puts Meridian's cash at £663k.
//  Missing fields defaulted to Meridian's values, so an incomplete payload was
//  analysed as Meridian under whatever name was supplied.
//
//  Now groundedPack() computes keyMetrics, risks, opportunities and actions,
//  and the model is asked for two fields: executiveSummary and outlook.
//  applyNarrative() accepts only those two back — anything else it returns is
//  discarded rather than trusted.
//
//  The response shape is unchanged, so PortfolioAnalytics.jsx needs no edits.
// ════════════════════════════════════════════════════════════════════════════

import { groundedPack, applyNarrative, fallbackNarrative, NARRATIVE_ONLY } from "./_groundedPack.js";
import { companyById } from "../../src/lib/companies.js";

const XAI_URL = "https://api.x.ai/v1/chat/completions";
const MODEL = "grok-2-1212";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }

  const b = req.body || {};
  const period = b.period || "Q2 2026";
  const id = b.companyId || b.company?.id || null;

  // The id is resolved against the registry rather than trusted. Without a
  // match there is nothing to ground the pack on, so it is refused — the old
  // behaviour was to quietly produce Meridian's numbers under another name.
  const company = companyById(id);
  if (!company) {
    res.status(400).json({
      error: id ? `Unknown company "${id}"` : "companyId is required",
      live: false,
    });
    return;
  }

  const pack = groundedPack(company, period);
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    res.status(200).json({ live: false, pack: fallbackNarrative(pack, company) });
    return;
  }

  try {
    const r = await fetch(XAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        messages: [
          { role: "system", content: NARRATIVE_ONLY },
          { role: "user", content: `Company: ${company.name} — ${company.sectorLong}, ${company.stage}, ${company.geo}. Period: ${period}.\n\n${JSON.stringify(pack)}` },
        ],
      }),
    });

    if (!r.ok) {
      res.status(200).json({ live: false, error: await r.text(), pack: fallbackNarrative(pack, company) });
      return;
    }

    const json = await r.json();
    const raw = (json.choices?.[0]?.message?.content || "").replace(/```json|```/g, "").trim();
    const merged = applyNarrative(pack, JSON.parse(raw));

    // A model that returns neither field leaves the pack without prose. Fall
    // back rather than ship a board pack with an empty executive summary.
    if (!merged.executiveSummary || !merged.outlook) {
      res.status(200).json({ live: false, pack: fallbackNarrative(pack, company) });
      return;
    }

    res.status(200).json({ live: true, model: MODEL, pack: merged });
  } catch (e) {
    res.status(200).json({ live: false, error: e.message, pack: fallbackNarrative(pack, company) });
  }
}
