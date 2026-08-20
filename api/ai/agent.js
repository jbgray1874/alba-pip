// ════════════════════════════════════════════════════════════════════════════
//  /api/ai/agent — the AI agents, grounded
//  ----------------------------------------------------------------------------
//  Called with { type, companyId, question }. The numbers are NOT accepted from
//  the caller: the id is checked against the registry and everything else is
//  computed here from the finance model, so the analysis cannot disagree with
//  the screen the user is looking at.
//
//  What this replaces: the prompt was built from six lines of caller-supplied
//  strings, each defaulting to Meridian's values when absent — so an incomplete
//  payload was analysed as Meridian under another company's name — while the
//  system prompt told the model to "always cite the data you're using" and be
//  "specific — not generic". It had almost nothing to be specific about.
//
//  Legacy callers that still send { company, data } keep working: the id is
//  read from company.id and the supplied figures are ignored.
//
//  Every branch has a deterministic fallback computed from the same data, so
//  with no API key set the answers are correct rather than merely present.
// ════════════════════════════════════════════════════════════════════════════

import { companyContext, portfolioContext, attentionList, GROUNDING_RULE } from "./_context.js";
import { buildInvestigation, attentionActions } from "../../src/lib/investigation.js";
import { fmtMoney } from "../../src/lib/fx.js";

const XAI_URL = "https://api.x.ai/v1/chat/completions";
const MODEL = "grok-2-1212";

const SYSTEM = `You are an AI portfolio analyst for Alba PIP, the portfolio intelligence platform used by Caledonia Alba. You are given data that has already been calculated from the fund's connected source systems — accounting, banking, CRM and HRIS. You reason over that data and nothing else. ${GROUNDING_RULE}`;

const gbp = (v) => fmtMoney(v, "GBP", { k: true });

/**
 * Build the prompt and a deterministic fallback from the same grounded data,
 * so the two can never tell different stories.
 */
function plan(type, companyId, question) {
  const ctx = companyId ? companyContext(companyId) : null;

  if (type === "investigate" && ctx) {
    const inv = buildInvestigation(companyId);
    return {
      prompt:
        `${ctx.text}\n\n` +
        `The investigation has already run and reached this conclusion:\n${inv.rootCause}\n\n` +
        `Quantified contributors: ${inv.contributions.map((c) => `${c.label} ${c.share}%`).join(", ") || "none"}\n\n` +
        `Write a three-sentence executive summary of the finding, then name the single most ` +
        `important action for the fund manager in the next 48 hours. Do not contradict the ` +
        `conclusion above.`,
      fallback:
        `${inv.rootCause}\n\nPriority action: ${inv.actions[0].action} (${inv.actions[0].owner}). ` +
        `${inv.actions[0].rationale}.`,
      grounded: { rootCause: inv.rootCause, contributions: inv.contributions, actions: inv.actions },
    };
  }

  if (type === "boardpack" && ctx) {
    const inv = buildInvestigation(companyId);
    return {
      prompt:
        `${ctx.text}\n\nWrite the executive section of a board pack in exactly this shape:\n\n` +
        `**EXECUTIVE SUMMARY**\n[2-3 sentences]\n\n**PERFORMANCE SCORECARD**\n[5 KPI bullets, each with a RAG marker]\n\n` +
        `**KEY RISKS THIS QUARTER**\n[3 risks, each citing a figure from the data]\n\n` +
        `**ACTIONS FOR BOARD RESOLUTION**\n[3 actions with owners]\n\n**OUTLOOK**\n[2 sentences]`,
      fallback: boardPackText(ctx, inv),
      grounded: { asOf: ctx.fin.asOf },
    };
  }

  if (type === "attention") {
    const p = portfolioContext();
    return {
      prompt:
        `${p.text}\n\nList the five actions the fund most needs to take across the portfolio this ` +
        `week. One line each: company, severity, action, owner. Order them by urgency.`,
      fallback: attentionText(),
      // The caller renders rows, not prose, so the calculated list travels with
      // the answer. AttentionPanel had four hardcoded actions quoting "£7.2k
      // overdue AR — DIISR and Rex Media Group"; Meridian's overdue balance is
      // £73k and no debtor of that name exists in the ledger.
      actions: attentionActions(),
      grounded: { companies: p.rows.length },
    };
  }

  // qa — company-scoped when an id is given, portfolio-wide otherwise
  const body = ctx ? ctx.text : portfolioContext().text;
  const q = question || "Summarise the position.";
  return {
    prompt: `${body}\n\nQuestion: ${q}\n\nAnswer using only the data above. Cite the figures you rely on. End with the single most important action.`,
    fallback: ctx ? qaCompanyText(ctx) : qaPortfolioText(),
    grounded: { scope: ctx ? "company" : "portfolio" },
  };
}

// ── Deterministic answers, computed from the same model ─────────────────────

function boardPackText(ctx, inv) {
  const { fin, company: co } = ctx;
  const ccy = ctx.currency;
  const m = (v) => fmtMoney(v, ccy, { k: true });
  const varPct = (fin.revenue.total / fin.revenue.budget - 1) * 100;
  const rag = (good, ok) => (good ? "🟢" : ok ? "🟡" : "🔴");

  return [
    "**EXECUTIVE SUMMARY**",
    `${co.name} is reporting ${m(fin.revenue.total)} of monthly revenue against a plan of ${m(fin.revenue.budget)} ` +
      `(${varPct >= 0 ? "+" : ""}${varPct.toFixed(1)}%), with ${m(fin.cash.balance)} of cash and ${fin.runway} months of runway. ` +
      `${inv.rootCause}`,
    "",
    "**PERFORMANCE SCORECARD**",
    `• Revenue: ${m(fin.revenue.total)} vs plan ${m(fin.revenue.budget)} ${rag(varPct >= 0, varPct >= -5)}`,
    `• Runway: ${fin.runway} months on burn of ${m(fin.cash.burn)} ${rag(fin.runway >= 12, fin.runway >= 6)}`,
    `• Gross margin: ${fin.ebitda.grossMargin}% ${rag(fin.ebitda.grossMargin >= 60, fin.ebitda.grossMargin >= 35)}`,
    `• EBITDA: ${m(fin.ebitda.value)} at ${fin.ebitda.pct}% ${rag(fin.ebitda.pct > 0, fin.ebitda.pct > -10)}`,
    `• Attrition: ${fin.people.attritionPct}% on headcount ${fin.people.headcount}/${fin.people.planHeadcount} ${rag(fin.people.attritionPct < 12, fin.people.attritionPct < 20)}`,
    "",
    inv.underStress ? "**KEY RISKS THIS QUARTER**" : "**WATCH LIST THIS QUARTER**",
    ...(inv.contributions.length
      ? inv.contributions.slice(0, 3).map((c) =>
          inv.underStress
            ? `• ${c.label} — ${m(c.impact)} a month, ${c.share}% of quantified pressure. ${c.basis}.`
            : `• ${c.label} — ${m(c.impact)} a month. ${c.basis}. No threshold breached.`)
      : ["• No threshold is breached and no driver is material this period."]),
    "",
    "**ACTIONS FOR BOARD RESOLUTION**",
    ...inv.actions.slice(0, 3).map((a) => `• ${a.action} — ${a.owner} (${a.priority}). ${a.rationale}.`),
    "",
    "**OUTLOOK**",
    `On the current run rate the position holds for ${fin.runway} months without intervention. ` +
      `The next review should test whether the metrics behind each action above have moved.`,
    "",
    `_Every figure above is calculated from connected source systems as at ${fin.asOf}, reported in ${ccy}._`,
  ].join("\n");
}

function qaCompanyText(ctx) {
  const { fin, company: co } = ctx;
  const m = (v) => fmtMoney(v, ctx.currency, { k: true });
  const varPct = (fin.revenue.total / fin.revenue.budget - 1) * 100;
  return (
    `${co.name} as at ${fin.asOf}: revenue ${m(fin.revenue.total)} against plan ${m(fin.revenue.budget)} ` +
    `(${varPct >= 0 ? "+" : ""}${varPct.toFixed(1)}%), cash ${m(fin.cash.balance)} on burn ${m(fin.cash.burn)} ` +
    `giving ${fin.runway} months of runway, gross margin ${fin.ebitda.grossMargin}% and EBITDA ${fin.ebitda.pct}%. ` +
    `Pipeline coverage is ${fin.sales.pipelineCoverage}× against ${fin.sales.coverageFrom}× eighteen months ago ` +
    `and attrition is ${fin.people.attritionPct}%.\n\n` +
    `No language model is configured, so this is the calculated position rather than an answer to the ` +
    `specific question. Set XAI_API_KEY to enable the analytical layer over the same figures.`
  );
}

function qaPortfolioText() {
  const list = attentionList(3);
  if (!list.length) return "No company in the portfolio is below plan on revenue or inside twelve months of runway.";
  const lead = list
    .map(({ c, f }) => `${c.name} (${f.runway} months of runway, revenue ${f.rvb}% of plan)`)
    .join("; ");
  return (
    `Ranked on runway and revenue against plan, the companies needing attention are: ${lead}.\n\n` +
    `${list[0].c.name} is first on both measures — cash ${gbp(list[0].f.cashK)} against burn ` +
    `${gbp(list[0].f.burnK)} a month. ${list[0].c.issue}\n\n` +
    `No language model is configured, so this is the calculated ranking rather than an answer to the ` +
    `specific question. Set XAI_API_KEY to enable the analytical layer over the same figures.`
  );
}

function attentionText() {
  return attentionActions()
    .map((a) => `${a.severity.toUpperCase()} · ${a.company} — ${a.action} (${a.owner}). ${a.rationale}.`)
    .join("\n");
}

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }

  const b = req.body || {};
  const type = b.type || "investigate";
  // Legacy callers send { company: {...} }; only its id is used.
  const companyId = b.companyId || b.company?.id || null;
  const question = b.question || b.data?.question || null;

  let built;
  try {
    built = plan(type, companyId, question);
  } catch (e) {
    res.status(400).json({ error: `Cannot ground this request: ${e.message}` });
    return;
  }

  // Calculated rows, where the branch produces them, travel with every reply —
  // live or not. The model's prose is an addition to them, never a substitute.
  const rows = built.actions ? { actions: built.actions } : {};

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    res.status(200).json({ text: built.fallback, live: false, grounded: built.grounded, ...rows });
    return;
  }

  try {
    const r = await fetch(XAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: built.prompt },
        ],
      }),
    });

    if (!r.ok) {
      res.status(200).json({ text: built.fallback, live: false, error: await r.text(), grounded: built.grounded, ...rows });
      return;
    }

    const json = await r.json();
    const text = json.choices?.[0]?.message?.content;
    res.status(200).json(
      text
        ? { text, live: true, model: MODEL, grounded: built.grounded, ...rows }
        : { text: built.fallback, live: false, grounded: built.grounded, ...rows }
    );
  } catch (e) {
    res.status(200).json({ text: built.fallback, live: false, error: e.message, grounded: built.grounded, ...rows });
  }
}

// Exported for scripts/verify.mjs, which exercises the no-key path.
export const _internal = { plan, SYSTEM };
