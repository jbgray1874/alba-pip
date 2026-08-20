// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Grounded context for the AI endpoints
//  ----------------------------------------------------------------------------
//  The facts the model is allowed to reason over, built on the server from the
//  finance model rather than accepted from the browser.
//
//  Two problems this closes. First, the caller used to supply the numbers — so
//  a page with a stale constant produced a confident analysis of a company that
//  does not exist. Second, every missing field defaulted to Meridian's, which
//  meant an incomplete payload was silently analysed as a different company.
//  Here the client sends an id and nothing else that matters; the id is checked
//  against the registry and everything else is computed.
//
//  The portfolio block covers all nine companies across both funds. The
//  hand-written version in Agents.jsx covered five and quoted Meridian's cash
//  at £412k against a seed of £663k.
// ════════════════════════════════════════════════════════════════════════════

import { COMPANIES, companyById, financeOf, FUNDS } from "../../src/lib/companies.js";
import { buildFinance } from "../../src/lib/financeData.js";
import { fmtMoney } from "../../src/lib/fx.js";

/** The reporting currency the fund restates into. */
export const REPORTING_CURRENCY = "GBP";

const m = (v, ccy = REPORTING_CURRENCY) => fmtMoney(v, ccy, { k: true });

/** Reject anything that is not a company we hold. */
export function resolveCompany(id) {
  return companyById(id);
}

/**
 * Everything known about one company, as text the model can quote from and
 * nothing it cannot.
 */
export function companyContext(id, opts = {}) {
  const co = companyById(id);
  if (!co) return null;

  const reportingCurrency = opts.reportingCurrency || REPORTING_CURRENCY;
  const fin = buildFinance({ id, status: co.rag.toLowerCase() }, { reportingCurrency });
  const ccy = fin.currency;
  const k = (v) => m(v, ccy);

  const { cash, revenue, ebitda, people, sales } = fin;
  const firstCash = fin.history.cash[0];
  const firstEbitda = fin.history.ebitda[0];
  const varPct = (revenue.total / revenue.budget - 1) * 100;
  const marginMove = ebitda.grossMargin - firstEbitda.grossMarginPct;
  const worstDebtor = cash.debtors.slice().sort((a, b) => b.daysOverdue - a.daysOverdue)[0];

  const lines = [
    `Company: ${co.name} — ${co.sectorLong}, ${co.stage}, ${co.geo}`,
    `Fund: ${FUNDS.find((f) => f.id === co.fund)?.name ?? "unassigned"} · ownership ${co.own}%`,
    `As of: ${fin.asOf} · ${fin.history.months.length} months of history · reported in ${ccy}` +
      (fin.native.converted ? ` (native ${fin.native.currency}; ${fin.native.note})` : ""),
    `Health score: ${co.score}/100 (${co.rag})`,
    "",
    "CASH (source: banking feed)",
    `  Balance ${k(cash.balance)} · net burn ${k(cash.burn)}/month · runway ${fin.runway} months`,
    `  Balance ${fin.history.months[0]}: ${k(firstCash.balance)} · burn then ${k(firstCash.burn)}/month`,
    `  Burn by category: ${cash.burnCats.map((b) => `${b.label} ${k(b.value)}`).join(" · ")}`,
    `  Overdue receivables ${k(cash.overdueTotal)} across ${cash.debtors.length} accounts` +
      (worstDebtor ? `; oldest ${worstDebtor.party} at ${worstDebtor.daysOverdue} days (${worstDebtor.invoice})` : ""),
    "",
    "REVENUE (source: accounting ledger)",
    `  Actual ${k(revenue.total)} · plan ${k(revenue.budget)} · ${varPct >= 0 ? "+" : ""}${varPct.toFixed(1)}% against plan`,
    `  By product: ${revenue.byProduct.map((p) => `${p.label} ${k(p.value)}`).join(" · ")}`,
    `  By region: ${revenue.byRegion.map((r) => `${r.label} ${k(r.value)}`).join(" · ")}`,
    `  Largest account: ${revenue.deals[0]?.party ?? "n/a"} at ${k((revenue.deals[0]?.amount ?? 0) / 1000)} this month`,
    "",
    "MARGIN (source: accounting ledger)",
    `  Gross margin ${ebitda.grossMargin}% (was ${firstEbitda.grossMarginPct}% — ${marginMove >= 0 ? "+" : ""}${marginMove.toFixed(1)} points)`,
    `  EBITDA ${k(ebitda.value)} at ${ebitda.pct}% of revenue`,
    `  Operating costs: ${ebitda.opexLines.map((o) => `${o.label} ${k(o.value)}`).join(" · ")}`,
    "",
    "PEOPLE (source: HRIS)",
    `  Headcount ${people.headcount} against plan ${people.planHeadcount} · attrition ${people.attritionPct}%`,
    "",
    "SALES (source: CRM)",
    `  Pipeline coverage ${sales.pipelineCoverage}× (was ${sales.coverageFrom}×) · win rate ${sales.winRatePct}% (was ${sales.winRateFrom}%)`,
    "",
    `Known issue on file: ${co.issue}`,
  ];

  return { company: co, fin, currency: ccy, text: lines.join("\n") };
}

/**
 * The whole portfolio, one line per company, restated into the fund's
 * reporting currency so the figures are comparable.
 */
export function portfolioContext(opts = {}) {
  const reportingCurrency = opts.reportingCurrency || REPORTING_CURRENCY;
  const rows = COMPANIES.map((co) => {
    const fin = buildFinance({ id: co.id, status: co.rag.toLowerCase() }, { reportingCurrency });
    const varPct = (fin.revenue.total / fin.revenue.budget - 1) * 100;
    return { co, fin, varPct };
  });

  const byFund = FUNDS.map((f) => {
    const held = rows.filter((r) => r.co.fund === f.id);
    return `  ${f.name} (${f.vintage}, ${f.strategy}): ${held.length} companies · ` +
      `${held.filter((r) => r.co.rag === "RED").length} red, ` +
      `${held.filter((r) => r.co.rag === "AMBER").length} amber, ` +
      `${held.filter((r) => r.co.rag === "GREEN").length} green`;
  });

  const lines = [
    `Portfolio: Caledonia Alba · ${COMPANIES.length} companies across ${FUNDS.length} funds`,
    `As of ${rows[0].fin.asOf} · all figures restated into ${reportingCurrency} at pinned rates`,
    "",
    "FUNDS",
    ...byFund,
    "",
    "COMPANIES",
    ...rows.map(({ co, fin, varPct }) =>
      `  ${co.name} (${co.sectorLong}, ${co.geo}, ${co.stage}) — score ${co.score}/100 ${co.rag} · ` +
      `cash ${m(fin.cash.balance)} · burn ${m(fin.cash.burn)}/mo · runway ${fin.runway}mo · ` +
      `revenue ${m(fin.revenue.total)} vs plan ${m(fin.revenue.budget)} (${varPct >= 0 ? "+" : ""}${varPct.toFixed(1)}%) · ` +
      `GM ${fin.ebitda.grossMargin}% · EBITDA ${fin.ebitda.pct}% · ` +
      `headcount ${fin.people.headcount}/${fin.people.planHeadcount} · attrition ${fin.people.attritionPct}% · ` +
      `coverage ${fin.sales.pipelineCoverage}× · win rate ${fin.sales.winRatePct}% · ` +
      `overdue AR ${m(fin.cash.overdueTotal)} · reports in ${co.currency}`),
    "",
    `Average health score: ${Math.round(COMPANIES.reduce((t, c) => t + c.score, 0) / COMPANIES.length)}/100`,
  ];

  return { rows, currency: reportingCurrency, text: lines.join("\n") };
}

/** The list every prompt ends with, so the model knows the boundary. */
export const GROUNDING_RULE =
  "Every figure you cite must appear verbatim in the data above. Do not calculate new " +
  "totals, do not estimate, do not carry over numbers from anything you have seen " +
  "elsewhere. If a figure you want is not in the data, write the sentence without it. " +
  "UK English, direct, commercially minded, no waffle.";

/** Companies whose figures are worth an unprompted look, worst first. */
export function attentionList(limit = 5) {
  return COMPANIES
    .map((c) => {
      const f = financeOf(c.id);
      return { c, f, stress: Math.max(0, 12 - f.runway) / 12 + Math.max(0, 100 - f.rvb) / 100 };
    })
    .filter((x) => x.stress > 0)
    .sort((a, b) => b.stress - a.stress)
    .slice(0, limit);
}
