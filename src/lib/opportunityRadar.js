// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Opportunity Radar
//  ----------------------------------------------------------------------------
//  Screen 2 of the reference set, and the only value-creation view that reads
//  across the whole portfolio. scenarioExpansion.js already scores accounts
//  WITHIN one company; this ranks one opportunity per company ACROSS all nine,
//  so a partner can ask "where is the next pound of value in this fund?" and be
//  answered in one screen rather than in nine board packs.
//
//  Four levers, each with its own qualification gate, its own arithmetic and
//  its own indicator set:
//
//    Cross-sell             second-product penetration is low and the base is
//                           healthy enough to buy again
//    Pricing optimisation   gross margin has fallen against the opening of the
//                           eighteen-month ledger while demand held
//    Contract expansion     pipeline coverage is above the 3.0x bar and revenue
//                           is at or above plan
//    Supplier consolidation the company's share of the portfolio procurement
//                           saving already modelled in scenarioProcurement.js
//
//  Two disciplines matter more than the arithmetic.
//
//  First, CONFIDENCE IS COUNTED, NOT CHOSEN. Every opportunity carries a list
//  of independent indicators, each read from a different system, each a plain
//  test with an observed value. Confidence is the share of them that agree,
//  mapped onto the reference screen's 40–100 axis, with a small allowance for
//  how fresh the company's data is. Nobody types a percentage.
//
//  Second, A COMPANY ONLY APPEARS IF IT HAS A SIGNAL. A candidate that fails
//  its materiality floor, or that fewer than half its indicators support, is
//  excluded and the reason is published beside the count. CareOS has an
//  arithmetically real pricing candidate and none of its indicators agree —
//  a company with 2.3 months of runway has a liquidity question, not a
//  value-creation one — so it is named as excluded rather than quietly dropped.
//
//  Everything is restated into the fund's reporting currency, because nine
//  companies reporting in four currencies cannot otherwise be ranked.
// ════════════════════════════════════════════════════════════════════════════

import { COMPANIES, companyById } from "./companies.js";
import { buildFinance } from "./financeData.js";
import {
  buildExpansion,
  PARAMS as EXPANSION_PARAMS,
  COMPANY_ID as EXPANSION_COMPANY_ID,
} from "./scenarioExpansion.js";
import {
  buildVendorMatrix,
  CATEGORIES,
  PARAMS as PROCUREMENT_PARAMS,
} from "./scenarioProcurement.js";
import { convert, fmtMoney } from "./fx.js";
import { SOURCES, KPIS } from "./kpiDefinitions.js";
import { CONFIDENCE } from "./insight.js";
import { AS_OF_MONTH } from "./portfolioSeries.js";
import { AS_OF_DATE, integrationHealth } from "./liveFeed.js";

/** Cross-portfolio value is only comparable restated into one currency. */
export const REPORTING_CURRENCY = "GBP";

const money = (v) => fmtMoney(v, REPORTING_CURRENCY, { k: true });
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pct0 = (v) => `${Math.round(v)}%`;
const pct1 = (v) => `${(Math.round(v * 10) / 10).toFixed(1)}%`;
const r0 = (v) => Math.round(v);

function median(values) {
  const s = values.slice().sort((a, b) => a - b);
  if (!s.length) return 0;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// ── The four levers ─────────────────────────────────────────────────────────

export const TYPES = {
  crossSell: {
    id: "cross-sell", label: "Cross-sell", chip: "CROSS-SELL",
    question: "Which customers look like the ones that already bought the second product?",
  },
  pricing: {
    id: "pricing", label: "Pricing optimisation", chip: "PRICING",
    question: "Where has margin been given away while demand held?",
  },
  contract: {
    id: "contract", label: "Contract expansion", chip: "EXPANSION",
    question: "Where is there more qualified pipeline than the quota needs?",
  },
  supplier: {
    id: "supplier", label: "Supplier consolidation", chip: "PROCUREMENT",
    question: "What is this company's share of buying as one portfolio?",
  },
};

/**
 * Named assumptions.
 *
 * These are the first figures a CFO will challenge, so they sit here as
 * parameters with a stated basis rather than inside a sum. `attachRate`,
 * `conversionFloor` and `sensitivity` are deliberately re-used from
 * scenarioExpansion.js rather than restated, so the radar and the expansion
 * screen cannot drift apart.
 */
export const PARAMS = {
  // Qualification gates
  marginErosionFloorPts: 1.5,   // below this the margin move is noise, not a pricing signal
  coverageBar: 3.0,             // KPIS.pipelineCoverage: below 3x is generally considered thin
  planBar: 1.0,                 // contract expansion needs revenue at or above plan
  runwayBar: 12,                // months of cash before a growth programme is fundable
  minimumValueK: 25,            // below this the programme costs more to run than it returns
  minimumAgreementShare: 0.5,   // at least half the independent indicators must agree

  // Value assumptions
  marginRecoveryShare: 0.5,     // half the erosion treated as recoverable, half as structural
  attachRate: EXPANSION_PARAMS.attachRate,
  conversionFloor: EXPANSION_PARAMS.conversionFloor,
  conversionCeiling: EXPANSION_PARAMS.conversionCeiling,
  sensitivity: EXPANSION_PARAMS.sensitivity,

  // Confidence, counted from agreement
  confidenceFloor: 40,          // the reference screen's x-axis starts here
  confidenceSpan: 50,           // full agreement earns this much above the floor
  dataQualityBonus: 5,          // scaled by the company's own data freshness
  highConfidence: 80,
  mediumConfidence: 65,
};

/**
 * Sectors where a second product line exists to be cross-sold.
 *
 * Applying a second-product model to a marine services business or a food
 * manufacturer would produce a number, and the number would be meaningless.
 * Those companies are scored on contract expansion and procurement instead.
 */
export const CROSS_SELL_SECTORS = new Set(["B2B SaaS", "B2B Software", "FinTech", "HealthTech"]);

// ── Confidence ──────────────────────────────────────────────────────────────

/** One independent test, with the value it read and the system it read it from. */
function indicator(label, observed, agrees, source) {
  return { label, observed, agrees: Boolean(agrees), source: source.label };
}

/**
 * Confidence, counted.
 *
 * Share of the independent indicators that agree, mapped onto the reference
 * screen's 40–100 axis, plus up to five points for the freshness of the
 * company's own feeds. There is no path through this function that lets a
 * confidence be chosen.
 */
function confidenceFrom(indicators, freshness) {
  const agreeing = indicators.filter((i) => i.agrees).length;
  const share = indicators.length ? agreeing / indicators.length : 0;
  const raw =
    PARAMS.confidenceFloor +
    PARAMS.confidenceSpan * share +
    PARAMS.dataQualityBonus * (clamp(freshness, 0, 100) / 100);
  return { agreeing, indicatorCount: indicators.length, share, confidence: Math.round(raw) };
}

function bandFor(confidence) {
  if (confidence >= PARAMS.highConfidence) {
    return { band: CONFIDENCE.HIGH, status: { label: "Qualified", tone: "green" } };
  }
  if (confidence >= PARAMS.mediumConfidence) {
    return { band: CONFIDENCE.MEDIUM, status: { label: "In review", tone: "gold" } };
  }
  return { band: CONFIDENCE.LOW, status: { label: "Early signal", tone: "muted" } };
}

// ── Per-company readings ────────────────────────────────────────────────────

/** Everything the four levers read, taken once per company from the ledger. */
function reading(co, opts) {
  const fin = buildFinance(
    { id: co.id, status: co.rag.toLowerCase() },
    { reportingCurrency: REPORTING_CURRENCY, ...opts },
  );
  const history = fin.history;
  const months = history.months.length;
  const firstRevenue = history.revenue[0].actual;
  const growthPct = ((fin.revenue.total / firstRevenue) ** (12 / (months - 1)) - 1) * 100;

  return {
    co,
    fin,
    months,
    arr: fin.revenue.total * 12,
    revenueVsPlan: (fin.revenue.total / fin.revenue.budget) * 100,
    gmNow: fin.ebitda.grossMargin,
    gmOpen: history.ebitda[0].grossMarginPct,
    gmErosionPts: history.ebitda[0].grossMarginPct - fin.ebitda.grossMargin,
    coverage: fin.sales.pipelineCoverage,
    coverageFrom: fin.sales.coverageFrom,
    winRate: fin.sales.winRatePct,
    winRateFrom: fin.sales.winRateFrom,
    quarterlyQuota: fin.revenue.budget * 3,
    runway: fin.runway,
    ebitdaPct: fin.ebitda.pct,
    attrition: fin.people.attritionPct,
    attritionFrom: fin.people.history[0].attritionPct,
    growthPct,
    freshness: co.freshness,
  };
}

// ── Lever 1: cross-sell, calibrated on the one company with account data ────

/**
 * Zafira is the only company with account-level product data, so it is the
 * only company whose cross-sell cohort can be observed rather than modelled.
 * Rather than invent a separate model for the other eight, the same chain is
 * used everywhere and its three free rates are solved from Zafira's observed
 * result, then scaled by each company's own sales sub-score.
 *
 *    gross    = ARR × (1 − penetration) × qualifying rate × attach rate
 *    expected = gross × conversion
 *
 * At the anchor the chain reproduces buildExpansion() exactly, by construction.
 */
function crossSellCalibration(opts) {
  const expansion = buildExpansion(opts);
  const anchor = companyById(EXPANSION_COMPANY_ID);
  const nativeCurrency = expansion.currency;
  const totals = expansion.totals;

  const penetration = totals.penetration;
  const eligibleShare = 1 - penetration;
  const grossShareOfArr = totals.gross / totals.arrTotal;

  return {
    expansion,
    anchorId: anchor.id,
    anchorName: anchor.name,
    anchorScore: anchor.subScores.sales,
    nativeCurrency,
    penetration,
    // Share of the accounts that do not own the second product which clear the
    // scoring bar, backed out of the observed gross opportunity.
    qualifyRate: grossShareOfArr / (eligibleShare * PARAMS.attachRate),
    // Average conversion probability across the observed qualified cohort.
    conversion: totals.expected / totals.gross,
    observed: {
      qualified: expansion.qualified.length,
      customers: expansion.customers.length,
      expected: convert(totals.expected, nativeCurrency, REPORTING_CURRENCY),
    },
  };
}

function crossSellCandidate(b, cal) {
  if (!CROSS_SELL_SECTORS.has(b.co.sector)) return null;

  const isAnchor = b.co.id === cal.anchorId;
  const k = b.co.subScores.sales / cal.anchorScore;
  const penetration = clamp(cal.penetration * k, 0, 0.9);
  const eligibleShare = 1 - penetration;
  const qualifyRate = clamp(cal.qualifyRate * k, 0, 1);
  const conversion = clamp(cal.conversion * k, PARAMS.conversionFloor, PARAMS.conversionCeiling);

  const eligibleArr = b.arr * eligibleShare;
  const gross = eligibleArr * qualifyRate * PARAMS.attachRate;
  const value = gross * conversion;

  const indicators = [
    indicator("Revenue against plan", `${pct0(b.revenueVsPlan)} of plan`,
      b.revenueVsPlan >= 95, SOURCES.accounting),
    indicator("Pipeline coverage", `${b.coverage}× against a ${PARAMS.coverageBar.toFixed(1)}× bar`,
      b.coverage >= PARAMS.coverageBar, SOURCES.crm),
    indicator("Win rate trend", `${pct1(b.winRate)} from ${pct1(b.winRateFrom)}`,
      b.winRate >= b.winRateFrom, SOURCES.crm),
    indicator("Gross margin trend", `${pct1(b.gmNow)} from ${pct1(b.gmOpen)}`,
      b.gmNow >= b.gmOpen, SOURCES.accounting),
    indicator("Cash runway", `${b.runway} months`,
      b.runway >= PARAMS.runwayBar, SOURCES.banking),
    indicator("Account-level product data", isAnchor ? "Available" : "Not connected",
      isAnchor, SOURCES.billing),
  ];

  const summary = isAnchor
    ? `Second-product penetration is ${pct0(penetration * 100)} of the customer base. ` +
      `${cal.observed.qualified} of ${cal.observed.customers} accounts clear the scoring bar and do not own ` +
      `the second product, which is the one cohort in the portfolio observed at account level rather than ` +
      `modelled. Converting it adds ${pct1((value / b.arr) * 100)} to recurring revenue with no acquisition cost.`
    : `Second-product penetration is ${pct0(penetration * 100)} of the customer base, below the level a sales ` +
      `organisation scoring ${b.co.subScores.sales} would be expected to reach. Applying the ${cal.anchorName} ` +
      `scoring model to the accounts that do not own it qualifies ${pct0(qualifyRate * 100)} of them, worth ` +
      `${money(gross)} before conversion and ${money(value)} after.`;

  return {
    type: TYPES.crossSell,
    value,
    indicators,
    summary,
    basis: isAnchor ? "Observed at account level" : `Calibrated on ${cal.anchorName}`,
    facts: [
      { label: "Second-product penetration", value: `${pct0(penetration * 100)} of accounts` },
      { label: "Eligible recurring revenue", value: money(eligibleArr) },
      { label: "Attach rate assumed", value: `${pct0(PARAMS.attachRate * 100)} of account revenue` },
      { label: "Conversion applied", value: pct0(conversion * 100) },
    ],
    workings: [
      { step: "Annual recurring revenue", value: money(b.arr) },
      { step: "Accounts without the second product", value: pct0(eligibleShare * 100) },
      { step: "Qualifying share of those accounts", value: pct0(qualifyRate * 100) },
      { step: `Attach rate on qualifying revenue`, value: pct0(PARAMS.attachRate * 100) },
      { step: "Gross opportunity", value: money(gross) },
      { step: "Conversion applied", value: pct0(conversion * 100) },
      { step: "Expected value", value: money(value) },
    ],
  };
}

// ── Lever 2: pricing optimisation ───────────────────────────────────────────

function pricingCandidate(b, medianGrowth) {
  if (b.gmErosionPts < PARAMS.marginErosionFloorPts) return null;

  const recoveredPts = b.gmErosionPts * PARAMS.marginRecoveryShare;
  const value = (b.arr * recoveredPts) / 100;

  const indicators = [
    indicator("Demand against plan", `${pct0(b.revenueVsPlan)} of plan`,
      b.revenueVsPlan >= 90, SOURCES.accounting),
    indicator("Revenue growth", `${pct1(b.growthPct)} against a portfolio median of ${pct1(medianGrowth)}`,
      b.growthPct >= medianGrowth, SOURCES.alba),
    indicator("Win rate trend", `${pct1(b.winRate)} from ${pct1(b.winRateFrom)}`,
      b.winRate >= b.winRateFrom, SOURCES.crm),
    indicator("Earnings headroom", `EBITDA margin ${pct1(b.ebitdaPct)}`,
      b.ebitdaPct > 0, SOURCES.accounting),
    indicator("Commercial team stability", `attrition ${pct1(b.attrition)} from ${pct1(b.attritionFrom)}`,
      b.attrition <= b.attritionFrom, SOURCES.hris),
    indicator("Cash runway", `${b.runway} months`,
      b.runway >= PARAMS.runwayBar, SOURCES.banking),
  ];

  return {
    type: TYPES.pricing,
    value,
    indicators,
    summary:
      `Gross margin has fallen from ${pct1(b.gmOpen)} to ${pct1(b.gmNow)} across the ${b.months} months on file, ` +
      `${pct1(b.gmErosionPts)} of margin given up while revenue held at ${pct0(b.revenueVsPlan)} of plan. ` +
      `Recovering half of that through price and mix on the current revenue base is worth ${money(value)} a year; ` +
      `the other half is treated as structural and is not claimed.`,
    basis: "Ledger opening against today",
    facts: [
      { label: "Gross margin today", value: pct1(b.gmNow) },
      { label: `Gross margin ${b.months} months ago`, value: pct1(b.gmOpen) },
      { label: "Recoverable share assumed", value: `${pct0(PARAMS.marginRecoveryShare * 100)} of the erosion` },
      { label: "Annual revenue base", value: money(b.arr) },
    ],
    workings: [
      { step: `Gross margin ${b.months} months ago`, value: pct1(b.gmOpen) },
      { step: "Gross margin today", value: pct1(b.gmNow) },
      { step: "Margin given up", value: `${pct1(b.gmErosionPts)} of revenue` },
      { step: "Treated as recoverable", value: `${pct1(recoveredPts)} of revenue` },
      { step: "Annual revenue base", value: money(b.arr) },
      { step: "Expected value", value: money(value) },
    ],
  };
}

// ── Lever 3: contract expansion ─────────────────────────────────────────────

function contractCandidate(b) {
  if (b.coverage < PARAMS.coverageBar) return null;
  if (b.revenueVsPlan < PARAMS.planBar * 100) return null;

  const surplus = b.quarterlyQuota * (b.coverage - PARAMS.coverageBar);
  const value = surplus * (b.winRate / 100);

  const indicators = [
    indicator("Coverage trend", `${b.coverage}× from ${b.coverageFrom}×`,
      b.coverage >= b.coverageFrom, SOURCES.crm),
    indicator("Win rate trend", `${pct1(b.winRate)} from ${pct1(b.winRateFrom)}`,
      b.winRate >= b.winRateFrom, SOURCES.crm),
    indicator("Gross margin trend", `${pct1(b.gmNow)} from ${pct1(b.gmOpen)}`,
      b.gmNow >= b.gmOpen, SOURCES.accounting),
    indicator("Earnings headroom", `EBITDA margin ${pct1(b.ebitdaPct)}`,
      b.ebitdaPct > 0, SOURCES.accounting),
    indicator("Delivery team stability", `attrition ${pct1(b.attrition)} from ${pct1(b.attritionFrom)}`,
      b.attrition <= b.attritionFrom, SOURCES.hris),
    indicator("Cash runway", `${b.runway} months`,
      b.runway >= PARAMS.runwayBar, SOURCES.banking),
  ];

  return {
    type: TYPES.contract,
    value,
    indicators,
    summary:
      `Pipeline coverage is ${b.coverage}× against the ${PARAMS.coverageBar.toFixed(1)}× bar and revenue is ` +
      `${pct0(b.revenueVsPlan)} of plan, so the quarter is already covered. The surplus pipeline above the bar, ` +
      `converted at the company's own win rate of ${pct1(b.winRate)}, is worth ${money(value)} of incremental ` +
      `annual contract value.`,
    basis: "Surplus pipeline above the coverage bar",
    facts: [
      { label: "Pipeline coverage", value: `${b.coverage}× against ${PARAMS.coverageBar.toFixed(1)}×` },
      { label: "Quarterly bookings quota", value: money(b.quarterlyQuota) },
      { label: "Surplus pipeline", value: money(surplus) },
      { label: "Win rate applied", value: pct1(b.winRate) },
    ],
    workings: [
      { step: "Quarterly bookings quota", value: money(b.quarterlyQuota) },
      { step: "Pipeline coverage", value: `${b.coverage}×` },
      { step: "Coverage bar", value: `${PARAMS.coverageBar.toFixed(1)}×` },
      { step: "Surplus pipeline above the bar", value: money(surplus) },
      { step: "Win rate applied", value: pct1(b.winRate) },
      { step: "Expected value", value: money(value) },
    ],
  };
}

// ── Lever 4: supplier consolidation ─────────────────────────────────────────

/**
 * Each company's share of the portfolio procurement saving.
 *
 * scenarioProcurement.js already normalises supplier names, classifies spend
 * and applies a named rate per category. This splits its result back out by
 * company, keeping the same discipline: spend whose supplier identity is only
 * a candidate match is held out of the saving until a person confirms it.
 */
function supplierSavings() {
  const rows = new Map(
    COMPANIES.map((c) => [c.id, {
      confirmedSpend: 0, pendingSpend: 0, pendingRecords: 0,
      contracts: 0, categories: new Set(), earliestRenewal: null,
    }]),
  );

  for (const vendor of buildVendorMatrix()) {
    if (!vendor.addressable) continue;
    const rate = CATEGORIES[vendor.category].rate;
    for (const contract of vendor.contracts) {
      const row = rows.get(contract.company);
      if (!row) continue;
      row.contracts += 1;
      if (vendor.needsReview.includes(contract)) {
        row.pendingSpend += contract.annualSpend;
        row.pendingRecords += 1;
      } else {
        row.confirmedSpend += contract.annualSpend;
        row.categories.add(vendor.category);
        row.saving = (row.saving ?? 0) + contract.annualSpend * rate;
      }
      if (!row.earliestRenewal || contract.renewal < row.earliestRenewal) {
        row.earliestRenewal = contract.renewal;
      }
    }
  }

  for (const row of rows.values()) row.saving = row.saving ?? 0;
  return rows;
}

/** Months between the ledger's as-of date and a renewal date. */
function monthsUntil(renewalIso) {
  const from = Date.parse(AS_OF_DATE);
  const to = Date.parse(`${renewalIso}T00:00:00Z`);
  return (to - from) / (1000 * 60 * 60 * 24 * 30.44);
}

function supplierCandidate(b, row, medianProcurementScore) {
  if (!row || row.confirmedSpend <= 0) return null;

  const value = row.saving;
  const totalCommon = row.confirmedSpend + row.pendingSpend;
  const monthsToRenewal = row.earliestRenewal ? monthsUntil(row.earliestRenewal) : 999;
  const categories = row.categories.size;

  const indicators = [
    indicator("Consolidation categories", `${categories} categories with shared suppliers`,
      categories >= 2, SOURCES.accounting),
    indicator("Supplier records matched", row.pendingRecords === 0
      ? "All records auto-matched"
      : `${row.pendingRecords} held for human confirmation`,
      row.pendingRecords === 0, SOURCES.alba),
    indicator("Renewal inside twelve months", row.earliestRenewal ?? "none scheduled",
      monthsToRenewal <= 12, SOURCES.accounting),
    indicator("Procurement headroom", `score ${b.co.subScores.procurement} against a portfolio median of ${medianProcurementScore}`,
      b.co.subScores.procurement < medianProcurementScore, SOURCES.alba),
    indicator("Confirmed share of common spend", pct0((row.confirmedSpend / totalCommon) * 100),
      row.confirmedSpend / totalCommon > 0.5, SOURCES.alba),
    indicator("Earnings headroom", `EBITDA margin ${pct1(b.ebitdaPct)}`,
      b.ebitdaPct > 0, SOURCES.accounting),
    indicator("Renewal inside six months", row.earliestRenewal ?? "none scheduled",
      monthsToRenewal <= 6, SOURCES.accounting),
  ];

  return {
    type: TYPES.supplier,
    value,
    indicators,
    summary:
      `${b.co.name} holds ${row.contracts} contracts with suppliers used by ` +
      `${PROCUREMENT_PARAMS.minCompaniesForAction} or more portfolio companies, ${money(row.confirmedSpend)} of ` +
      `confirmed annual spend across ${categories} ${categories === 1 ? "category" : "categories"}. At the rates ` +
      `the portfolio programme already quotes, its share of the saving is ${money(value)} a year, with the first ` +
      `renewal on ${row.earliestRenewal}.`,
    basis: "Portfolio supplier matrix",
    facts: [
      { label: "Confirmed common spend", value: money(row.confirmedSpend) },
      { label: "Consolidation categories", value: `${categories}` },
      { label: "Held pending confirmation", value: row.pendingSpend > 0 ? money(row.pendingSpend) : "None" },
      { label: "Earliest renewal", value: row.earliestRenewal ?? "None scheduled" },
    ],
    workings: [
      { step: "Contracts with shared suppliers", value: `${row.contracts}` },
      { step: "Confirmed annual spend", value: money(row.confirmedSpend) },
      { step: "Held pending human confirmation", value: row.pendingSpend > 0 ? money(row.pendingSpend) : "None" },
      { step: "Categories in scope", value: `${categories}` },
      { step: "Expected value", value: money(value) },
    ],
  };
}

// ── Assembly ────────────────────────────────────────────────────────────────

function finalise(candidate, b) {
  const counted = confidenceFrom(candidate.indicators, b.freshness);
  const { band, status } = bandFor(counted.confidence);
  const value = Math.round(candidate.value);
  return {
    ...candidate,
    ...counted,
    companyId: b.co.id,
    company: b.co.name,
    initial: b.co.name.charAt(0),
    sector: b.co.sector,
    sectorLong: b.co.sectorLong,
    geo: b.co.geo,
    rag: b.co.rag,
    freshness: b.freshness,
    currency: REPORTING_CURRENCY,
    value,
    valueLabel: money(value),
    low: Math.round(value * (1 - PARAMS.sensitivity)),
    high: Math.round(value * (1 + PARAMS.sensitivity)),
    shareOfRevenuePct: (value / b.arr) * 100,
    band,
    status,
    weighted: (value * counted.confidence) / 100,
    sources: [...new Set(candidate.indicators.map((i) => i.source))],
    material: value >= PARAMS.minimumValueK,
    supported: counted.share >= PARAMS.minimumAgreementShare,
  };
}

/** Why a company that has candidates still does not appear. */
function exclusionReason(candidates) {
  if (!candidates.length) {
    return "No opportunity type qualified — margin held, coverage below the bar and no shared supplier spend";
  }
  const worst = candidates.slice().sort((a, b) => b.value - a.value)[0];
  if (!worst.supported) {
    return `${worst.type.label} worth ${worst.valueLabel}, but only ${worst.agreeing} of ` +
           `${worst.indicatorCount} independent indicators agree`;
  }
  return `Only signal is ${worst.type.label.toLowerCase()} worth ${worst.valueLabel}, below the ` +
         `${money(PARAMS.minimumValueK)} materiality floor`;
}

// ── Bubble labels ───────────────────────────────────────────────────────────
//
// Seven bubbles across two orders of magnitude of value put several labels on
// top of one another if each is simply written to the right of its point. The
// alternative most dashboards take is to drop the labels and make the reader
// hover, which on a screen whose whole argument is "here is the evidence" is
// the wrong trade. So the placement is solved once, here, deterministically:
// each label tries right, left, above and below in turn and takes the first
// position that clears every bubble and every label already placed. Largest
// value is placed first, so the opportunity that matters most keeps the most
// readable position.

const LABEL = { charWidth: 5.4, lineHeight: 11, padding: 4, gap: 6 };
const PLOT = { width: 520, height: 300, overflowRight: 92, overflowLeft: 6, overflowY: 8 };

function overlaps(a, b) {
  return a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
}

function layoutLabels(points, xDomain, yDomain) {
  const [x0, x1] = xDomain;
  const ly0 = Math.log10(yDomain[0]);
  const ly1 = Math.log10(yDomain[1]);

  const centres = points.map((p) => ({
    cx: ((p.x - x0) / (x1 - x0)) * PLOT.width,
    cy: PLOT.height - ((Math.log10(p.y) - ly0) / (ly1 - ly0)) * PLOT.height,
    r: p.radius,
  }));
  const bubbles = centres.map((o) => ({ x1: o.cx - o.r, x2: o.cx + o.r, y1: o.cy - o.r, y2: o.cy + o.r }));

  const placed = [];
  const out = new Array(points.length);
  const order = points.map((_, i) => i).sort((a, b) => points[b].value - points[a].value);

  for (const i of order) {
    const p = points[i];
    const o = centres[i];
    const w = Math.max(p.company.length, p.valueLabel.length) * LABEL.charWidth + LABEL.padding * 2;
    const h = LABEL.lineHeight * 2 + LABEL.padding;

    const options = [
      { anchor: "start",  dx: o.r + LABEL.gap,      dy: -1,
        x1: o.cx + o.r + LABEL.gap,     y1: o.cy - h / 2 },
      { anchor: "end",    dx: -(o.r + LABEL.gap),   dy: -1,
        x1: o.cx - o.r - LABEL.gap - w, y1: o.cy - h / 2 },
      { anchor: "middle", dx: 0, dy: -(o.r + LABEL.gap + LABEL.lineHeight),
        x1: o.cx - w / 2,               y1: o.cy - o.r - LABEL.gap - h },
      { anchor: "middle", dx: 0, dy: o.r + LABEL.gap + LABEL.lineHeight - 2,
        x1: o.cx - w / 2,               y1: o.cy + o.r + LABEL.gap },
    ];

    let chosen = null;
    let chosenBox = null;
    for (const opt of options) {
      const box = { x1: opt.x1, x2: opt.x1 + w, y1: opt.y1, y2: opt.y1 + h };
      const inside = box.x1 >= -PLOT.overflowLeft && box.x2 <= PLOT.width + PLOT.overflowRight
        && box.y1 >= -PLOT.overflowY && box.y2 <= PLOT.height + PLOT.overflowY;
      const clear = inside
        && !placed.some((b) => overlaps(box, b))
        && !bubbles.some((b, j) => j !== i && overlaps(box, b));
      if (clear) { chosen = opt; chosenBox = box; break; }
      if (!chosenBox) chosenBox = box;
    }
    if (!chosen) { chosen = options[0]; chosenBox = { x1: options[0].x1, x2: options[0].x1 + w, y1: options[0].y1, y2: options[0].y1 + h }; }
    placed.push(chosenBox);
    out[i] = { anchor: chosen.anchor, dx: Math.round(chosen.dx), dy: Math.round(chosen.dy), lineHeight: LABEL.lineHeight };
  }
  return out;
}

/** Nice log ticks spanning a range, so a value axis over two orders reads. */
export function valueTicks(min, max) {
  const out = [];
  for (let exp = -1; exp <= 6; exp++) {
    for (const mantissa of [1, 2.5, 5]) {
      const t = mantissa * 10 ** exp;
      if (t >= min && t <= max) out.push(t);
    }
  }
  return out;
}

/**
 * The whole radar.
 *
 * @param {object} opts passed through to buildFinance
 * @returns {{opportunities, excluded, totals, leader, scatter, provenance}}
 */
export function buildOpportunityRadar(opts = {}) {
  const calibration = crossSellCalibration(opts);
  const suppliers = supplierSavings();
  const readings = COMPANIES.map((co) => reading(co, opts));
  const medianGrowth = median(readings.map((b) => b.growthPct));
  const medianProcurementScore = median(COMPANIES.map((c) => c.subScores.procurement));

  const opportunities = [];
  const excluded = [];

  for (const b of readings) {
    const candidates = [
      crossSellCandidate(b, calibration),
      pricingCandidate(b, medianGrowth),
      contractCandidate(b),
      supplierCandidate(b, suppliers.get(b.co.id), medianProcurementScore),
    ].filter(Boolean).map((c) => finalise(c, b));

    const passing = candidates.filter((c) => c.material && c.supported);
    if (!passing.length) {
      excluded.push({
        companyId: b.co.id,
        company: b.co.name,
        sector: b.co.sector,
        rag: b.co.rag,
        candidates: candidates.length,
        reason: exclusionReason(candidates),
      });
      continue;
    }
    // Ranked on confidence-weighted value, so a large number nothing supports
    // never outranks a smaller one the evidence agrees with.
    passing.sort((x, y) => y.weighted - x.weighted);
    const chosen = passing[0];
    opportunities.push({
      ...chosen,
      alternatives: passing.slice(1).map((c) => ({
        type: c.type, value: c.value, valueLabel: c.valueLabel, confidence: c.confidence,
      })),
    });
  }

  opportunities.sort((a, b) => b.weighted - a.weighted);
  opportunities.forEach((o, i) => { o.rank = i + 1; o.leader = i === 0; });

  const leader = opportunities[0] ?? null;
  const values = opportunities.map((o) => o.value);
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 0;

  // Bubble radius by value, area-proportional so a bubble twice the area reads
  // as twice the money rather than four times it.
  const RADIUS = { min: 5, max: 19 };
  const rootSpan = Math.sqrt(maxValue) - Math.sqrt(minValue);
  const confidenceDomain = [PARAMS.confidenceFloor, 100];
  const valueDomain = [Math.max(1, minValue * 0.55), Math.max(2, maxValue * 1.9)];

  const scatter = opportunities.map((o) => ({
    ...o,
    x: o.confidence,
    y: o.value,
    radius: rootSpan > 0
      ? RADIUS.min + (RADIUS.max - RADIUS.min) * ((Math.sqrt(o.value) - Math.sqrt(minValue)) / rootSpan)
      : (RADIUS.min + RADIUS.max) / 2,
  }));
  const placements = layoutLabels(scatter, confidenceDomain, valueDomain);
  scatter.forEach((p, i) => { p.label = placements[i]; });

  const qualifiedUpside = values.reduce((t, v) => t + v, 0);
  const confidences = opportunities.map((o) => o.confidence);
  const health = integrationHealth();
  const sources = [...new Set(opportunities.flatMap((o) => o.sources))];

  return {
    asOf: AS_OF_MONTH,
    asOfDate: AS_OF_DATE,
    currency: REPORTING_CURRENCY,
    opportunities,
    excluded,
    leader,
    scatter,
    calibration,
    medianGrowth,
    medianProcurementScore,
    sources,
    connected: health.summary.text,
    axes: {
      confidence: confidenceDomain,
      confidenceTicks: [40, 50, 60, 70, 80, 90, 100],
      value: valueDomain,
      valueTicks: valueTicks(valueDomain[0], valueDomain[1]),
    },
    totals: {
      qualifiedUpside,
      qualifiedUpsideLabel: money(qualifiedUpside),
      lowLabel: money(qualifiedUpside * (1 - PARAMS.sensitivity)),
      highLabel: money(qualifiedUpside * (1 + PARAMS.sensitivity)),
      highConfidenceCount: opportunities.filter((o) => o.confidence >= PARAMS.highConfidence).length,
      companiesWithSignals: opportunities.length,
      companiesAssessed: COMPANIES.length,
      excludedCount: excluded.length,
      medianConfidence: Math.round(median(confidences)),
      typesInPlay: new Set(opportunities.map((o) => o.type.id)).size,
      typesAssessed: Object.keys(TYPES).length,
      alternativesCount: opportunities.reduce((t, o) => t + o.alternatives.length, 0),
    },
    provenance: [
      "Opportunity scores use transparent rules",
      `${sources.join(" + ")} data`,
      `Ledger as of ${AS_OF_MONTH}`,
      `Last refresh ${AS_OF_DATE}`,
    ],
  };
}

/**
 * The rules, in the order they are applied — so "why is this company here?"
 * and "why is that one not?" are answered on the screen rather than in a doc.
 */
export function scoringRules() {
  return [
    {
      type: TYPES.crossSell,
      gate: `Sector carries a second product line (${[...CROSS_SELL_SECTORS].join(", ")})`,
      formula: "annual revenue × accounts without the second product × qualifying rate × attach rate × conversion",
      note: `Rates solved from the one company with account-level product data, then scaled by each company's ` +
            `own sales sub-score. Attach rate ${pct0(PARAMS.attachRate * 100)}, conversion held between ` +
            `${pct0(PARAMS.conversionFloor * 100)} and ${pct0(PARAMS.conversionCeiling * 100)}.`,
    },
    {
      type: TYPES.pricing,
      gate: `Gross margin at least ${pct1(PARAMS.marginErosionFloorPts)} below the opening of the ledger`,
      formula: "annual revenue × margin given up × recoverable share",
      note: `${pct0(PARAMS.marginRecoveryShare * 100)} of the erosion is treated as recoverable through price and ` +
            `mix. The remainder is treated as structural and is not claimed.`,
    },
    {
      type: TYPES.contract,
      gate: `Pipeline coverage at or above ${PARAMS.coverageBar.toFixed(1)}× and revenue at or above plan`,
      formula: "quarterly quota × coverage above the bar × win rate",
      note: `${KPIS.pipelineCoverage.definition} The quota is the monthly plan × 3, and the win rate is the ` +
            `company's own trailing figure rather than a portfolio average.`,
    },
    {
      type: TYPES.supplier,
      gate: `Confirmed spend with suppliers used by ${PROCUREMENT_PARAMS.minCompaniesForAction} or more companies`,
      formula: "confirmed spend per category × the category's consolidation rate",
      note: "Spend whose supplier identity is only a candidate match is held out of the saving until a person " +
            "confirms it, exactly as on the procurement screen.",
    },
  ];
}

/** The two floors every candidate has to clear, stated for the screen. */
export function qualificationFloors() {
  return [
    { label: "Materiality", value: `${money(PARAMS.minimumValueK)} a year`,
      note: "Below this the coordination cost of a portfolio programme exceeds the return." },
    { label: "Agreement", value: `${pct0(PARAMS.minimumAgreementShare * 100)} of indicators`,
      note: "At least half the independent indicators must agree before an opportunity is reported." },
    { label: "Confidence", value: `${PARAMS.confidenceFloor}–100`,
      note: `Counted as ${PARAMS.confidenceFloor} plus ${PARAMS.confidenceSpan} × the share of indicators that ` +
            `agree, plus up to ${PARAMS.dataQualityBonus} for the freshness of the company's own feeds.` },
  ];
}

export { money as formatRadarMoney };
