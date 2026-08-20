// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Scenario 3: margin deterioration masked by revenue growth
//  ----------------------------------------------------------------------------
//  ForgeTech is the company nobody would open. Revenue is above plan, EBITDA is
//  18%, the health score is 84 and the RAG is green. Every headline says leave
//  it alone.
//
//  Gross margin has fallen eight points over the eighteen months on file. On the
//  current run rate that is worth more in annualised gross profit than the
//  revenue outperformance is worth in revenue — so the company is being praised
//  for the smaller number.
//
//  This scenario already emerges in the board pack, which raises a high-severity
//  margin risk on a company green on revenue and green on EBITDA. What it did
//  not have was a screen that takes the eight points apart. The decomposition
//  below is an identity: price, input cost, mix and volume absorption are
//  defined so they sum to exactly the observed movement, with the last term
//  taking the residual. Nothing is fitted.
// ════════════════════════════════════════════════════════════════════════════

import { buildFinance } from "./financeData.js";
import { companyById } from "./companies.js";
import { makeInsight, evidence, CONFIDENCE } from "./insight.js";
import { SOURCES } from "./kpiDefinitions.js";
import { fmtMoney } from "./fx.js";

export const COMPANY_ID = "forgetech";

export const PARAMS = {
  // Movements observed against the start of the period. These are the numbers a
  // buyer challenges first, so they are named and quotable rather than buried.
  priceRealisationPct: -1.8,   // achieved price against list, points of revenue
  inputCostInflationPct: 6.4,  // weighted materials and energy, over the period
  inputCostShareOfCogs: 0.61,  // materials and energy as a share of cost of sales
  discountingPct: 2.1,         // average discount granted, up from
  discountingPriorPct: 0.6,
  freightPctOfRevenue: 3.9,
  freightPriorPctOfRevenue: 2.4,
};

/** Product lines, with the margin each carries and how the mix has moved. */
export const LINES = [
  { key: "precision", label: "Precision components", marginPct: 47, shareNow: 0.34, shareThen: 0.46 },
  { key: "assemblies", label: "Sub-assemblies",       marginPct: 36, shareNow: 0.39, shareThen: 0.33 },
  { key: "contract",  label: "Contract manufacturing", marginPct: 24, shareNow: 0.27, shareThen: 0.21 },
];

const r1 = (v) => Math.round(v * 10) / 10;

export function buildMargin(opts = {}) {
  const co = companyById(COMPANY_ID);
  const fin = buildFinance({ id: COMPANY_ID, status: co.rag.toLowerCase() }, opts);
  const ccy = fin.currency;
  const money = (v) => fmtMoney(v, ccy, { k: true });

  const first = fin.history.ebitda[0];
  const marginNow = fin.ebitda.grossMargin;
  const marginThen = first.grossMarginPct;
  const marginMove = marginNow - marginThen;          // negative: points lost
  const revenue = fin.revenue.total;
  const varPct = (revenue / fin.revenue.budget - 1) * 100;

  // ── The decomposition ─────────────────────────────────────────────────────
  // Three drivers are calculated from the parameters above; the fourth is the
  // residual, so the four sum to the observed movement exactly. Labelling the
  // residual honestly — rather than distributing it silently across the other
  // three — is the difference between a bridge and a rationalisation.
  const priceEffect = PARAMS.priceRealisationPct - (PARAMS.discountingPct - PARAMS.discountingPriorPct);
  const inputCostEffect = -(PARAMS.inputCostInflationPct * PARAMS.inputCostShareOfCogs * (1 - marginThen / 100));
  const mixEffect = LINES.reduce((t, l) => t + (l.shareNow - l.shareThen) * l.marginPct, 0);
  const explained = priceEffect + inputCostEffect + mixEffect;
  const residual = marginMove - explained;

  const bridge = [
    { driver: "Price realisation", value: r1(priceEffect), kind: priceEffect < 0 ? "neg" : "pos",
      workings: `Achieved price ${PARAMS.priceRealisationPct} points against list, and average discount up from ` +
                `${PARAMS.discountingPriorPct}% to ${PARAMS.discountingPct}%`,
      source: SOURCES.accounting },
    { driver: "Input cost inflation", value: r1(inputCostEffect), kind: "neg",
      workings: `Materials and energy up ${PARAMS.inputCostInflationPct}% over the period, at ` +
                `${(PARAMS.inputCostShareOfCogs * 100).toFixed(0)}% of a cost base that was ` +
                `${(100 - marginThen).toFixed(0)}% of revenue`,
      source: SOURCES.accounting },
    { driver: "Product mix", value: r1(mixEffect), kind: mixEffect < 0 ? "neg" : "pos",
      workings: `Precision components fell from ${(LINES[0].shareThen * 100).toFixed(0)}% to ` +
                `${(LINES[0].shareNow * 100).toFixed(0)}% of revenue; contract manufacturing rose from ` +
                `${(LINES[2].shareThen * 100).toFixed(0)}% to ${(LINES[2].shareNow * 100).toFixed(0)}%`,
      source: SOURCES.billing },
    { driver: "Freight, scrap and absorption", value: r1(residual), kind: residual < 0 ? "neg" : "pos",
      workings: `The residual once price, input cost and mix are accounted for. Freight has gone from ` +
                `${PARAMS.freightPriorPctOfRevenue}% to ${PARAMS.freightPctOfRevenue}% of revenue over the same period`,
      source: SOURCES.alba, residual: true },
  ];

  // What the eight points are worth, set against what the company is praised for.
  const annualGrossProfitLost = (revenue * 12 * Math.abs(marginMove)) / 100;
  const revenueOutperformance = (revenue - fin.revenue.budget) * 12;

  const lines = LINES.map((l) => ({
    ...l,
    revenueNow: revenue * l.shareNow,
    revenueThen: revenue * l.shareThen,
    shareMove: r1((l.shareNow - l.shareThen) * 100),
    contribution: r1((l.shareNow - l.shareThen) * l.marginPct),
  }));

  const insight = makeInsight({
    id: "margin-erosion-forgetech",
    type: "risk",
    companyId: co.id,
    companyName: co.name,
    headline: `${Math.abs(marginMove).toFixed(1)} points of gross margin lost on a company that reads green everywhere`,
    whatHappened:
      `${co.name} is ${varPct >= 0 ? "above" : "below"} plan on revenue at ${money(revenue)} against ` +
      `${money(fin.revenue.budget)}, EBITDA is ${fin.ebitda.pct}% and the health score is ${co.score}. ` +
      `Gross margin has fallen from ${marginThen}% to ${marginNow}% over the ${fin.history.months.length} months ` +
      `on file — a move no headline metric shows.`,
    whyItMatters:
      `At the current run rate those ${Math.abs(marginMove).toFixed(1)} points are ${money(annualGrossProfitLost)} ` +
      `of annualised gross profit. The revenue outperformance the company is being congratulated for is ` +
      `${money(revenueOutperformance)} of annualised revenue — so the problem is larger than the achievement, ` +
      `and it compounds while revenue growth flatters the absolute numbers.`,
    evidence: [
      evidence("Gross margin", `${marginNow}%, from ${marginThen}% ${fin.history.months.length} months ago`, SOURCES.accounting, fin.asOf),
      evidence("Revenue against plan", `${money(revenue)} against ${money(fin.revenue.budget)} (${varPct >= 0 ? "+" : ""}${varPct.toFixed(1)}%)`, SOURCES.accounting, fin.asOf),
      evidence("EBITDA margin", `${fin.ebitda.pct}%`, SOURCES.accounting, fin.asOf),
      evidence("Annualised gross profit at risk", money(annualGrossProfitLost), SOURCES.alba, fin.asOf,
        { definition: "Monthly revenue × 12 × points of margin lost" }),
      evidence("Average discount granted", `${PARAMS.discountingPct}%, from ${PARAMS.discountingPriorPct}%`, SOURCES.billing, fin.asOf),
      evidence("Materials and energy inflation", `${PARAMS.inputCostInflationPct}% over the period`, SOURCES.accounting, fin.asOf,
        { shareOfCogs: PARAMS.inputCostShareOfCogs }),
      evidence("Mix shift into lower-margin work", `Contract manufacturing ${(LINES[2].shareThen * 100).toFixed(0)}% to ${(LINES[2].shareNow * 100).toFixed(0)}% of revenue`, SOURCES.billing, fin.asOf,
        { lines: lines.map((l) => ({ line: l.label, marginPct: l.marginPct, shareMove: l.shareMove })) }),
    ],
    impact: {
      measure: "Annualised gross profit against the start of the period",
      value: annualGrossProfitLost,
      currency: ccy,
      direction: "downside",
      horizon: "Annualised, current run rate",
    },
    confidence: CONFIDENCE.HIGH,
    methodology:
      "Gross margin movement is taken straight from the ledger. The decomposition below assigns it to price " +
      "realisation, input cost inflation and product mix from named parameters, and puts whatever remains into a " +
      "residual line rather than distributing it across the other three. The four therefore sum to the observed " +
      "movement exactly, and the size of the residual is visible rather than hidden.",
    actions: [
      { action: "Rank customers and products by contribution margin and identify the loss-makers",
        owner: "Chief Financial Officer", due: "19 Jun 2026",
        rationale: `Contract manufacturing carries ${LINES[2].marginPct}% against ${LINES[0].marginPct}% on precision work and has grown ${lines[2].shareMove} points of revenue.` },
      { action: `Reprice or exit contract work below ${LINES[1].marginPct}% gross margin at renewal`,
        owner: "Commercial Director", due: "30 Jun 2026",
        rationale: `Mix alone is ${Math.abs(r1(mixEffect))} points of the ${Math.abs(marginMove).toFixed(1)}.` },
      { action: `Review the discount authority matrix — average discount has moved ${r1(PARAMS.discountingPct - PARAMS.discountingPriorPct)} points`,
        owner: "Commercial Director", due: "19 Jun 2026",
        rationale: "Discounting is the fastest of the four drivers to reverse." },
      { action: "Open index-linked pricing on materials and energy at the next contract round",
        owner: "Chief Executive Officer", due: "31 Jul 2026",
        rationale: `Input cost is ${Math.abs(r1(inputCostEffect))} points and is not within the company's control unless it is contracted for.` },
      { action: `Investigate the ${Math.abs(r1(residual))}-point residual before the next board meeting`,
        owner: "Chief Financial Officer", due: "30 Jun 2026",
        rationale: "Freight, scrap and absorption are grouped because the ledger does not separate them. That is a data gap, not a finding." },
    ],
    drillDown: { bridge, lines, history: fin.history.ebitda },
  });

  return {
    company: co, fin, currency: ccy,
    marginNow, marginThen, marginMove: r1(marginMove),
    revenue, varPct, bridge, lines,
    annualGrossProfitLost, revenueOutperformance,
    residual: r1(residual), explained: r1(explained),
    insight,
  };
}
