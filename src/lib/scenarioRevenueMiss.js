// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Scenario 1: revenue miss identified before the board pack
//  ----------------------------------------------------------------------------
//  Straits Analytics is still reporting growth. Revenue is a shade under plan,
//  which nobody would escalate. But pipeline coverage, win rate, deal timing
//  and churn have all moved the same way at once, and together they say the
//  next quarter misses.
//
//  The forecast IS plan less the sum of the drivers — an identity, not a
//  separate model that then has to be reconciled with a bridge. So the bridge
//  cannot stop adding up, and the specification's requirement that "the revenue
//  impact reconciles with the visible driver bridge" holds by construction.
// ════════════════════════════════════════════════════════════════════════════

import { buildFinance, FIN_SEED } from "./financeData.js";
import { companyById } from "./companies.js";
import { makeInsight, evidence, CONFIDENCE } from "./insight.js";
import { SOURCES } from "./kpiDefinitions.js";
import { fmtMoney } from "./fx.js";

export const COMPANY_ID = "straits";

export const PARAMS = {
  planStepUp: 1.13,        // the plan's step on the current quarter run rate
  winRatePlan: 31,
  winRateNow: 22,
  churnPlanPct: 1.59,      // per quarter
  churnActualPct: 4.20,
  recognition: 0.55,       // share of a won deal recognised in the closing quarter
  slippedDeals: [
    { account: "Pacific Trust Bank", detail: "platform expansion", acv: 1750, wasDue: "Nov 2026", nowDue: "Feb 2027" },
    { account: "Grantham Retail Group", detail: "analytics tier", acv: 1250, wasDue: "Dec 2026", nowDue: "Jan 2027" },
  ],
  salesHires: { plan: 12, inSeat: 9, quotaPerQuarter: 300, inQuarterRamp: 0.188 },
  salesCycleDays: { now: 96, prior: 74 },
};

const OPEN_DEALS = [
  { account: "Harborline Insurance", stage: "Negotiation", probability: 72, weight: 1.7 },
  { account: "Kallang Manufacturing", stage: "Proposal", probability: 55, weight: 1.5 },
  { account: "Vantage Health Network", stage: "Proposal", probability: 55, weight: 1.3 },
  { account: "Orient Freight", stage: "Qualified", probability: 28, weight: 1.2 },
  { account: "Caldera Energy", stage: "Negotiation", probability: 72, weight: 1.1 },
  { account: "Sentinel Assurance", stage: "Qualified", probability: 28, weight: 0.9 },
  { account: "Northbay Media", stage: "Discovery", probability: 12, weight: 0.8 },
  { account: "Aurum Wealth", stage: "Proposal", probability: 55, weight: 0.7 },
];

function quarterOf(series, back = 0) {
  const end = series.length - back * 3;
  return series.slice(Math.max(0, end - 3), end);
}

const sum = (rows, f) => rows.reduce((t, r) => t + r[f], 0);

export function buildRevenueMiss(opts = {}) {
  const co = companyById(COMPANY_ID);
  const fin = buildFinance({ id: COMPANY_ID, status: co.rag.toLowerCase() }, opts);
  const ccy = fin.native.currency;

  // Work in the company's own currency — the board discusses it in USD.
  const seed = FIN_SEED[COMPANY_ID];
  const scale = seed.revenue / fin.revenue.total;      // reporting → native
  const series = fin.history.revenue.map((m) => ({ ...m, actual: m.actual * scale, budget: m.budget * scale }));

  const current = quarterOf(series);
  const currentRevenue = sum(current, "actual");
  const currentPlan = sum(current, "budget");
  const variancePct = ((currentRevenue - currentPlan) / currentPlan) * 100;

  // ── The forecast quarter ──
  const planRevenue = currentRevenue * PARAMS.planStepUp;
  const retained = currentRevenue * (1 - PARAMS.churnPlanPct / 100);
  const newRevenueRequired = planRevenue - retained;
  const bookingsQuota = newRevenueRequired / PARAMS.recognition;

  // Coverage is reported by the sales team; the pipeline follows from it.
  const coverage = fin.sales.pipelineCoverage;
  const openPipelineAcv = bookingsQuota * coverage;
  const openQuarterRevenue = openPipelineAcv * PARAMS.recognition;

  const weightTotal = OPEN_DEALS.reduce((t, d) => t + d.weight, 0);
  const deals = OPEN_DEALS.map((d) => ({
    ...d,
    acv: Math.round((d.weight / weightTotal) * openPipelineAcv),
    quarterRevenue: Math.round((d.weight / weightTotal) * openQuarterRevenue),
  }));

  // ── Drivers ──
  const conversion = openQuarterRevenue * ((PARAMS.winRatePlan - PARAMS.winRateNow) / 100);
  const slippedAcv = PARAMS.slippedDeals.reduce((t, d) => t + d.acv, 0);
  const slip = slippedAcv * PARAMS.recognition * (PARAMS.winRatePlan / 100);
  const churn = currentRevenue * ((PARAMS.churnActualPct - PARAMS.churnPlanPct) / 100);
  const { plan: repPlan, inSeat, quotaPerQuarter, inQuarterRamp } = PARAMS.salesHires;
  const capacity = (repPlan - inSeat) * quotaPerQuarter * inQuarterRamp * PARAMS.recognition;

  const money = (v) => fmtMoney(v, ccy, { k: true });

  const bridge = [
    { driver: "Lower conversion", value: conversion,
      workings: `${money(openQuarterRevenue)} of in-quarter pipeline revenue × (${PARAMS.winRatePlan}% plan win rate − ${PARAMS.winRateNow}% current)` },
    { driver: "Deals moved to a later quarter", value: slip,
      workings: `${money(slippedAcv)} of ACV re-dated out × ${Math.round(PARAMS.recognition * 100)}% in-quarter recognition × ${PARAMS.winRatePlan}% plan win rate` },
    { driver: "Higher customer churn", value: churn,
      workings: `${money(currentRevenue)} recurring base × (${PARAMS.churnActualPct}% actual − ${PARAMS.churnPlanPct}% plan quarterly churn)` },
    { driver: "Sales capacity behind plan", value: capacity,
      workings: `${repPlan - inSeat} unfilled quota roles × ${money(quotaPerQuarter)} quarterly quota × ${(inQuarterRamp * 100).toFixed(1)}% ramp × ${Math.round(PARAMS.recognition * 100)}% recognition` },
  ];

  const forecastGap = bridge.reduce((t, b) => t + b.value, 0);
  const forecastRevenue = planRevenue - forecastGap;

  const insight = makeInsight({
    id: "straits-revenue-miss",
    type: "risk",
    companyId: co.id,
    companyName: co.name,
    raisedOn: fin.asOf,
    headline: `Next-quarter revenue forecast to miss plan by ${money(forecastGap)}`,
    whatHappened:
      `${co.name} is still reporting growth and revenue is only ${Math.abs(variancePct).toFixed(1)}% below plan, ` +
      `so nothing in the monthly pack asks for attention. Four forward indicators have moved together since the ` +
      `last review: pipeline coverage, win rate, deal timing and churn.`,
    whyItMatters:
      `The plan depends on ${money(newRevenueRequired)} of new revenue next quarter. At the current win rate the ` +
      `open pipeline supports ${money(openQuarterRevenue * (PARAMS.winRateNow / 100))}. The gap stops being ` +
      `recoverable roughly six weeks before quarter end, which falls after the next board meeting.`,
    evidence: [
      evidence("Revenue vs plan, quarter to date", `${money(currentRevenue)} against ${money(currentPlan)} (${variancePct.toFixed(1)}%)`, SOURCES.accounting, fin.asOf),
      evidence("Pipeline coverage", `${coverage.toFixed(1)}x, down from ${fin.sales.coverageFrom.toFixed(1)}x`, SOURCES.crm, fin.asOf,
        { quota: bookingsQuota, openPipelineAcv, definition: "open in-quarter pipeline ÷ quarterly bookings quota" }),
      evidence("Win rate", `${PARAMS.winRateNow}%, down from ${PARAMS.winRatePlan}%`, SOURCES.crm, fin.asOf),
      evidence("Average sales cycle", `${PARAMS.salesCycleDays.now} days, up from ${PARAMS.salesCycleDays.prior}`, SOURCES.crm, fin.asOf),
      evidence("Opportunities re-dated out of the quarter", `${PARAMS.slippedDeals.length} opportunities, ${money(slippedAcv)} ACV`, SOURCES.crm, fin.asOf, { deals: PARAMS.slippedDeals }),
      evidence("Quarterly customer churn", `${PARAMS.churnActualPct}% against a plan of ${PARAMS.churnPlanPct}%`, SOURCES.billing, fin.asOf),
      evidence("Quota-carrying headcount", `${inSeat} in seat against a plan of ${repPlan}`, SOURCES.hris, fin.asOf),
    ],
    impact: { measure: "Next-quarter revenue against plan", value: forecastGap, currency: ccy, direction: "downside", horizon: "Next quarter" },
    confidence: CONFIDENCE.MEDIUM,
    methodology:
      "Forecast is plan less the sum of four quantified drivers. Each driver is calculated from current CRM, " +
      "billing and HRIS figures against what the plan assumed. No driver is estimated by the language model; " +
      "the model writes the narrative only.",
    actions: [
      { action: "Deal-by-deal review of the eight largest open opportunities", owner: "Chief Revenue Officer", due: "12 Jun 2026",
        rationale: `Lower conversion is ${((conversion / forecastGap) * 100).toFixed(0)}% of the gap.` },
      { action: "Recovery plan for the two re-dated enterprise opportunities, with CEO sponsorship", owner: "Chief Executive Officer", due: "19 Jun 2026",
        rationale: `${money(slip)} of the gap sits in two accounts.` },
      { action: "Retention review of accounts renewing within 90 days", owner: "VP Customer Success", due: "26 Jun 2026",
        rationale: "Quarterly churn is running at more than twice plan." },
      { action: "Weekly pipeline inspection until coverage returns above 2.5x", owner: "Chief Revenue Officer", due: "05 Jun 2026",
        rationale: "Coverage has fallen for three consecutive months." },
      { action: "Re-forecast the quarter and brief the board before the scheduled meeting", owner: "Chief Financial Officer", due: "30 Jun 2026",
        rationale: "A revised forecast presented early is a materially better board conversation." },
    ],
    drillDown: { series, deals, coverageHistory: fin.sales.history },
  });

  return {
    company: co, fin, currency: ccy,
    currentQuarter: { revenue: currentRevenue, plan: currentPlan, variancePct },
    forecast: { planRevenue, forecastRevenue, forecastGap, newRevenueRequired, bookingsQuota, openPipelineAcv, openQuarterRevenue, coverage },
    bridge, deals, insight,
  };
}
