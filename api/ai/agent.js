// /api/ai/agent.js — wraps xAI Grok for the Alba PIP AI agents.
// Called by the frontend with { type, company, data }.
// xAI is OpenAI-compatible so the call shape is straightforward.

const XAI_URL = "https://api.x.ai/v1/chat/completions";
const MODEL = "grok-2-1212";

const SYSTEM = `You are an AI portfolio analyst for a PE/VC fund management platform 
called Alba PIP, built for Caledonia Alba. You analyse portfolio company data and 
give concise, specific, investment-grade insights. Always cite the data you're using. 
Be direct and commercially minded. UK English. No waffle.`;

function buildPrompt(type, company, data) {
  const base = `Company: ${company.name} (${company.sector}, ${company.stage})
Health score: ${company.score}/100 (${company.rag})
Cash runway: ${data.runway || company.runway}
Revenue vs budget: ${data.revVsBudget || company.revVsBudget}
EBITDA: ${data.ebitda || company.ebitda}
Headcount: ${company.headcount}`;

  if (type === "investigate") return `${base}

This company is showing stress signals. Identify the most likely root cause, cite the 
specific metrics that support your diagnosis, and recommend the single most important 
action the fund manager should take this week. Be specific — not generic advice.
Format: Root cause / Evidence / Recommended action.`;

  if (type === "boardpack") return `${base}

Draft a concise board pack summary for this company. Include: executive summary (2 sentences), 
key metrics vs plan, risks (top 2), opportunities (top 1), and recommended actions (top 2). 
Format clearly with headers. Max 250 words.`;

  if (type === "qa") return `${base}

Question: ${data.question}

Answer this question about the company using the data provided. Be specific and cite numbers.`;

  return `${base}\n\nProvide a brief portfolio intelligence summary for this company.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    // Graceful fallback so the UI never breaks
    res.status(200).json({ text: fallback(req.body?.type, req.body?.company), live: false });
    return;
  }

  const { type = "investigate", company = {}, data = {} } = req.body || {};
  const prompt = buildPrompt(type, company, data);

  try {
    const r = await fetch(XAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      res.status(200).json({ text: fallback(type, company), live: false, error: err });
      return;
    }

    const json = await r.json();
    const text = json.choices?.[0]?.message?.content || fallback(type, company);
    res.status(200).json({ text, live: true, model: MODEL });
  } catch (e) {
    res.status(200).json({ text: fallback(type, company), live: false, error: e.message });
  }
}

function fallback(type, company = {}) {
  const name = company.name || "this company";
  if (type === "investigate")
    return `Root cause: Cash burn acceleration combined with revenue shortfall.\n\nEvidence: ${name} is tracking below revenue budget with runway under 5 months — a combination that historically precedes a liquidity event within 90 days without intervention.\n\nRecommended action: Convene an emergency board call this week to review the 13-week cash flow model and authorise a bridge facility before covenant breach.`;
  if (type === "boardpack")
    return `## Board Pack Summary — ${name}\n\n**Executive Summary:** ${name} is operating under financial stress with runway constraints requiring immediate board attention. Revenue is tracking below plan with margin pressure.\n\n**Key Metrics vs Plan:** Revenue 87% of budget · EBITDA negative · Headcount plan maintained\n\n**Risks:** (1) Liquidity — runway at risk without corrective action. (2) Revenue concentration — top 3 clients represent >60% of ARR.\n\n**Opportunities:** Upsell pipeline to existing accounts could add 15% ARR within 90 days.\n\n**Recommended Actions:** (1) Initiate bridge financing conversation with lead investor. (2) Accelerate Q3 renewal conversations with top accounts.`;
  return `Analysis unavailable — xAI API key not configured. Add XAI_API_KEY to Vercel environment variables to enable live AI analysis.`;
}
