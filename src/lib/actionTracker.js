// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Action tracker, closed
//  ----------------------------------------------------------------------------
//  The specification's component 6 asks for owner, deadline, status AND
//  "subsequent metric movement". The first three existed. The fourth is the one
//  that matters: an action tracker that never checks whether the thing it was
//  raised about actually moved is a to-do list, and a fund does not buy a
//  platform for a to-do list.
//
//  So every action here names the KPI it was raised against, records that KPI's
//  value on the day it was raised, and reads the current value from the same
//  ledger the rest of the app uses. The verdict — working, no change, worse —
//  is computed from those two numbers, not set by whoever owns the action.
//
//  The baseline is read from the ledger at the month the action was raised,
//  so it is a real historic value rather than a number stored alongside the
//  action and free to drift from it.
// ════════════════════════════════════════════════════════════════════════════

import { buildFinance } from "./financeData.js";
import { companyById, COMPANIES } from "./companies.js";
import { fmtMoney } from "./fx.js";

/** How a KPI is read, and which direction counts as improvement. */
const METRICS = {
  runway:    { label: "Cash runway", unit: "mo", better: "up",
               read: (f, i) => i == null ? f.runway : +(f.history.cash[i].balance / f.history.cash[i].burn).toFixed(1) },
  burn:      { label: "Monthly net burn", unit: "money", better: "down",
               read: (f, i) => i == null ? f.cash.burn : f.history.cash[i].burn },
  revenue:   { label: "Revenue against plan", unit: "%", better: "up",
               read: (f, i) => i == null
                 ? Math.round((f.revenue.total / f.revenue.budget) * 100)
                 : Math.round((f.history.revenue[i].actual / f.history.revenue[i].budget) * 100) },
  grossMargin: { label: "Gross margin", unit: "%", better: "up",
               read: (f, i) => i == null ? f.ebitda.grossMargin : f.history.ebitda[i].grossMarginPct },
  attrition: { label: "Attrition", unit: "%", better: "down",
               read: (f, i) => i == null ? f.people.attritionPct : f.people.history[i].attritionPct },
  coverage:  { label: "Pipeline coverage", unit: "x", better: "up",
               read: (f, i) => i == null ? f.sales.pipelineCoverage : f.sales.history[i].pipelineCoverage },
  winRate:   { label: "Win rate", unit: "%", better: "up",
               read: (f, i) => i == null ? f.sales.winRatePct : f.sales.history[i].winRatePct },
  headcount: { label: "Headcount against plan", unit: "", better: "up",
               read: (f, i) => i == null ? f.people.headcount : f.people.history[i].headcount },
};

/**
 * The actions on file.
 *
 * `raisedMonthsAgo` locates the baseline in the ledger. Everything else about
 * the outcome is computed.
 */
const ACTIONS = [
  // Cash and funding
  { id: "a1", company: "careos",     metric: "runway",      raisedMonthsAgo: 5, owner: "CFO", due: "30 Jun 2026", status: "in_progress", priority: "critical",
    title: "Model the funding requirement and agree a board decision date" },
  { id: "a2", company: "meridian",   metric: "runway",      raisedMonthsAgo: 6, owner: "CFO", due: "07 Jul 2026", status: "in_progress", priority: "high",
    title: "Escalate overdue receivables across the five largest accounts" },
  { id: "a3", company: "nusantara",  metric: "burn",        raisedMonthsAgo: 5, owner: "CFO", due: "19 Jun 2026", status: "open", priority: "high",
    title: "Establish why net burn has doubled and what stops it" },
  { id: "a4", company: "khaleej",    metric: "burn",        raisedMonthsAgo: 6, owner: "COO", due: "30 Sep 2026", status: "in_progress", priority: "medium",
    title: "Consolidate the three cloud contracts onto one agreement" },

  // Commercial
  { id: "a5", company: "careos",     metric: "revenue",     raisedMonthsAgo: 4, owner: "CEO", due: "15 Jul 2026", status: "in_progress", priority: "critical",
    title: "Interim sales leadership appointed and the quarter re-forecast" },
  { id: "a6", company: "straits",    metric: "coverage",    raisedMonthsAgo: 4, owner: "CRO", due: "05 Jun 2026", status: "in_progress", priority: "high",
    title: "Weekly pipeline inspection until coverage returns above 2.5x" },
  { id: "a7", company: "straits",    metric: "winRate",     raisedMonthsAgo: 4, owner: "CRO", due: "12 Jun 2026", status: "open", priority: "high",
    title: "Deal-by-deal review of the eight largest open opportunities" },
  { id: "a8", company: "zafira",     metric: "revenue",     raisedMonthsAgo: 3, owner: "VP Sales", due: "31 Jul 2026", status: "open", priority: "medium",
    title: "Launch the second-product campaign to the qualified accounts" },

  // Margin
  { id: "a9", company: "forgetech",  metric: "grossMargin", raisedMonthsAgo: 6, owner: "CFO", due: "19 Jun 2026", status: "in_progress", priority: "high",
    title: "Rank customers and products by contribution margin" },
  { id: "a10", company: "khaleej",   metric: "grossMargin", raisedMonthsAgo: 8, owner: "COO", due: "31 Mar 2026", status: "done", priority: "medium",
    title: "Reprice the vessel maintenance contracts at renewal" },

  // People — the recruitment and retention actions, which are the ones working
  { id: "a11", company: "meridian",  metric: "headcount",   raisedMonthsAgo: 8, owner: "CEO", due: "30 Apr 2026", status: "done", priority: "high",
    title: "Fill the six open roles, Head of Sales first" },
  { id: "a12", company: "careos",    metric: "headcount",   raisedMonthsAgo: 8, owner: "CEO", due: "31 May 2026", status: "in_progress", priority: "high",
    title: "Rebuild the sales team after the rep departures" },
  { id: "a13", company: "payflo",    metric: "attrition",   raisedMonthsAgo: 5, owner: "COO", due: "31 Mar 2026", status: "done", priority: "medium",
    title: "Retention package for the engineering team" },
  { id: "a14", company: "forgetech", metric: "attrition",   raisedMonthsAgo: 8, owner: "COO", due: "30 Apr 2026", status: "done", priority: "medium",
    title: "Shift-pattern review across the two plants" },
  { id: "a15", company: "swiftlogix", metric: "attrition",  raisedMonthsAgo: 8, owner: "COO", due: "10 Jul 2026", status: "in_progress", priority: "high",
    title: "Comp benchmarking for drivers after the depot attrition" },
];


const r1 = (v) => Math.round(v * 10) / 10;

function fmt(value, unit, ccy) {
  if (unit === "money") return fmtMoney(value, ccy, { k: true });
  if (unit === "%") return `${value}%`;
  if (unit === "x") return `${value}×`;
  if (unit === "mo") return `${value} mo`;
  return String(value);
}

/**
 * Every action, with the movement of the KPI it was raised against.
 *
 * @returns {Array} actions carrying baseline, current, change and a verdict
 */
export function trackedActions(opts = {}) {
  return ACTIONS.map((a) => {
    const co = companyById(a.company);
    const fin = buildFinance({ id: a.company, status: co.rag.toLowerCase() }, opts);
    const metric = METRICS[a.metric];

    // Locate the baseline in the ledger at the month the action was raised.
    const months = fin.history.months.length;
    const idx = Math.max(0, months - 1 - a.raisedMonthsAgo);
    const baseline = metric.read(fin, idx);
    const current = metric.read(fin, null);

    const delta = r1(current - baseline);
    const pctMove = baseline === 0 ? 0 : (delta / Math.abs(baseline)) * 100;
    const improved = metric.better === "up" ? delta > 0 : delta < 0;

    // "No change" is a band, not a point. A metric that has moved less than 2%
    // since the action was raised has not responded to it in any way a partner
    // should be told about.
    const material = Math.abs(pctMove) >= 2;
    const verdict = !material ? "no-change" : improved ? "working" : "worse";

    return {
      ...a,
      companyName: co.name,
      currency: fin.currency,
      metricLabel: metric.label,
      metricUnit: metric.unit,
      better: metric.better,
      raisedOn: fin.history.months[idx],
      asOf: fin.asOf,
      monthsElapsed: a.raisedMonthsAgo,
      baseline, current, delta,
      pctMove: r1(pctMove),
      verdict,
      baselineLabel: fmt(baseline, metric.unit, fin.currency),
      currentLabel: fmt(current, metric.unit, fin.currency),
      deltaLabel: `${delta > 0 ? "+" : ""}${fmt(delta, metric.unit === "money" ? "money" : metric.unit, fin.currency)}`,
      // The sentence a partner reads. Written from the two numbers, not stored.
      outcome: !material
        ? `${metric.label} has not moved materially since this was raised — ${fmt(baseline, metric.unit, fin.currency)} then, ${fmt(current, metric.unit, fin.currency)} now, ${a.raisedMonthsAgo} months on.`
        : improved
          ? `${metric.label} has moved from ${fmt(baseline, metric.unit, fin.currency)} to ${fmt(current, metric.unit, fin.currency)} in the ${a.raisedMonthsAgo} months since — the direction the action intended.`
          : `${metric.label} has gone from ${fmt(baseline, metric.unit, fin.currency)} to ${fmt(current, metric.unit, fin.currency)} in the ${a.raisedMonthsAgo} months since. The action has not arrested it.`,
    };
  });
}

/** Portfolio-level summary of whether the actions are achieving anything. */
export function actionSummary(actions = trackedActions()) {
  const by = (v) => actions.filter((a) => a.verdict === v).length;
  const open = actions.filter((a) => a.status !== "done");
  return {
    total: actions.length,
    open: open.length,
    working: by("working"),
    noChange: by("no-change"),
    worse: by("worse"),
    // The number that makes this a closed loop rather than a list: of the
    // actions still open, how many have a metric that is actually responding.
    effectiveness: open.length ? Math.round((open.filter((a) => a.verdict === "working").length / open.length) * 100) : 0,
    // Completed actions are the fairer test of whether the loop works: an open
    // action has not had its full effect yet, and counting it as a failure
    // flatters nothing.
    completedTotal: actions.filter((a) => a.status === "done").length,
    completedWorking: actions.filter((a) => a.status === "done" && a.verdict === "working").length,
    companies: new Set(actions.map((a) => a.company)).size,
    portfolio: COMPANIES.length,
  };
}

export { METRICS };
