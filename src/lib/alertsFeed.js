// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Portfolio alerts and the open action list
//  ----------------------------------------------------------------------------
//  These two lists used to be typed arrays inside GPDashboard.jsx — eight
//  alerts and eight actions naming companies that no longer exist in the
//  registry, quoting a 2.3-month runway and a 36% revenue miss that appear
//  nowhere in the ledger. Two of the numbers contradicted the company page they
//  sat one click away from.
//
//  So both are derived here. An alert exists because a reading crossed a named
//  threshold; it carries the reading, the threshold and the system it was read
//  from, and it disappears when the reading recovers. There is no path through
//  this file that lets an alert be written for a company the data is content
//  with — which is the only reason anybody reads an alert list twice.
//
//  The action list is not re-derived: it is the tracker's own list, the same
//  rows the Alert and Action Tracker scores outcomes against, so the two cannot
//  disagree about what is open.
// ════════════════════════════════════════════════════════════════════════════

import { COMPANIES, companyById } from "./companies.js";
import { buildFinance } from "./financeData.js";
import { trackedActions } from "./actionTracker.js";
import { fmtMoney } from "./fx.js";

/**
 * The thresholds, named.
 *
 * Each is a level an investment committee would recognise rather than a level
 * chosen to make a given company light up. They are exported because the screen
 * shows them beside the alert — an alert whose threshold is invisible is an
 * opinion.
 */
export const THRESHOLDS = {
  runway:    { critical: 5,    high: 9,    watchlist: 12,  unit: "months",
               note: "Below nine months a funding conversation cannot wait for the next cycle" },
  revenue:   { critical: -15,  high: -5,   watchlist: -2,  unit: "% against plan",
               note: "More than five points under plan is a forecast problem rather than timing" },
  margin:    { high: -3,       watchlist: -1.5, unit: "points of gross margin",
               note: "Measured against the first month of the ledger, not the prior month" },
  coverage:  { high: 2.5,      watchlist: 3,    unit: "× pipeline coverage",
               note: "Below 2.5× a quarter cannot be covered at any realistic win rate" },
  attrition: { high: 20,       watchlist: 14,   unit: "% annualised",
               note: "Above 20% the company is rebuilding faster than it is building" },
  debtors:   { high: 60,       watchlist: 45,   unit: "days overdue",
               note: "Past 60 days the recovery rate falls sharply" },
  headcount: { watchlist: 3,   unit: "roles unfilled",
               note: "Three or more vacancies against plan is a capacity constraint" },
};

const SEVERITY_RANK = { critical: 0, high: 1, watchlist: 2 };

/** The department that owns each kind of alert — used to route it on screen. */
export const DEPARTMENT = {
  runway: "Finance", revenue: "Sales", margin: "Finance", coverage: "Sales",
  attrition: "People", debtors: "Finance", headcount: "People",
  burn: "Finance", grossMargin: "Finance", winRate: "Sales",
};

const r1 = (v) => Math.round(v * 10) / 10;

/**
 * Every threshold breach across the portfolio, worst first.
 *
 * @param {object} opts passed through to buildFinance so a fixture can be used
 * @returns {Array} alerts carrying the reading, the threshold and the source
 */
export function portfolioAlerts(opts = {}) {
  const rows = [];

  for (const co of COMPANIES) {
    const fin = buildFinance({ id: co.id, status: co.rag.toLowerCase() }, opts);
    const m = (v) => fmtMoney(v, fin.currency, { k: true });

    const varPct = (fin.revenue.total / fin.revenue.budget - 1) * 100;
    const marginMove = fin.ebitda.grossMargin - fin.history.ebitda[0].grossMarginPct;
    const worstDebtor = fin.cash.debtors.slice().sort((a, b) => b.daysOverdue - a.daysOverdue)[0];
    const peopleGap = fin.people.planHeadcount - fin.people.headcount;

    const push = (key, severity, kpi, message, reading, threshold, source) => {
      rows.push({
        id: `${co.id}-${key}`, companyId: co.id, company: co.name, key, severity, kpi,
        message, reading, threshold, source, department: DEPARTMENT[key] ?? "Finance",
        asOf: fin.asOf, currency: fin.currency,
        thresholdNote: THRESHOLDS[key]?.note ?? null,
      });
    };

    // ── Liquidity ──
    const t = THRESHOLDS;
    if (fin.runway < t.runway.watchlist) {
      const sev = fin.runway < t.runway.critical ? "critical" : fin.runway < t.runway.high ? "high" : "watchlist";
      push("runway", sev, "Cash runway",
        `Runway ${fin.runway} months on ${m(fin.cash.balance)} of cash and ${m(fin.cash.burn)} of net burn a month. ` +
        (sev === "critical" ? "A funding decision is required this cycle." : "Model the requirement before the next board."),
        `${fin.runway} months`, `${t.runway[sev]} months`, "Xero bank feed");
    }

    // ── Commercial ──
    if (varPct < t.revenue.watchlist) {
      const sev = varPct < t.revenue.critical ? "critical" : varPct < t.revenue.high ? "high" : "watchlist";
      push("revenue", sev, "Revenue against plan",
        `Revenue ${m(fin.revenue.total)} against a plan of ${m(fin.revenue.budget)} — ${varPct.toFixed(1)}%, ` +
        `a shortfall of ${m(fin.revenue.budget - fin.revenue.total)} a month.`,
        `${varPct.toFixed(1)}%`, `${t.revenue[sev]}%`, "Xero");
    }

    if (fin.sales.pipelineCoverage < t.coverage.watchlist) {
      const sev = fin.sales.pipelineCoverage < t.coverage.high ? "high" : "watchlist";
      push("coverage", sev, "Pipeline coverage",
        `Coverage ${r1(fin.sales.pipelineCoverage)}× against ${r1(fin.sales.coverageFrom)}× at the start of the period. ` +
        `Win rate ${r1(fin.sales.winRatePct)}%, from ${r1(fin.sales.winRateFrom)}%.`,
        `${r1(fin.sales.pipelineCoverage)}×`, `${t.coverage[sev]}×`, "HubSpot");
    }

    // ── Margin ──
    if (marginMove < t.margin.watchlist) {
      const sev = marginMove < t.margin.high ? "high" : "watchlist";
      push("margin", sev, "Gross margin",
        `Gross margin ${r1(fin.ebitda.grossMargin)}%, down ${Math.abs(marginMove).toFixed(1)} points from ` +
        `${r1(fin.history.ebitda[0].grossMarginPct)}% — ${m((fin.revenue.total * 12 * Math.abs(marginMove)) / 100)} annualised.`,
        `${marginMove.toFixed(1)} points`, `${t.margin[sev]} points`, "Xero");
    }

    // ── Working capital ──
    if (worstDebtor && worstDebtor.daysOverdue > t.debtors.watchlist) {
      const sev = worstDebtor.daysOverdue > t.debtors.high ? "high" : "watchlist";
      push("debtors", sev, "Overdue receivables",
        `${m(fin.cash.overdueTotal)} overdue across ${fin.cash.debtors.length} accounts. Oldest ${worstDebtor.party} ` +
        `at ${worstDebtor.daysOverdue} days — collecting it outright adds ${(fin.cash.overdueTotal / fin.cash.burn).toFixed(1)} months of runway.`,
        `${worstDebtor.daysOverdue} days`, `${t.debtors[sev]} days`, "Xero");
    }

    // ── People ──
    if (fin.people.attritionPct > t.attrition.watchlist) {
      const sev = fin.people.attritionPct > t.attrition.high ? "high" : "watchlist";
      push("attrition", sev, "Attrition",
        `Attrition ${r1(fin.people.attritionPct)}% annualised on a headcount of ${fin.people.headcount}` +
        (peopleGap > 0 ? `, with ${peopleGap} roles already unfilled against plan.` : "."),
        `${r1(fin.people.attritionPct)}%`, `${t.attrition[sev]}%`, "BambooHR");
    } else if (peopleGap >= t.headcount.watchlist) {
      push("headcount", "watchlist", "Open roles",
        `${peopleGap} roles unfilled against a plan of ${fin.people.planHeadcount}.`,
        `${peopleGap} roles`, `${t.headcount.watchlist} roles`, "BambooHR");
    }
  }

  // Worst first, then largest company problem first within a severity.
  return rows.sort((a, b) =>
    SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.company.localeCompare(b.company));
}

/** Alerts for one company. */
export function alertsFor(companyId, opts = {}) {
  return portfolioAlerts(opts).filter((a) => a.companyId === companyId);
}

/** Counts for the header line. */
export function alertSummary(alerts) {
  return {
    total: alerts.length,
    critical: alerts.filter((a) => a.severity === "critical").length,
    high: alerts.filter((a) => a.severity === "high").length,
    watchlist: alerts.filter((a) => a.severity === "watchlist").length,
    companies: new Set(alerts.map((a) => a.companyId)).size,
  };
}

/**
 * The open action list, taken from the tracker rather than re-derived.
 *
 * Shaped for the dashboard's table. `dept` is mapped from the metric the action
 * was raised against, and `created` is the ledger month it was raised in — so
 * the column reads the same as the tracker's own baseline.
 */
export function portfolioActions(opts = {}) {
  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  return trackedActions(opts)
    .map((a) => ({
      id: a.id,
      companyId: a.company,
      co: a.companyName,
      dept: DEPARTMENT[a.metric] ?? "Finance",
      title: a.title,
      owner: a.owner,
      due: a.due,
      pri: a.priority,
      st: a.status,
      kpi: a.metricLabel,
      created: a.raisedOn,
      verdict: a.verdict,
      outcome: a.outcome,
    }))
    .sort((x, y) => rank[x.pri] - rank[y.pri] || x.co.localeCompare(y.co));
}

/** Actions for one company. */
export function actionsFor(companyId, opts = {}) {
  return portfolioActions(opts).filter((a) => a.companyId === companyId);
}

/** @param {string} id */
export function companyName(id) {
  return companyById(id)?.name ?? id;
}
