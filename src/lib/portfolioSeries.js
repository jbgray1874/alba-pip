// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Portfolio Ledger
//  ----------------------------------------------------------------------------
//  Eighteen months of monthly financials per company, calibrated so the final
//  month reproduces FIN_SEED exactly. All values in £k, matching financeData.js.
//
//  Why this exists: the drill-down previously drew each sparkline with
//  trend(end, 6, growth) — an independent straight line back from whatever the
//  metric is today. That is fine to look at and impossible to interrogate. The
//  payroll trend and the R&D trend had no common origin, so nothing could be
//  cross-checked, and no figure could answer "compared with when?".
//
//  Here every series is a slice of one ledger. Gross profit is revenue less
//  cost of sales in every month, EBITDA is gross profit less operating cost in
//  every month, and cash is the running consequence of burn. The present is not
//  allowed to move: calibration forces month 18 onto the seed.
//
//  Deterministic by construction — no Math.random, no clock. The figures in a
//  rehearsal are the figures in the meeting.
// ════════════════════════════════════════════════════════════════════════════

export const MONTHS_OF_HISTORY = 18;

// The platform's present. MONTHS in financeData.js runs Dec…May, so "now" is
// May 2026 and the ledger ends there.
export const AS_OF_MONTH = "2026-05";

// Trajectory per company. These shape the history; they do not set the
// endpoint — calibration does that from FIN_SEED.
//   growth     revenue growth per month
//   planDrift  extra annual growth assumed by the plan (widens variance)
//   gmDrift    gross-margin points given up over the period (negative = gained)
//   burnFrom   burn 18 months ago as a share of today's
const ARCS = {
  meridian:   { growth: 0.009,  planDrift: 0.085, gmDrift: 2.0,  burnFrom: 0.62 },
  payflo:     { growth: 0.016,  planDrift: 0.002, gmDrift: -1.5, burnFrom: 0.75 },
  swiftlogix: { growth: 0.010,  planDrift: 0.048, gmDrift: 2.0,  burnFrom: 0.70 },
  careos:     { growth: 0.004,  planDrift: 0.220, gmDrift: 6.0,  burnFrom: 0.55 },
  forgetech:  { growth: 0.0139, planDrift: -0.012, gmDrift: 8.0, burnFrom: 0.68 },
};

const DEFAULT_ARC = { growth: 0.010, planDrift: 0.030, gmDrift: 2.0, burnFrom: 0.68 };

// ── Seeded noise ────────────────────────────────────────────────────────────
// Small month-to-month variation so the lines are not suspiciously straight,
// but reproducible: the same company always produces the same history.

function seedFrom(key) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wobble(rng, sd) {
  const n = (rng() + rng() + rng() + rng() + rng() + rng() - 3) / 0.7071;
  return Math.max(-3, Math.min(3, n)) * sd;
}

const r1 = (n) => Math.round(n * 10) / 10;

/** Month keys ending at AS_OF_MONTH, e.g. "2024-12" … "2026-05". */
export function monthKeys(count = MONTHS_OF_HISTORY, endMonth = AS_OF_MONTH) {
  const [ey, em] = endMonth.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const total = ey * 12 + (em - 1) - (count - 1 - i);
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
  });
}

export const MONTH_KEYS = monthKeys();

/**
 * Build the ledger for one company.
 *
 * @param {string} id       company id, e.g. "meridian"
 * @param {object} seed     the FIN_SEED row: { cash, burn, revenue, budget, gm, ebitdaPct }
 * @returns {Array<object>} 18 rows, oldest first, all values in £k
 */
export function buildSeries(id, seed) {
  const arc = ARCS[id] || DEFAULT_ARC;
  const rng = makeRng(seedFrom(`alba:${id}`));
  const n = MONTHS_OF_HISTORY;
  const lastIdx = n - 1;

  // ── Revenue: grow backwards from today, then re-anchor exactly ──
  const rawRevenue = MONTH_KEYS.map((_, i) => {
    const trend = seed.revenue / Math.pow(1 + arc.growth, lastIdx - i);
    return trend * (1 + wobble(rng, 0.012));
  });
  const revScale = seed.revenue / rawRevenue[lastIdx];
  const revenue = rawRevenue.map((v) => v * revScale);

  // ── Plan: its own growth path, anchored on budget ──
  const planRate = arc.growth + arc.planDrift / 12;
  const rawPlan = MONTH_KEYS.map((_, i) => seed.revenue / Math.pow(1 + planRate, lastIdx - i));
  const planScale = seed.budget / rawPlan[lastIdx];
  const planRevenue = rawPlan.map((v) => v * planScale);

  // ── Margin: drifts to today's gross margin ──
  const gmAt = (i) => seed.gm + arc.gmDrift * ((lastIdx - i) / lastIdx);

  // Operating cost holds a constant share of gross profit, set so that the
  // final month lands on the seed EBITDA margin.
  const finalGross = (seed.revenue * seed.gm) / 100;
  const finalEbitda = (seed.revenue * seed.ebitdaPct) / 100;
  const opexOverGross = (finalGross - finalEbitda) / finalGross;

  // ── Burn ramps to today's figure; cash is its running consequence ──
  const netBurn = MONTH_KEYS.map((_, i) =>
    seed.burn * (arc.burnFrom + (1 - arc.burnFrom) * (i / lastIdx)),
  );
  const cashClose = new Array(n);
  cashClose[lastIdx] = seed.cash;
  for (let i = lastIdx - 1; i >= 0; i--) cashClose[i] = cashClose[i + 1] + netBurn[i + 1];

  return MONTH_KEYS.map((month, i) => {
    const rev = revenue[i];
    const gmPct = gmAt(i);
    const grossProfit = (rev * gmPct) / 100;
    const cogs = rev - grossProfit;
    const opex = grossProfit * opexOverGross;
    const ebitda = grossProfit - opex;

    return {
      month,
      revenue: rev,
      planRevenue: planRevenue[i],
      cogs,
      grossProfit,
      grossMarginPct: gmPct,
      opex,
      ebitda,
      ebitdaMarginPct: (ebitda / rev) * 100,
      netBurn: netBurn[i],
      cashClose: cashClose[i],
    };
  });
}

/**
 * Six-point sparkline for a metric, taken from the ledger.
 * Drop-in replacement for trend() — same length, same units, real provenance.
 */
export function seriesOf(series, field, prop = 1) {
  return series.slice(-6).map((row) => r1(row[field] * prop));
}
