// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Finance Drill-Down Data
//  ----------------------------------------------------------------------------
//  Realistic, internally-reconciling finance data per company. Every level sums
//  back to the level above. Shaped to mirror a Xero / accounting API response so
//  that when the live integration connects, Level 3 (transactions) swaps from
//  these seeded records to real invoices with no structural change.
//
//  Sparklines now come from portfolioSeries.js — one eighteen-month ledger per
//  company — instead of trend() drawing an independent straight line back from
//  each metric. FIN_SEED is unchanged and still defines the present; the ledger
//  is calibrated onto it. Every figure this file returned before returns the
//  same value now. What is added is history, and the ability to say what a
//  number is being compared with.
// ════════════════════════════════════════════════════════════════════════════

// Core reconciling seeds per company (£k unless noted)
export const FIN_SEED = {
  meridian:   { cash:663,  burn:138, revenue:261, budget:300, gm:71, ebitdaPct:-8  },
  payflo:     { cash:1646, burn:147, revenue:412, budget:368, gm:78, ebitdaPct:14  },
  swiftlogix: { cash:972,  burn:120, revenue:384, budget:400, gm:42, ebitdaPct:6   },
  careos:     { cash:426,  burn:185, revenue:162, budget:253, gm:55, ebitdaPct:-31 },
  forgetech:  { cash:1974, burn:210, revenue:618, budget:600, gm:38, ebitdaPct:18  },
};

import { buildSeries, seriesOf, MONTH_KEYS } from "./portfolioSeries.js";

const MONTHS = ["Dec","Jan","Feb","Mar","Apr","May"];
const k = (n) => `£${Math.round(n).toLocaleString()}k`;
const gbp = (n) => `£${Math.round(n).toLocaleString()}`;

// Burn category proportions
const BURN_SPLIT = [
  { key:"payroll",   label:"Payroll & Benefits", prop:0.59, color:"#3d8bff" },
  { key:"marketing", label:"Sales & Marketing",  prop:0.15, color:"#9b6dff" },
  { key:"overheads", label:"Overheads & Facilities", prop:0.16, color:"#f5a524" },
  { key:"saas",      label:"Software & SaaS",     prop:0.10, color:"#00c97a" },
];

const REV_PRODUCTS = [
  { key:"core",     label:"Core Platform",        prop:0.60 },
  { key:"addons",   label:"Add-on Modules",       prop:0.24 },
  { key:"services", label:"Professional Services", prop:0.16 },
];
const REV_REGIONS = [
  { key:"uk", label:"United Kingdom", prop:0.57 },
  { key:"eu", label:"Europe",          prop:0.27 },
  { key:"na", label:"North America",   prop:0.16 },
];

const CUSTOMERS = ["Acme Corporation","Beta Holdings","TechVentures Ltd","Delta Systems","Gamma Industries","Orion Retail","Vertex Group","Halo Logistics"];

export function buildFinance(co) {
  const id = FIN_SEED[co.id] ? co.id : "meridian";
  const s = FIN_SEED[id];
  const runway = +(s.cash / s.burn).toFixed(1);
  const cs = co.status; // company RAG

  // The ledger behind every sparkline below. Calibrated so month 18 is `s`.
  const ledger = buildSeries(id, s);

  // ── Burn categories ──
  const burnCats = BURN_SPLIT.map((b) => {
    const val = s.burn * b.prop;
    return { ...b, value: val, series: seriesOf(ledger, "netBurn", b.prop) };
  });

  // ── AR / overdue debtors (the cash story) ──
  const overdueTotal = +(s.revenue * 0.28).toFixed(0);
  const debtorSplit = [0.33, 0.245, 0.20, 0.13, 0.095];
  const debtorDays  = [47, 38, 52, 33, 41];
  const debtors = debtorSplit.map((p, i) => ({
    party: CUSTOMERS[i],
    amount: Math.round(overdueTotal * p * 1000),
    daysOverdue: debtorDays[i],
    invoice: `INV-${2400 + i * 7}`,
    due: `${5 + i * 4} Apr 2026`,
    status: debtorDays[i] > 45 ? "critical" : debtorDays[i] > 35 ? "overdue" : "watch",
  }));
  const arAging = [
    { bucket:"Current (0–30)", val: Math.round(s.revenue * 0.57 * 1000), color:"#00c97a" },
    { bucket:"31–60 days",     val: Math.round(overdueTotal * 0.70 * 1000), color:"#f5a524" },
    { bucket:"61–90 days",     val: Math.round(overdueTotal * 0.22 * 1000), color:"#ff8a3d" },
    { bucket:"90+ days",       val: Math.round(overdueTotal * 0.08 * 1000), color:"#ff3d5a" },
  ];

  // ── Revenue breakdowns ──
  const revByProduct = REV_PRODUCTS.map((p) => ({ ...p, value: s.revenue * p.prop, series: seriesOf(ledger, "revenue", p.prop) }));
  const revByRegion  = REV_REGIONS.map((r) => ({ ...r, value: s.revenue * r.prop }));
  const revDeals = CUSTOMERS.slice(0, 6).map((c, i) => ({
    party: c,
    amount: Math.round(s.revenue * [0.16,0.13,0.11,0.09,0.07,0.05][i] * 1000),
    product: REV_PRODUCTS[i % 3].label,
    region: REV_REGIONS[i % 3].label,
    invoice: `INV-${2500 + i * 5}`,
    date: `${2 + i * 3} May 2026`,
    status: "paid",
  }));

  // ── EBITDA bridge ──
  const revenue = s.revenue;
  const grossProfit = revenue * s.gm / 100;
  const cogs = revenue - grossProfit;
  const ebitda = revenue * s.ebitdaPct / 100;
  const opexTotal = grossProfit - ebitda;
  const bridge = [
    { label:"Revenue",        value: revenue,        kind:"start" },
    { label:"Cost of Sales",  value: -cogs,          kind:"neg" },
    { label:"Gross Profit",   value: grossProfit,    kind:"subtotal" },
    { label:"Sales & Mktg",   value: -opexTotal*0.34, kind:"neg" },
    { label:"R&D",            value: -opexTotal*0.35, kind:"neg" },
    { label:"G&A",            value: -opexTotal*0.31, kind:"neg" },
    { label:"EBITDA",         value: ebitda,         kind:"end" },
  ];
  const opexLines = [
    { label:"Sales & Marketing",      value: opexTotal*0.34, series: seriesOf(ledger, "opex", 0.34) },
    { label:"Research & Development", value: opexTotal*0.35, series: seriesOf(ledger, "opex", 0.35) },
    { label:"General & Admin",        value: opexTotal*0.31, series: seriesOf(ledger, "opex", 0.31) },
  ];

  // Cash projection (declining)
  const cashProj = Array.from({ length: 9 }, (_, i) => ({ m: ["May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan"][i], v: Math.round(s.cash - s.burn * i) })).filter(p => p.v > -s.burn);

  // Additive: the ledger the sparklines are drawn from, so any figure can be
  // opened and asked "compared with when?". Existing consumers ignore these.
  const asOf = MONTH_KEYS[MONTH_KEYS.length - 1];
  const history = {
    months: MONTH_KEYS,
    cash: ledger.map((m) => ({ month: m.month, balance: Math.round(m.cashClose), burn: Math.round(m.netBurn) })),
    revenue: ledger.map((m) => ({ month: m.month, actual: Math.round(m.revenue), budget: Math.round(m.planRevenue) })),
    ebitda: ledger.map((m) => ({ month: m.month, value: +m.ebitda.toFixed(1), marginPct: +m.ebitdaMarginPct.toFixed(1), grossMarginPct: +m.grossMarginPct.toFixed(1) })),
  };

  return {
    seed: s, runway, status: cs, asOf, history,
    cash: { balance: s.cash, burn: s.burn, runway, burnCats, debtors, arAging, overdueTotal, cashProj },
    revenue: { total: s.revenue, budget: s.budget, byProduct: revByProduct, byRegion: revByRegion, deals: revDeals },
    ebitda: { pct: s.ebitdaPct, value: ebitda, bridge, opexLines, grossMargin: s.gm },
  };
}

export const fmtK = k;
export const fmtGBP = gbp;
export { MONTHS };
