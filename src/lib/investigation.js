// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Root Cause Investigation
//  ----------------------------------------------------------------------------
//  The Investigation Agent's reasoning chain, computed rather than written.
//
//  Agents.jsx previously held the chain as three hand-typed arrays of strings.
//  They had drifted: Meridian's cash was quoted at £412k against a seed of
//  £663k, and CareOS's monthly revenue gap was given as £253k when £253k is its
//  budget and the gap is £91k. A screen whose selling point is that the agent
//  investigates cannot be the one screen carrying numbers nothing checks.
//
//  Every line below is derived from buildFinance(), so the chain agrees with
//  the finance drill-down by construction, and each candidate cause carries the
//  arithmetic that ranked it. The agent's conclusion is the largest quantified
//  contributor, not a sentence chosen in advance.
// ════════════════════════════════════════════════════════════════════════════

import { buildFinance } from "./financeData.js";
import { companyById, COMPANIES, financeOf } from "./companies.js";
import { fmtMoney } from "./fx.js";

/**
 * A quantified investigation into one company.
 *
 * @param {string} id            company id from the registry
 * @param {object} opts          passed through to buildFinance (reportingCurrency)
 * @returns {{company, fin, currency, steps, contributions, rootCause, actions}}
 */
export function buildInvestigation(id, opts = {}) {
  const company = companyById(id);
  if (!company) throw new Error(`buildInvestigation: unknown company "${id}"`);

  const fin = buildFinance({ id, status: company.rag.toLowerCase() }, opts);
  const ccy = fin.currency;
  const m = (v) => fmtMoney(v, ccy, { k: true });

  const { cash, revenue, ebitda, people, sales } = fin;
  const firstCash = fin.history.cash[0];
  const firstEbitda = fin.history.ebitda[0];

  const revenueGap = revenue.budget - revenue.total;
  const varPct = (revenue.total / revenue.budget - 1) * 100;
  const marginMove = ebitda.grossMargin - firstEbitda.grossMarginPct;
  const burnMove = cash.burn - firstCash.burn;
  const cashMove = cash.balance - firstCash.balance;
  const peopleGap = people.planHeadcount - people.headcount;
  const coverageMove = sales.pipelineCoverage - sales.coverageFrom;
  const winRateMove = sales.winRatePct - sales.winRateFrom;
  const worstDebtor = cash.debtors.slice().sort((a, b) => b.daysOverdue - a.daysOverdue)[0];
  const months = fin.history.months.length;

  // ── Candidate causes ──────────────────────────────────────────────────────
  // Ranked on a common basis: the effect each has on cash in a single month.
  // Receivables are a stock rather than a flow, so the overdue balance is
  // spread across a quarter to make it comparable — stated in `basis` so the
  // comparison is visible rather than assumed.
  const candidates = [
    {
      key: "revenue",
      label: "Revenue against plan",
      impact: Math.max(0, revenueGap),
      basis: `Plan ${m(revenue.budget)} less actual ${m(revenue.total)} = ${m(revenueGap)} per month`,
      applies: varPct < -2,
    },
    {
      key: "margin",
      label: "Margin erosion",
      impact: marginMove < 0 ? (revenue.total * Math.abs(marginMove)) / 100 : 0,
      basis: `Gross margin ${firstEbitda.grossMarginPct}% → ${ebitda.grossMargin}% on ${m(revenue.total)} of revenue`,
      applies: marginMove < -1,
    },
    {
      key: "burn",
      label: "Cost base",
      impact: Math.max(0, burnMove),
      basis: `Net burn ${m(firstCash.burn)} → ${m(cash.burn)} over ${months} months`,
      applies: burnMove > 0,
    },
    {
      key: "receivables",
      label: "Receivables",
      impact: cash.overdueTotal / 3,
      basis: `${m(cash.overdueTotal)} overdue across ${cash.debtors.length} accounts, spread over a quarter for comparison`,
      applies: !!worstDebtor && worstDebtor.daysOverdue > 45,
    },
  ];

  const contributions = candidates
    .filter((c) => c.applies && c.impact > 0)
    .map((c) => ({ ...c, impact: Math.round(c.impact) }))
    .sort((a, b) => b.impact - a.impact);

  const total = contributions.reduce((t, c) => t + c.impact, 0) || 1;
  contributions.forEach((c) => { c.share = Math.round((c.impact / total) * 100); });

  const primary = contributions[0] ?? null;
  const secondary = contributions[1] ?? null;

  // Whether there is anything to explain. Overdue receivables and a rising cost
  // base exist at every company in the portfolio, so a ranking on its own will
  // always nominate a culprit. Without a breach to account for, the same lines
  // are watch items rather than causes, and the agent says so — an agent that
  // finds a root cause at a company with two and a half years of runway is one
  // nobody believes the second time.
  // Nine months is the same runway threshold the board pack raises a liquidity
  // risk at, so the two cannot disagree about whether a company is in trouble.
  const underStress = fin.runway < 9 || varPct < -2 || marginMove < -2;

  // ── The visible reasoning chain ───────────────────────────────────────────
  const steps = [];
  const say = (icon, kind, text) => steps.push({ icon, kind, text });

  say("🔍", "fetch", `Fetching all connected data for ${company.name} — ${months} months to ${fin.asOf}, reported in ${ccy}.`);

  say("📊", "finding",
    `Cash ${m(cash.balance)} against net burn ${m(cash.burn)} per month. Runway ${fin.runway} months. ` +
    `Cash has moved ${cashMove >= 0 ? "up" : "down"} ${m(Math.abs(cashMove))} since ${fin.history.months[0]}.`);

  say("📈", "finding",
    `Revenue ${m(revenue.total)} against plan ${m(revenue.budget)} — ${varPct >= 0 ? "+" : ""}${varPct.toFixed(1)}% ` +
    `(${varPct < 0 ? `a shortfall of ${m(revenueGap)}` : `ahead by ${m(-revenueGap)}`} per month).`);

  say("🧾", "finding",
    `Gross margin ${ebitda.grossMargin}%, ${marginMove >= 0 ? "up" : "down"} ${Math.abs(marginMove).toFixed(1)} points from ` +
    `${firstEbitda.grossMarginPct}%. EBITDA ${m(ebitda.value)} at ${ebitda.pct}% of revenue.`);

  if (worstDebtor) {
    say("🔗", "finding",
      `${m(cash.overdueTotal)} of receivables overdue across ${cash.debtors.length} accounts. Oldest: ` +
      `${worstDebtor.party}, ${worstDebtor.daysOverdue} days on invoice ${worstDebtor.invoice}.`);
  }

  say("👥", "finding",
    `Headcount ${people.headcount} against a plan of ${people.planHeadcount}` +
    `${peopleGap > 0 ? ` — ${peopleGap} roles unfilled` : ""}. Attrition ${people.attritionPct}%.`);

  say("🎯", "finding",
    `Pipeline coverage ${sales.pipelineCoverage}× (from ${sales.coverageFrom}×, ${coverageMove >= 0 ? "+" : ""}${coverageMove.toFixed(1)}). ` +
    `Win rate ${sales.winRatePct}% (from ${sales.winRateFrom}%, ${winRateMove >= 0 ? "+" : ""}${winRateMove.toFixed(1)} points).`);

  const noBreach =
    `No threshold is breached. Runway is ${fin.runway} months, revenue is ` +
    `${varPct >= 0 ? "+" : ""}${varPct.toFixed(1)}% against plan and gross margin is ${ebitda.grossMargin}% ` +
    `against ${firstEbitda.grossMarginPct}% at the start of the period.`;

  const rootCause = !underStress
    ? primary
      ? `${noBreach} Nothing here requires a root cause. Largest item on the watch list is ` +
        `${primary.label.toLowerCase()} at ${m(primary.impact)} a month — ${primary.basis}.`
      : noBreach
    : primary
      ? `${primary.label} is the largest single contributor at ${m(primary.impact)} a month, ` +
        `${primary.share}% of the ${m(total)} of quantified monthly pressure. ${primary.basis}.` +
        (secondary ? ` Second: ${secondary.label.toLowerCase()} at ${m(secondary.impact)} (${secondary.share}%). ${secondary.basis}.` : "")
      : `Runway is ${fin.runway} months but no single driver is quantifiable from the connected data. ` +
        `Revenue is ${varPct.toFixed(1)}% against plan and margin is ${ebitda.grossMargin}%.`;

  say("🧮", "rootCause", rootCause);

  // ── Actions, each pinned to a figure above ───────────────────────────────
  const actions = [];
  if (fin.runway < 9) {
    actions.push({
      action: `Model the funding requirement against ${fin.runway} months of runway and set a board decision date`,
      driver: "runway",
      owner: "CFO",
      rationale: `Cash ${m(cash.balance)}, burn ${m(cash.burn)} per month`,
      priority: fin.runway < 5 ? "critical" : "high",
    });
  }
  if (worstDebtor && worstDebtor.daysOverdue > 45) {
    actions.push({
      action: `Escalate ${m(cash.overdueTotal)} of overdue AR, starting with ${worstDebtor.party} at ${worstDebtor.daysOverdue} days`,
      driver: "receivables",
      owner: "CFO",
      rationale: `Collecting it outright adds ${(cash.overdueTotal / cash.burn).toFixed(1)} months of runway`,
      priority: "high",
    });
  }
  if (varPct < -2) {
    actions.push({
      action: `Re-forecast the quarter on the ${m(revenueGap)} monthly shortfall and brief the board before the scheduled meeting`,
      driver: "revenue",
      owner: "CEO",
      rationale: `Revenue ${varPct.toFixed(1)}% below plan`,
      priority: varPct < -15 ? "critical" : "high",
    });
  }
  if (coverageMove < -0.5 || winRateMove < -3) {
    actions.push({
      action: `Review pipeline generation and conversion — coverage ${sales.pipelineCoverage}×, win rate ${sales.winRatePct}%`,
      driver: "sales",
      owner: "CRO",
      rationale: `Coverage ${coverageMove.toFixed(1)} and win rate ${winRateMove.toFixed(1)} points against ${fin.history.months[0]}`,
      priority: "high",
    });
  }
  if (marginMove < -1) {
    actions.push({
      action: "Rank customers and products by contribution margin and identify the loss-makers",
      driver: "margin",
      owner: "CFO",
      rationale: `${Math.abs(marginMove).toFixed(1)} points of gross margin is ${m((revenue.total * 12 * Math.abs(marginMove)) / 100)} annualised`,
      priority: "medium",
    });
  }
  if (peopleGap > 0 && people.attritionPct > 12) {
    actions.push({
      action: `Close the ${peopleGap}-role gap to plan or restate the plan — attrition is running at ${people.attritionPct}%`,
      driver: "people",
      owner: "CEO",
      rationale: `Headcount ${people.headcount} against plan ${people.planHeadcount}`,
      priority: "medium",
    });
  }
  if (!actions.length) {
    actions.push({
      action: "No action required from the connected data — keep the company on the standard monthly cycle",
      driver: "none",
      owner: "Deal team",
      rationale: `Runway ${fin.runway} months, revenue ${varPct.toFixed(1)}% against plan`,
      priority: "low",
    });
  }

  actions.slice(0, 3).forEach((a) =>
    say("⚡", "action", `${a.action} — ${a.owner}. ${a.rationale}.`));

  return { company, fin, currency: ccy, steps, contributions, rootCause, actions, total, underStress };
}

/**
 * The companies worth investigating, worst first — so the demo's targets are
 * chosen by the data rather than pinned to three ids that may go green.
 */
/**
 * The actions the portfolio most needs this week, worst company first.
 *
 * Lives here rather than in the endpoint because both the browser and the
 * serverless function need it: the panel renders it on first paint without
 * waiting for the network, and /api/ai/agent returns the same rows so the
 * refresh button cannot produce a different list from the one already shown.
 */
export function attentionActions(limit = 5) {
  return stressRanked()
    .slice(0, limit)
    .map(({ id, name, runway, rvb }) => {
      const top = leadAction(buildInvestigation(id));
      return {
        company: name,
        companyId: id,
        severity: runway < 4 ? "critical" : runway < 9 || rvb < 90 ? "high" : "medium",
        action: top.action,
        owner: top.owner,
        rationale: top.rationale,
        // Quoted from the ledger's as-of month, not the wall clock, so a demo
        // run later still reads consistently with the data behind it.
        due: "30 Jun 2026",
      };
    });
}

/**
 * The one action to put in front of a partner.
 *
 * Not simply actions[0]: that is the funding action for every company inside
 * nine months of runway, which turned the attention panel into four identical
 * rows. A critical liquidity position still leads, but below that the action
 * shown is the one addressing the company's own largest driver — so five rows
 * name five different problems, as they should.
 */
export function leadAction(inv) {
  const critical = inv.actions.find((a) => a.priority === "critical");
  if (critical) return critical;

  // A rising cost base and an eroding margin are answered by the same review.
  const wanted = { burn: "margin", margin: "margin", revenue: "revenue", receivables: "receivables" };
  for (const c of inv.contributions) {
    const match = inv.actions.find((a) => a.driver === wanted[c.key]);
    if (match) return match;
  }
  return inv.actions[0];
}

/** Companies ordered by distance from comfortable — short runway, missed plan. */
function stressRanked() {
  return COMPANIES
    .map((c) => {
      const f = financeOf(c.id);
      const runwayStress = Math.max(0, 12 - f.runway) / 12;
      const revenueStress = Math.max(0, 100 - f.rvb) / 100;
      return { id: c.id, name: c.name, rag: c.rag, runway: f.runway, rvb: f.rvb, stress: runwayStress + revenueStress };
    })
    .filter((x) => x.stress > 0)
    .sort((a, b) => b.stress - a.stress);
}

export function investigationTargets(limit = 3) {
  // Ranked by the same measure as the attention list, so a company that goes
  // green drops out of the demo on its own rather than by anyone editing it.
  return stressRanked()
    .slice(0, limit)
    .map((t) => ({
      id: t.id,
      label: `${t.name} — ${t.runway}mo runway, revenue ${t.rvb}% of plan`,
      rag: t.rag,
    }));
}
