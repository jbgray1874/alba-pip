// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Company Registry
//  ----------------------------------------------------------------------------
//  One definition of the portfolio. GPDashboard, PortfolioAnalytics and
//  NewsFeed each declared their own COMPANIES array with no import between
//  them, so adding a company meant editing three files and the three copies
//  could disagree without anything failing. Three sector spellings already had:
//  "Fintech/Payments", "FinTech · Payments" and "Fintech" were the same company.
//
//  Every numeric field is now DERIVED from FIN_SEED rather than restated:
//  runway is cash ÷ burn, revenue-vs-budget is revenue ÷ budget, and EBITDA is
//  the seed's own percentage. All five previously matched by hand; now they
//  cannot drift apart.
//
//  Display labels are kept per-view where they genuinely differ, so this change
//  moves no pixels. Unifying them belongs in a branding pass, not here.
// ════════════════════════════════════════════════════════════════════════════

import { FIN_SEED } from "./financeData.js";

/**
 * Funds. The specification's Command Centre filters by fund, which needs more
 * than one. `reportingCurrency` is what portfolio-level figures are restated
 * into — companies keep their own currency in FIN_SEED.
 */
export const FUNDS = [
  { id: "growth1", name: "Northstar Growth Fund III", vintage: 2023, strategy: "Growth & venture", reportingCurrency: "GBP" },
  { id: "opps2", name: "Northstar Opportunities II", vintage: 2025, strategy: "Buyout & later stage", reportingCurrency: "GBP" },
];

export function fundById(id) {
  return FUNDS.find((f) => f.id === id) || null;
}

/**
 * Canonical portfolio. Presentation fields only — anything computable from
 * the finance seed is derived below instead of being stored twice.
 */
// Display names follow the nine reference screens so the demo flow and the
// design reference name the same companies. The `id` of each is unchanged —
// every seed, ledger, scenario and cross-reference keys off the id, so renaming
// moves no figure anywhere in the platform.
export const COMPANIES = [
  {
    id: "meridian", fund: "growth1", currency: "GBP", name: "Orbit Commerce",
    sector: "B2B SaaS", sectorLabel: "B2B SaaS", sectorLong: "B2B SaaS",
    stage: "Series A", geo: "UK", own: 22,
    score: 62, rag: "AMBER", headcount: 29, irr: 31, moic: 1.8,
    subScores: { finance: 48, sales: 58, hr: 62, ops: 78, procurement: 81, technology: 84, compliance: 88 },
    depts: { Finance: 45, Sales: 72, Product: 81, HR: 78, Ops: 55, Tech: 83, Marketing: 61, Risk: 48, Compliance: 70 },
    issue: "Cash runway 4.8 mo — DSO +15 days, burn accelerating",
    spark: [68, 66, 67, 64, 63, 62, 60, 58, 55, 54, 53, 52],
    trend: "down", actions: 4, alerts: 3, att: 14, upd: "4h ago", freshness: 98,
  },
  {
    id: "payflo", fund: "opps2", currency: "GBP", name: "PayFlo",
    sector: "FinTech", sectorLabel: "Fintech/Payments", sectorLong: "FinTech · Payments",
    stage: "Growth PE", geo: "UK", own: 41,
    score: 88, rag: "GREEN", headcount: 54, irr: 47, moic: 3.1,
    subScores: { finance: 91, sales: 94, hr: 88, ops: 85, procurement: 83, technology: 90, compliance: 86 },
    depts: { Finance: 88, Sales: 91, Product: 85, HR: 82, Ops: 90, Tech: 89, Marketing: 84, Risk: 86, Compliance: 88 },
    issue: "Take rate compressing slightly vs sector peers",
    spark: [78, 80, 79, 82, 83, 85, 84, 86, 87, 88, 88, 88],
    trend: "up", actions: 1, alerts: 0, att: 7, upd: "1h ago", freshness: 100,
  },
  {
    id: "swiftlogix", fund: "growth1", currency: "GBP", name: "Veridian Logistics",
    sector: "Logistics", sectorLabel: "Logistics", sectorLong: "Logistics · Series B",
    stage: "Series B", geo: "UK", own: 18,
    score: 71, rag: "AMBER", headcount: 41, irr: 28, moic: 2.1,
    subScores: { finance: 74, sales: 72, hr: 58, ops: 62, procurement: 79, technology: 76, compliance: 84 },
    depts: { Finance: 68, Sales: 74, Product: 71, HR: 80, Ops: 65, Tech: 75, Marketing: 62, Risk: 70, Compliance: 78 },
    issue: "On-time delivery 87% vs 95% SLA — 2 enterprise client warnings",
    spark: [70, 71, 69, 72, 71, 70, 72, 71, 70, 71, 71, 71],
    trend: "stable", actions: 2, alerts: 2, att: 19, upd: "Yesterday", freshness: 84,
  },
  {
    id: "careos", fund: "growth1", currency: "GBP", name: "Northstar Health",
    sector: "HealthTech", sectorLabel: "HealthTech", sectorLong: "HealthTech · Series A",
    stage: "Series A", geo: "UK", own: 29,
    score: 34, rag: "RED", headcount: 38, irr: 8, moic: 0.7,
    subScores: { finance: 18, sales: 24, hr: 32, ops: 51, procurement: 62, technology: 68, compliance: 74 },
    depts: { Finance: 22, Sales: 35, Product: 55, HR: 42, Ops: 28, Tech: 62, Marketing: 30, Risk: 18, Compliance: 40 },
    issue: "CRITICAL: 2.3 mo runway + revenue 36% below budget",
    spark: [58, 55, 52, 48, 46, 44, 42, 40, 38, 36, 35, 34],
    trend: "down", actions: 6, alerts: 4, att: 23, upd: "3d ago", freshness: 61,
  },
  {
    id: "forgetech", fund: "opps2", currency: "GBP", name: "Apex Manufacturing",
    sector: "Manufacturing", sectorLabel: "Manufacturing", sectorLong: "Manufacturing · PE Growth",
    stage: "PE Growth", geo: "UK", own: 55,
    score: 84, rag: "GREEN", headcount: 67, irr: 44, moic: 2.8,
    subScores: { finance: 86, sales: 82, hr: 88, ops: 80, procurement: 78, technology: 84, compliance: 91 },
    depts: { Finance: 82, Sales: 86, Product: 78, HR: 84, Ops: 88, Tech: 80, Marketing: 75, Risk: 82, Compliance: 85 },
    issue: "Inventory aging 11% above target — review slow-moving SKUs",
    spark: [76, 77, 78, 79, 80, 81, 82, 83, 83, 84, 84, 84],
    trend: "up", actions: 1, alerts: 1, att: 9, upd: "12h ago", freshness: 96,
  },
  {
    id: "straits", fund: "growth1", currency: "USD", name: "NovaTech Solutions",
    sector: "B2B Software", sectorLabel: "B2B Software", sectorLong: "B2B Software · Series B",
    stage: "Series B", geo: "Singapore", own: 34,
    score: 76, rag: "GREEN", headcount: 182, irr: 38, moic: 2.4,
    subScores: { finance: 84, sales: 61, hr: 74, ops: 82, procurement: 78, technology: 88, compliance: 83 },
    depts: { Finance: 84, Sales: 58, Product: 86, HR: 74, Ops: 82, Tech: 88, Marketing: 66, Risk: 79, Compliance: 83 },
    issue: "Reported revenue on plan — pipeline coverage down to 1.9x from 3.2x",
    spark: [70, 71, 73, 74, 76, 77, 78, 78, 77, 77, 76, 76],
    trend: "down", actions: 2, alerts: 1, att: 11, upd: "2h ago", freshness: 97,
  },
  {
    id: "nusantara", fund: "growth1", currency: "SGD", name: "Nusantara Foods",
    sector: "Consumer", sectorLabel: "Consumer/F&B", sectorLong: "Consumer · F&B",
    stage: "PE Growth", geo: "Singapore", own: 47,
    score: 59, rag: "AMBER", headcount: 214, irr: 19, moic: 1.4,
    subScores: { finance: 44, sales: 62, hr: 55, ops: 68, procurement: 71, technology: 58, compliance: 76 },
    depts: { Finance: 44, Sales: 62, Product: 60, HR: 55, Ops: 68, Tech: 58, Marketing: 64, Risk: 49, Compliance: 76 },
    issue: "Board pack shows funded position — collections and payroll say otherwise",
    spark: [72, 71, 69, 68, 66, 65, 64, 62, 61, 60, 59, 59],
    trend: "down", actions: 3, alerts: 2, att: 17, upd: "6h ago", freshness: 91,
  },
  {
    id: "zafira", fund: "opps2", currency: "USD", name: "BrightWave Digital",
    sector: "B2B SaaS", sectorLabel: "B2B SaaS", sectorLong: "B2B SaaS · Multi-product",
    stage: "Growth PE", geo: "Dubai, UAE", own: 38,
    score: 83, rag: "GREEN", headcount: 141, irr: 41, moic: 2.6,
    subScores: { finance: 86, sales: 88, hr: 81, ops: 84, procurement: 76, technology: 87, compliance: 80 },
    depts: { Finance: 86, Sales: 88, Product: 84, HR: 81, Ops: 84, Tech: 87, Marketing: 79, Risk: 80, Compliance: 80 },
    issue: "Tracking plan — second-product penetration below comparable accounts",
    spark: [76, 77, 78, 79, 80, 81, 81, 82, 82, 83, 83, 83],
    trend: "up", actions: 1, alerts: 0, att: 6, upd: "1h ago", freshness: 99,
  },
  {
    id: "khaleej", fund: "opps2", currency: "AED", name: "Khaleej Marine Services",
    sector: "Energy Services", sectorLabel: "Marine/Energy", sectorLong: "Energy · Marine Services",
    stage: "PE Buyout", geo: "Abu Dhabi, UAE", own: 61,
    score: 80, rag: "GREEN", headcount: 336, irr: 33, moic: 2.2,
    subScores: { finance: 82, sales: 76, hr: 79, ops: 86, procurement: 68, technology: 71, compliance: 88 },
    depts: { Finance: 82, Sales: 76, Product: 70, HR: 79, Ops: 86, Tech: 71, Marketing: 64, Risk: 81, Compliance: 88 },
    issue: "Vendor spend fragmented across three cloud and two insurance contracts",
    spark: [78, 79, 78, 80, 79, 80, 81, 80, 80, 81, 80, 80],
    trend: "stable", actions: 2, alerts: 1, att: 12, upd: "5h ago", freshness: 93,
  },
];

/** Everything computable from the finance seed, computed once. */
export function financeOf(id) {
  const s = FIN_SEED[id];
  if (!s) return null;
  return {
    cashK: s.cash,
    burnK: s.burn,
    revenueK: s.revenue,
    budgetK: s.budget,
    runway: +(s.cash / s.burn).toFixed(1),
    rvb: Math.round((s.revenue / s.budget) * 100),
    ebitdaPct: s.ebitdaPct,
    grossMargin: s.gm,
  };
}

export function companyById(id) {
  return COMPANIES.find((c) => c.id === id) || null;
}

// ── Per-view projections ────────────────────────────────────────────────────
// Each view gets exactly the shape it already expects, so adopting the registry
// is a one-line change at the call site.

/** GPDashboard: lowercase status, numeric rvb/ebitda, its own sector label. */
export function forDashboard() {
  return COMPANIES.map((c) => {
    const f = financeOf(c.id);
    return {
      id: c.id, name: c.name, sector: c.sectorLabel, stage: c.stage, geo: c.geo,
      fund: c.fund, currency: c.currency,
      own: c.own, score: c.score, subScores: c.subScores,
      status: c.rag.toLowerCase(),
      runway: f.runway, rvb: f.rvb, ebitda: f.ebitdaPct,
      att: c.att, upd: c.upd, freshness: c.freshness,
      issue: c.issue, spark: c.spark, trend: c.trend,
      actions: c.actions, alerts: c.alerts,
    };
  });
}

/** PortfolioAnalytics: uppercase rag, percentage strings, longer sector label. */
export function forAnalytics() {
  return COMPANIES.map((c) => {
    const f = financeOf(c.id);
    return {
      id: c.id, name: c.name, sector: c.sectorLong, stage: c.stage,
      fund: c.fund, currency: c.currency, geo: c.geo,
      score: c.score, rag: c.rag, runway: f.runway,
      burnK: f.burnK, cashK: f.cashK, revenueK: f.revenueK, budgetK: f.budgetK,
      irr: c.irr, moic: c.moic, headcount: c.headcount,
      revVsBudget: `${f.rvb}%`, ebitda: `${f.ebitdaPct}%`,
      depts: c.depts,
    };
  });
}

/** NewsFeed: minimal, with the colour resolved from the caller's theme. */
export function forNews(theme) {
  const byRag = { RED: theme.red, AMBER: theme.amber, GREEN: theme.green };
  return COMPANIES.map((c) => ({
    id: c.id, name: c.name,
    sector: c.sector === "FinTech" ? "Fintech" : c.sector,
    color: byRag[c.rag],
  }));
}
