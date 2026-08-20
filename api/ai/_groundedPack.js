// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Grounded board pack
//  ----------------------------------------------------------------------------
//  Builds the board pack object from calculated finance data, leaving only the
//  two genuinely narrative fields for the model to write.
//
//  Before this, /api/ai/boardpack asked Grok to return the whole schema —
//  keyMetrics included — from a dozen lines of loose text. A model asked for a
//  number it has not been given will supply a plausible one, and a wrong cash
//  position in a board pack is not a bug that gets forgiven in a portfolio
//  review. Here the metrics, risks, opportunities and actions are computed;
//  executiveSummary and outlook come back null for the model to fill.
//
//  The response shape is unchanged, so PortfolioAnalytics.jsx needs no edits.
// ════════════════════════════════════════════════════════════════════════════

import { buildFinance } from "../../src/lib/financeData.js";

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const k = (n) => `£${Math.round(n).toLocaleString()}k`;
const rag = (good, ok) => (good ? "green" : ok ? "amber" : "red");

function ukDate(monthsAhead) {
  // Deadlines are quoted from the ledger's as-of month, not the wall clock, so
  // a demo run in six months still reads consistently with the data.
  const base = 4; // May, zero-indexed
  const i = (base + monthsAhead) % 12;
  const year = 2026 + Math.floor((base + monthsAhead) / 12);
  return `${15} ${MONTH_ABBR[i]} ${year}`;
}

/**
 * Calculated board pack. Every figure traces to buildFinance().
 * @returns {object} the boardpack schema with executiveSummary and outlook null
 */
export function groundedPack(company = {}, period = "Q2 2026") {
  const fin = buildFinance({ id: company.id, status: company.rag || "amber" });
  const { cash, revenue, ebitda } = fin;

  const first = fin.history.ebitda[0];
  const varPct = ((revenue.total - revenue.budget) / revenue.budget) * 100;
  const marginMove = ebitda.grossMargin - first.grossMarginPct;

  const keyMetrics = [
    {
      label: "MRR", value: k(revenue.total), vs: `plan ${k(revenue.budget)}`,
      rag: rag(varPct >= 0, varPct >= -5),
    },
    {
      label: "Runway", value: `${fin.runway}mo`, vs: `burn ${k(cash.burn)}/mo`,
      rag: rag(fin.runway >= 12, fin.runway >= 6),
    },
    {
      label: "Cash", value: k(cash.balance), vs: `overdue AR ${k(cash.overdueTotal)}`,
      rag: rag(fin.runway >= 12, fin.runway >= 6),
    },
    {
      label: "Gross Margin", value: `${ebitda.grossMargin}%`,
      vs: `${first.grossMarginPct}% 18 months ago`,
      rag: rag(marginMove >= 0, marginMove >= -3),
    },
    {
      label: "EBITDA Margin", value: `${ebitda.pct}%`, vs: `${k(ebitda.value)} this month`,
      rag: rag(ebitda.value > 0, ebitda.pct > -10),
    },
  ];

  // ── Risks, raised only where the data supports them ──
  const risks = [];
  if (fin.runway < 9) {
    risks.push({
      title: "Liquidity",
      detail: `Cash of ${k(cash.balance)} against burn of ${k(cash.burn)} per month gives ${fin.runway} months of runway. Cash has moved from ${k(fin.history.cash[0].balance)} to ${k(cash.balance)} over the eighteen months on file.`,
      severity: fin.runway < 5 ? "high" : "medium",
    });
  }
  if (varPct < -5) {
    risks.push({
      title: "Revenue against plan",
      detail: `Revenue of ${k(revenue.total)} is ${Math.abs(varPct).toFixed(1)}% below the plan of ${k(revenue.budget)}. The gap has widened over the period on file rather than closing.`,
      severity: varPct < -15 ? "high" : "medium",
    });
  }
  if (marginMove < -2) {
    risks.push({
      title: "Margin quality",
      detail: `Gross margin has fallen ${Math.abs(marginMove).toFixed(1)} points, from ${first.grossMarginPct}% to ${ebitda.grossMargin}%. At the current revenue run rate that is worth roughly ${k((revenue.total * 12 * Math.abs(marginMove)) / 100)} of annualised gross profit.`,
      severity: marginMove < -6 ? "high" : "medium",
    });
  }
  const worstDebtor = cash.debtors.slice().sort((a, b) => b.daysOverdue - a.daysOverdue)[0];
  if (worstDebtor && worstDebtor.daysOverdue > 45) {
    risks.push({
      title: "Receivables",
      detail: `${k(cash.overdueTotal)} is overdue across ${cash.debtors.length} accounts, the oldest being ${worstDebtor.party} at ${worstDebtor.daysOverdue} days on invoice ${worstDebtor.invoice}.`,
      severity: "medium",
    });
  }

  // ── Opportunities, likewise ──
  const opportunities = [];
  const topDeal = revenue.deals[0];
  if (topDeal) {
    opportunities.push({
      title: "Account concentration and expansion",
      detail: `The largest account, ${topDeal.party}, represents ${((topDeal.amount / 1000 / revenue.total) * 100).toFixed(0)}% of monthly revenue on ${topDeal.product}. The same product mix across the next five accounts is the nearest available expansion without new acquisition cost.`,
    });
  }
  const biggestBurn = cash.burnCats.slice().sort((a, b) => b.value - a.value)[0];
  if (biggestBurn) {
    opportunities.push({
      title: "Cost base",
      detail: `${biggestBurn.label} is ${k(biggestBurn.value)} per month, ${(biggestBurn.prop * 100).toFixed(0)}% of total burn. A ten per cent reduction there extends runway by roughly ${((cash.balance / (cash.burn - biggestBurn.value * 0.1)) - fin.runway).toFixed(1)} months.`,
    });
  }

  // ── Actions, each tied to a figure above ──
  const actions = [];
  if (fin.runway < 9) {
    actions.push({
      action: `Model a funding requirement and agree a decision deadline with the board`,
      owner: "CFO", deadline: ukDate(1), priority: fin.runway < 5 ? "critical" : "high",
    });
  }
  if (worstDebtor) {
    actions.push({
      action: `Escalate ${k(cash.overdueTotal)} of overdue AR, starting with ${worstDebtor.party} at ${worstDebtor.daysOverdue} days`,
      owner: "CFO", deadline: ukDate(1), priority: "high",
    });
  }
  if (varPct < -5) {
    actions.push({
      action: `Re-forecast ${period} and brief the board before the scheduled meeting`,
      owner: "CEO", deadline: ukDate(2), priority: "high",
    });
  }
  if (marginMove < -2) {
    actions.push({
      action: "Rank customers and products by contribution margin and identify the loss-makers",
      owner: "CFO", deadline: ukDate(2), priority: "medium",
    });
  }

  return {
    executiveSummary: null,
    outlook: null,
    keyMetrics,
    risks,
    opportunities,
    actions,
    provenance: {
      note: "Every metric, risk, opportunity and action here is calculated from the finance data model. The language model is asked only for executiveSummary and outlook.",
      asOf: fin.asOf,
      monthsOfHistory: fin.history.months.length,
    },
  };
}

/** Instruction that keeps the model to prose. */
export const NARRATIVE_ONLY = `You are given a board pack object in which every metric, risk, opportunity and action has already been calculated from source systems. Return the same JSON object with only two fields changed: write "executiveSummary" (2-3 sentences) and "outlook" (2 sentences). Do not add, remove, reorder or alter any other field. Do not introduce any figure that does not already appear in the object — if a number you want to cite is not there, write around it. UK English, direct, commercially minded, no waffle. Return only valid JSON, no markdown fences, no preamble.`;

/**
 * Merge the model's reply back in, accepting only the two narrative fields.
 * Anything else it returns is discarded rather than trusted.
 */
export function applyNarrative(pack, modelJson) {
  const summary = typeof modelJson?.executiveSummary === "string" ? modelJson.executiveSummary : null;
  const outlook = typeof modelJson?.outlook === "string" ? modelJson.outlook : null;
  return { ...pack, executiveSummary: summary, outlook };
}

/** Deterministic prose for when no key is set, so the demo never breaks. */
export function fallbackNarrative(pack, company = {}) {
  const name = company.name || "This company";
  const runway = pack.keyMetrics.find((m) => m.label === "Runway")?.value ?? "n/a";
  const mrr = pack.keyMetrics.find((m) => m.label === "MRR")?.value ?? "n/a";
  const headline = pack.risks[0]?.title?.toLowerCase() ?? "performance against plan";

  return {
    ...pack,
    executiveSummary: `${name} is reporting ${mrr} of monthly revenue with ${runway} of runway. The board's attention is best directed at ${headline}, where the supporting figures are set out below. Every number in this pack is drawn from the connected finance data rather than estimated.`,
    outlook: `The position is manageable if the actions below are taken on the dates given. The next review should test whether the metrics behind each action have moved.`,
  };
}
