// /api/ai/boardpack.js — generates a full board pack for a company using Grok,
// returns structured JSON that the frontend renders + exports as PDF.

const XAI_URL = "https://api.x.ai/v1/chat/completions";
const MODEL = "grok-2-1212";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }

  const apiKey = process.env.XAI_API_KEY;
  const { company = {}, finance = {}, period = "Q2 2026" } = req.body || {};

  const prompt = `Generate a comprehensive board pack for the following portfolio company.
Return ONLY valid JSON in this exact structure, no markdown, no preamble:

{
  "executiveSummary": "2-3 sentence summary of company status and key headline",
  "keyMetrics": [
    {"label": "MRR", "value": "£261k", "vs": "target £300k", "rag": "amber"},
    {"label": "Runway", "value": "4.8mo", "vs": "target 6mo", "rag": "red"},
    {"label": "Headcount", "value": "29", "vs": "plan 32", "rag": "amber"},
    {"label": "Gross Margin", "value": "71%", "vs": "target 75%", "rag": "amber"}
  ],
  "risks": [
    {"title": "Risk title", "detail": "2 sentence description", "severity": "high"},
    {"title": "Risk title", "detail": "2 sentence description", "severity": "medium"}
  ],
  "opportunities": [
    {"title": "Opportunity title", "detail": "2 sentence description"}
  ],
  "actions": [
    {"action": "Specific action", "owner": "CFO", "deadline": "30 Jun 2026", "priority": "critical"},
    {"action": "Specific action", "owner": "CEO", "deadline": "15 Jul 2026", "priority": "high"}
  ],
  "outlook": "2 sentence forward-looking statement"
}

Company data:
Name: ${company.name || "Portfolio Company"}
Sector: ${company.sector || "Technology"}
Stage: ${company.stage || "Series A"}
Health score: ${company.score || 62}/100
RAG: ${company.rag || "AMBER"}
Runway: ${company.runway || "4.8 months"}
Revenue vs budget: ${company.revVsBudget || "87%"}
EBITDA: ${company.ebitda || "-8%"}
Headcount: ${company.headcount || 29}
MRR: ${finance.mrr || "£261k"}
Cash: ${finance.cash || "£413k"}
Overdue AR: ${finance.overdueAR || "£7.2k"}

Period: ${period}`;

  if (!apiKey) {
    // Rich fallback so the demo never breaks
    res.status(200).json({
      live: false,
      pack: fallbackPack(company, period),
    });
    return;
  }

  try {
    const r = await fetch(XAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        messages: [
          { role: "system", content: "You are a PE/VC board pack writer. Return only valid JSON, no markdown fences, no preamble." },
          { role: "user", content: prompt },
        ],
      }),
    });

    const json = await r.json();
    const raw = json.choices?.[0]?.message?.content || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const pack = JSON.parse(clean);
    res.status(200).json({ live: true, model: MODEL, pack });
  } catch (e) {
    res.status(200).json({ live: false, error: e.message, pack: fallbackPack(company, period) });
  }
}

function fallbackPack(company, period) {
  const name = company.name || "Meridian SaaS";
  return {
    executiveSummary: `${name} is operating at 87% of revenue budget with cash runway at 4.8 months, requiring immediate focus on burn reduction and AR collection. The core product metrics remain strong but financial discipline is the critical near-term priority.`,
    keyMetrics: [
      { label: "MRR", value: "£261k", vs: "target £300k", rag: "amber" },
      { label: "Runway", value: "4.8mo", vs: "target 6mo", rag: "red" },
      { label: "Gross Margin", value: "71%", vs: "target 75%", rag: "amber" },
      { label: "Headcount", value: "29", vs: "plan 32", rag: "green" },
    ],
    risks: [
      { title: "Liquidity", detail: "At current burn, runway reaches critical threshold in under 60 days without corrective action. Bridge financing should be pre-positioned now.", severity: "high" },
      { title: "Revenue concentration", detail: "Top 3 accounts represent 61% of ARR. Loss of any single account would materially impact runway and require immediate restructuring.", severity: "medium" },
    ],
    opportunities: [
      { title: "Upsell to existing base", detail: "Enterprise tier adoption is at 23% of eligible accounts. Targeted upsell programme could add £35-50k MRR within 90 days at near-zero CAC." },
    ],
    actions: [
      { action: "Initiate bridge financing with lead investor", owner: "CEO", deadline: "30 Jun 2026", priority: "critical" },
      { action: "Collect £7.2k overdue AR — DIISR and Rex Media Group priority", owner: "CFO", deadline: "07 Jul 2026", priority: "high" },
      { action: "Launch enterprise upsell campaign to top 10 accounts", owner: "Sales", deadline: "15 Jul 2026", priority: "high" },
    ],
    outlook: `${name} has a credible path to financial stability if burn is addressed in Q3. The product and team quality remain the fund's key conviction; the current challenges are operational, not structural.`,
  };
}
