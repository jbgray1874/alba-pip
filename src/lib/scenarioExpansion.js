// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Scenario 4: sales acceleration and expansion opportunity
//  ----------------------------------------------------------------------------
//  BrightWave Digital is performing in line with plan, so nothing in conventional
//  reporting draws attention to it. Alba finds a cross-sell cohort by scoring
//  every customer against the profile of the accounts that previously bought
//  the second product.
//
//  The scoring is rule-based on purpose. The specification is explicit that a
//  transparent score beats an unexplained model here, because the investor
//  question is "why this account?" and a weighted rule set answers it in a
//  sentence. Every factor reports the basis it scored on.
// ════════════════════════════════════════════════════════════════════════════

import { buildFinance, FIN_SEED } from "./financeData.js";
import { companyById } from "./companies.js";
import { makeInsight, evidence, CONFIDENCE } from "./insight.js";
import { SOURCES } from "./kpiDefinitions.js";
import { fmtMoney } from "./fx.js";

export const COMPANY_ID = "zafira";

export const PRODUCTS = { A: "Payments Core", B: "Reconciliation Suite", C: "Treasury Insights" };

export const WEIGHTS = {
  usageTrend: 30, accountHealth: 25, lookalike: 15, sizeFit: 15, renewalWindow: 10, serviceClean: 5,
};

export const PARAMS = {
  customers: 42,
  qualifyingScore: 62,
  attachRate: 0.40,       // second-product ACV as a share of the account's current ARR — the single
                          // assumption driving the size of this number, stated so it can be challenged
  conversionFloor: 0.10,
  conversionCeiling: 0.70,
  sensitivity: 0.15,
};

/** Accounts that already bought the second product — the comparison set. */
export const PRIOR_WINS = [
  { account: "Selangor Retail Bank", usageTrend: 0.31, arrAtPurchase: 1420, tenure: 22 },
  { account: "Dhow Freight Holdings", usageTrend: 0.24, arrAtPurchase: 980, tenure: 18 },
  { account: "Batavia Payments Group", usageTrend: 0.36, arrAtPurchase: 1850, tenure: 26 },
  { account: "Khalidiya Retail Partners", usageTrend: 0.22, arrAtPurchase: 1200, tenure: 20 },
  { account: "Straits Micro Lending", usageTrend: 0.28, arrAtPurchase: 860, tenure: 24 },
  { account: "Cebu Commerce Bank", usageTrend: 0.33, arrAtPurchase: 1610, tenure: 19 },
];

const CENTROID = {
  usageTrend: PRIOR_WINS.reduce((t, w) => t + w.usageTrend, 0) / PRIOR_WINS.length,
  arr: PRIOR_WINS.reduce((t, w) => t + w.arrAtPurchase, 0) / PRIOR_WINS.length,
  tenure: PRIOR_WINS.reduce((t, w) => t + w.tenure, 0) / PRIOR_WINS.length,
};

const SEGMENTS = ["Banking", "Marketplace", "Retail", "Logistics", "Lending"];
const FIRST = ["Al Reem", "Khalidiya", "Yas", "Mussafah", "Deira", "Jumeirah", "Sharjah", "Fujairah",
  "Andaman", "Jurong", "Sentosa", "Penang", "Bintan", "Cebu", "Davao", "Bandung",
  "Surabaya", "Hanoi", "Danang", "Phuket", "Klang", "Ipoh", "Malacca", "Batam",
  "Medan", "Makati", "Doha", "Manama", "Muscat", "Salalah", "Riyadh", "Jeddah",
  "Dammam", "Tabuk", "Kandal", "Vientiane", "Yangon", "Colombo", "Karachi", "Male",
  "Sabah", "Mekong"];
const LAST = ["Commerce", "Capital", "Holdings", "Financial", "Retail Group", "Logistics",
  "Payments", "Trading", "Ventures", "Partners"];

function rngFor(key) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (r, lo, hi) => lo + r() * (hi - lo);
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

function addDays(iso, days) {
  const d = new Date(`${iso}-01T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Transparent, additive score. Each factor reports what it scored on. */
export function scoreAccount(c) {
  const parts = [
    { factor: "Usage trend", weight: WEIGHTS.usageTrend, n: clamp((c.usageTrend + 0.10) / 0.45),
      basis: `90-day product usage trend of ${(c.usageTrend * 100).toFixed(0)}%` },
    { factor: "Account health", weight: WEIGHTS.accountHealth, n: clamp((c.health - 0.3) / 0.65),
      basis: `account health index of ${c.health.toFixed(2)}` },
    { factor: "Lookalike match", weight: WEIGHTS.lookalike,
      n: clamp(1 - (Math.abs(c.usageTrend - CENTROID.usageTrend) / 0.45 +
                    Math.abs(c.arr - CENTROID.arr) / 2200 +
                    Math.abs(c.tenure - CENTROID.tenure) / 26) / 3),
      basis: "similarity to the six accounts that previously adopted the Reconciliation Suite" },
    { factor: "Size fit", weight: WEIGHTS.sizeFit, n: clamp(1 - Math.abs(c.arr - CENTROID.arr) / 2200),
      basis: `annual recurring revenue of ${Math.round(c.arr)}k` },
    { factor: "Renewal window", weight: WEIGHTS.renewalWindow,
      n: c.renewalInDays >= 45 && c.renewalInDays <= 200 ? 1 : clamp(1 - Math.abs(c.renewalInDays - 120) / 260),
      basis: `renewal in ${c.renewalInDays} days` },
    { factor: "No service issues", weight: WEIGHTS.serviceClean, n: c.openSev1 === 0 ? 1 : 0,
      basis: c.openSev1 === 0 ? "no open severity-one tickets" : `${c.openSev1} open severity-one tickets` },
  ];
  let score = 0;
  const breakdown = parts.map((p) => {
    const points = p.weight * p.n;
    score += points;
    return { factor: p.factor, points: Math.round(points * 10) / 10, of: p.weight, basis: p.basis };
  });
  return { score: Math.round(score * 10) / 10, breakdown };
}

export function buildExpansion(opts = {}) {
  const co = companyById(COMPANY_ID);
  const fin = buildFinance({ id: COMPANY_ID, status: co.rag.toLowerCase() }, opts);
  const ccy = fin.native.currency;
  const arrTotal = FIN_SEED[COMPANY_ID].revenue * 12;
  const money = (v) => fmtMoney(v, ccy, { k: true });

  // ── Customer base ──
  const raw = Array.from({ length: PARAMS.customers }, (_, i) => {
    const account = `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`;
    const r = rngFor(`zafira:${account}`);
    const weight = between(r, 0.35, 2.6) ** 1.6;
    const usageTrend = Math.round(between(r, -0.14, 0.44) * 1000) / 1000;
    const health = Math.round(clamp(between(r, 0.32, 0.99)) * 100) / 100;
    const tenure = Math.round(between(r, 4, 40));
    const renewalInDays = Math.round(between(r, 12, 400));
    const openSev1 = r() < 0.18 ? Math.ceil(between(r, 1, 3)) : 0;
    const ownsB = r() < 0.22;
    const ownsC = r() < 0.30;
    return { account, segment: SEGMENTS[i % SEGMENTS.length], weight, usageTrend, health, tenure,
             renewalInDays, renewalDate: addDays(fin.asOf, renewalInDays), openSev1,
             products: [PRODUCTS.A, ownsB ? PRODUCTS.B : null, ownsC ? PRODUCTS.C : null].filter(Boolean) };
  });

  const weightTotal = raw.reduce((t, c) => t + c.weight, 0);
  const scored = raw.map(({ weight, ...c }) => {
    const arr = Math.round((weight / weightTotal) * arrTotal);
    const withArr = { ...c, arr };
    const { score, breakdown } = scoreAccount(withArr);
    const ownsTarget = c.products.includes(PRODUCTS.B);
    const pConvert = clamp((score - 50) / 70, PARAMS.conversionFloor, PARAMS.conversionCeiling);
    const gross = arr * PARAMS.attachRate;
    return {
      ...withArr, score, breakdown, ownsTarget,
      qualified: !ownsTarget && score >= PARAMS.qualifyingScore,
      conversionProbability: Math.round(pConvert * 100) / 100,
      grossOpportunity: Math.round(gross),
      expectedValue: Math.round(gross * pConvert),
    };
  });

  const qualified = scored.filter((c) => c.qualified).sort((a, b) => b.expectedValue - a.expectedValue);
  const expected = qualified.reduce((t, c) => t + c.expectedValue, 0);
  const gross = qualified.reduce((t, c) => t + c.grossOpportunity, 0);
  const low = expected * (1 - PARAMS.sensitivity);
  const high = expected * (1 + PARAMS.sensitivity);
  const penetration = scored.filter((c) => c.ownsTarget).length / scored.length;

  const insight = makeInsight({
    id: "zafira-cross-sell",
    type: "opportunity",
    companyId: co.id,
    companyName: co.name,
    raisedOn: fin.asOf,
    headline: `Cross-sell cohort worth ${money(low)}–${money(high)} of additional ARR`,
    whatHappened:
      `${qualified.length} existing ${co.name} customers match the profile of the six accounts that previously ` +
      `adopted the ${PRODUCTS.B}: rising product usage, healthy account signals and renewal dates inside the next ` +
      `two quarters. None of them owns the product today.`,
    whyItMatters:
      `${co.name} is tracking plan, so nothing in the monthly pack draws attention here. Second-product ` +
      `penetration is ${(penetration * 100).toFixed(0)}% of the customer base. Converting this cohort would add ` +
      `${((expected / arrTotal) * 100).toFixed(1)}% to recurring revenue with no new customer acquisition cost.`,
    evidence: [
      evidence("Qualified accounts", `${qualified.length} of ${scored.length} score ${PARAMS.qualifyingScore}+ and do not own the ${PRODUCTS.B}`, SOURCES.billing, fin.asOf, { weights: WEIGHTS }),
      evidence("Gross opportunity before conversion", money(gross), SOURCES.alba, fin.asOf, { attachRate: PARAMS.attachRate }),
      evidence("Comparison set", `${PRIOR_WINS.length} prior adoptions, average usage trend ${(CENTROID.usageTrend * 100).toFixed(0)}% at purchase`, SOURCES.crm, fin.asOf, { priorWins: PRIOR_WINS }),
      evidence("Renewal timing", `${qualified.filter((c) => c.renewalInDays <= 200).length} of ${qualified.length} renew within 200 days`, SOURCES.billing, fin.asOf),
    ],
    impact: { measure: "Incremental annual recurring revenue", value: expected, currency: ccy, direction: "upside", horizon: "Next four quarters" },
    confidence: CONFIDENCE.MEDIUM,
    methodology:
      `Every customer is scored on six weighted, inspectable factors. Accounts scoring ${PARAMS.qualifyingScore} ` +
      `or above that do not already own the ${PRODUCTS.B} are qualified. Expected value is the account's current ` +
      `ARR × a ${Math.round(PARAMS.attachRate * 100)}% attach rate × a conversion probability derived linearly ` +
      `from its score. The reported range applies a ±${Math.round(PARAMS.sensitivity * 100)}% sensitivity to conversion.`,
    actions: qualified.slice(0, 5).map((c, i) => ({
      action: `Cross-sell approach to ${c.account} (${c.segment})`,
      owner: i % 2 === 0 ? "VP Sales, Middle East" : "VP Sales, Southeast Asia",
      due: c.renewalDate,
      rationale: `Score ${c.score}, renewal in ${c.renewalInDays} days, expected ${money(c.expectedValue)}.`,
    })),
    drillDown: { scored, qualified },
  });

  return { company: co, fin, currency: ccy, customers: scored, qualified,
           totals: { expected, gross, low, high, penetration, arrTotal }, insight };
}
