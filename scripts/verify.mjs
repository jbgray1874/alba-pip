#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — pre-deploy verification
//  ----------------------------------------------------------------------------
//  Checks the claims that matter before anything reaches a customer. Run it
//  before every deploy and before every rehearsal:
//
//      npm run verify
//
//  It is deliberately about arithmetic and provenance rather than appearance.
//  Layout, interaction and the serverless functions are not covered — see the
//  notes it prints at the end for what still needs a human and `vercel dev`.
//
//  Exits non-zero on failure, so it can move into CI unchanged.
// ════════════════════════════════════════════════════════════════════════════

import { FIN_SEED, buildFinance } from "../src/lib/financeData.js";
import { buildSeries } from "../src/lib/portfolioSeries.js";
import { COMPANIES, FUNDS, forDashboard, forAnalytics } from "../src/lib/companies.js";
import { buildRevenueMiss } from "../src/lib/scenarioRevenueMiss.js";
import { buildExpansion } from "../src/lib/scenarioExpansion.js";
import { buildExceptionReport, buildGrowthBrief, reportToHtml } from "../src/lib/reports.js";

let failures = 0;
let checks = 0;

const ok = (n) => console.log(`  \x1b[32m✓\x1b[0m ${n}`);
const bad = (n, d) => { failures++; console.log(`  \x1b[31m✗\x1b[0m ${n}\n      ${d}`); };
const check = (name, fn) => {
  checks++;
  try { const r = fn(); r === true ? ok(name) : bad(name, r); }
  catch (e) { bad(name, e.message); }
};
const section = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);
const near = (a, b, tol = 0.01) => Math.abs(a - b) < tol;

// ── 1. The figures already on screen must not move ──────────────────────────
section("Seed fidelity — the companies you already show must not change");

for (const [id, seed] of Object.entries(FIN_SEED)) {
  check(`${id} reproduces its seed exactly`, () => {
    const f = buildFinance({ id, status: "amber" });
    const n = f.native;
    const diffs = [];
    if (!near(n.revenue, seed.revenue)) diffs.push(`revenue ${n.revenue} != ${seed.revenue}`);
    if (!near(n.budget, seed.budget)) diffs.push(`budget ${n.budget} != ${seed.budget}`);
    if (!near(n.cash, seed.cash)) diffs.push(`cash ${n.cash} != ${seed.cash}`);
    if (!near(n.burn, seed.burn)) diffs.push(`burn ${n.burn} != ${seed.burn}`);
    if (!near(f.ebitda.grossMargin, seed.gm, 0.5)) diffs.push(`gross margin ${f.ebitda.grossMargin} != ${seed.gm}`);
    if (!near(f.ebitda.pct, seed.ebitdaPct, 0.5)) diffs.push(`EBITDA ${f.ebitda.pct} != ${seed.ebitdaPct}`);
    return diffs.length === 0 || diffs.join("; ");
  });
}

// ── 2. The ledger must tie, every month ─────────────────────────────────────
section("Ledger — every month must reconcile");

check("gross profit, EBITDA and cash tie in all 18 months for all 9 companies", () => {
  const bad = [];
  for (const [id, seed] of Object.entries(FIN_SEED)) {
    const L = buildSeries(id, seed);
    if (L.length !== 18) bad.push(`${id} has ${L.length} months`);
    for (const m of L) {
      if (!near(m.grossProfit, m.revenue - m.cogs)) bad.push(`${id} ${m.month} gross profit`);
      if (!near(m.ebitda, m.grossProfit - m.opex)) bad.push(`${id} ${m.month} EBITDA`);
    }
    for (let i = 1; i < L.length; i++) {
      if (!near(L[i].cashClose, L[i - 1].cashClose - L[i].netBurn)) bad.push(`${id} ${L[i].month} cash roll`);
    }
  }
  return bad.length === 0 || `${bad.length} failures, first: ${bad[0]}`;
});

check("people and sales series are populated for every company", () => {
  const bad = [];
  for (const [id, seed] of Object.entries(FIN_SEED)) {
    for (const m of buildSeries(id, seed)) {
      if (!(m.headcount > 0) || !(m.pipelineCoverage > 0) || !(m.winRatePct > 0)) bad.push(`${id} ${m.month}`);
    }
  }
  return bad.length === 0 || `missing at ${bad[0]}`;
});

// ── 3. Registry ─────────────────────────────────────────────────────────────
section("Registry — one definition, filters with something to filter");

check(`portfolio has 8-10 companies (has ${COMPANIES.length})`,
  () => (COMPANIES.length >= 8 && COMPANIES.length <= 10) || `${COMPANIES.length} companies`);
check("every company has a fund, geography and currency", () => {
  const missing = COMPANIES.filter((c) => !c.fund || !c.geo || !c.currency).map((c) => c.id);
  return missing.length === 0 || `missing on ${missing.join(", ")}`;
});
check("every company's fund exists", () => {
  const orphan = COMPANIES.filter((c) => !FUNDS.some((f) => f.id === c.fund)).map((c) => c.id);
  return orphan.length === 0 || `unknown fund on ${orphan.join(", ")}`;
});
check("filters have more than one value each", () => {
  const thin = [];
  if (new Set(COMPANIES.map((c) => c.fund)).size < 2) thin.push("fund");
  if (new Set(COMPANIES.map((c) => c.geo)).size < 2) thin.push("geography");
  if (new Set(COMPANIES.map((c) => c.sector)).size < 2) thin.push("sector");
  if (new Set(COMPANIES.map((c) => c.rag)).size < 2) thin.push("status");
  return thin.length === 0 || `only one value for ${thin.join(", ")}`;
});
check("dashboard and analytics agree on runway for every company", () => {
  const d = forDashboard(), a = forAnalytics();
  const bad = d.filter((x) => !near(x.runway, a.find((y) => y.id === x.id).runway, 0.05)).map((x) => x.id);
  return bad.length === 0 || `disagree on ${bad.join(", ")}`;
});

// ── 4. Scenario 1 ───────────────────────────────────────────────────────────
section("Scenario 1 — revenue miss");

const s1 = buildRevenueMiss();
check("driver bridge reconciles to the forecast gap", () => {
  const sum = s1.bridge.reduce((t, b) => t + b.value, 0);
  return (near(sum, s1.forecast.forecastGap, 1e-6) &&
          near(s1.forecast.planRevenue - sum, s1.forecast.forecastRevenue, 1e-6))
    || `drivers ${sum.toFixed(1)} vs gap ${s1.forecast.forecastGap.toFixed(1)}`;
});
check("every driver contributes to the shortfall and shows its workings", () => {
  const bad = s1.bridge.filter((b) => !(b.value > 0) || !b.workings || b.workings.length < 20).map((b) => b.driver);
  return bad.length === 0 || `problem with ${bad.join(", ")}`;
});
check(`forecast gap lands near the specification's 1,200 (is ${Math.round(s1.forecast.forecastGap)})`,
  () => (s1.forecast.forecastGap > 1000 && s1.forecast.forecastGap < 1400) || `${Math.round(s1.forecast.forecastGap)}`);
check("reported revenue still looks close to plan, or there is no story", () =>
  Math.abs(s1.currentQuarter.variancePct) < 5 || `${s1.currentQuarter.variancePct.toFixed(1)}% below plan is too visible`);
check("named opportunities sum to the stated open pipeline", () => {
  const total = s1.deals.reduce((t, d) => t + d.acv, 0);
  return near(total, s1.forecast.openPipelineAcv, 5) || `deals ${Math.round(total)} vs pipeline ${Math.round(s1.forecast.openPipelineAcv)}`;
});
check("coverage and win rate match the specification", () =>
  (near(s1.forecast.coverage, 1.9, 0.05) && near(s1.fin.sales.coverageFrom, 3.2, 0.05))
  || `coverage ${s1.forecast.coverage} from ${s1.fin.sales.coverageFrom}`);

// ── 5. Scenario 4 ───────────────────────────────────────────────────────────
section("Scenario 4 — expansion");

const s4 = buildExpansion();
check(`expected value lands in the specification's 1,500-2,000 (is ${Math.round(s4.totals.expected)})`,
  () => (s4.totals.expected > 1400 && s4.totals.expected < 2100) || `${Math.round(s4.totals.expected)}`);
check("accounts sum to the stated total", () => {
  const sum = s4.qualified.reduce((t, c) => t + c.expectedValue, 0);
  return near(sum, s4.totals.expected, 1) || `accounts ${sum} vs total ${s4.totals.expected}`;
});
check("every qualified account explains its own score", () => {
  const bad = [];
  for (const c of s4.qualified) {
    if (c.breakdown.length !== 6) bad.push(`${c.account} has ${c.breakdown.length} factors`);
    const total = c.breakdown.reduce((t, f) => t + f.points, 0);
    if (Math.abs(total - c.score) > 0.6) bad.push(`${c.account} factors do not sum to its score`);
    if (c.breakdown.some((f) => !f.basis || f.points > f.of + 1e-9)) bad.push(`${c.account} factor without basis or over weight`);
    if (c.ownsTarget) bad.push(`${c.account} already owns the product`);
  }
  return bad.length === 0 || bad[0];
});

// ── 6. Evidence and provenance ──────────────────────────────────────────────
section("Evidence — nothing asserted without a source");

for (const [name, ins] of [["scenario 1", s1.insight], ["scenario 4", s4.insight]]) {
  check(`${name} insight carries sourced, dated evidence and dated actions`, () => {
    if (!ins.evidence?.length) return "no evidence";
    for (const e of ins.evidence) {
      if (!e.source) return `"${e.label}" has no source`;
      if (!/^\d{4}-\d{2}$|^\d{4}-\d{2}-\d{2}$/.test(e.asOf)) return `"${e.label}" has no refresh date`;
    }
    if (!ins.methodology || ins.methodology.length < 40) return "no methodology";
    if (!ins.actions?.length) return "no actions";
    for (const a of ins.actions) if (!a.owner || !a.due) return "an action has no owner or date";
    return true;
  });
}

check("finance data carries source labels and methodology", () => {
  const f = buildFinance({ id: "meridian", status: "amber" });
  for (const block of ["cash", "revenue", "ebitda", "people", "sales"]) {
    if (!f[block]?.source?.label) return `${block} has no source label`;
    if (!f[block]?.asOf) return `${block} has no as-of date`;
  }
  return true;
});

// ── 7. Reports ──────────────────────────────────────────────────────────────
section("Reports — circulatable without editing");

for (const [name, report] of [["exception report", buildExceptionReport(s1)], ["growth brief", buildGrowthBrief(s4)]]) {
  check(`${name} renders clean`, () => {
    const html = reportToHtml(report);
    if (/undefined|NaN|\[object Object\]/.test(html)) return "contains undefined, NaN or [object Object]";
    if (html.length < 2000) return `only ${html.length} characters`;
    if (!report.methodology) return "no methodology";
    return true;
  });
}

check("share-of-gap column sums to exactly 100%", () => {
  const shares = buildExceptionReport(s1).sections
    .find((x) => x.title === "Root causes").table.rows.map((r) => parseInt(r[2], 10));
  const total = shares.reduce((a, b) => a + b, 0);
  return total === 100 || `sums to ${total}%`;
});

// ── 8. Determinism ──────────────────────────────────────────────────────────
section("Determinism — the rehearsal must match the meeting");

check("two builds produce identical output", () => {
  const a = JSON.stringify(buildRevenueMiss().bridge) + JSON.stringify(buildExpansion().qualified);
  const b = JSON.stringify(buildRevenueMiss().bridge) + JSON.stringify(buildExpansion().qualified);
  return a === b || "output changed between builds";
});

// ── 9. Serverless imports ───────────────────────────────────────────────────
section("Serverless — the API functions can reach the finance model");

// A failed import throws here and fails the run, which is the check.
const { groundedPack, fallbackNarrative } = await import("../api/ai/_groundedPack.js");
check("api/ai reaches src/lib without a bundler", () => true);
check("grounded board pack computes metrics and leaves narrative to the model", () => {
  const pack = groundedPack({ id: "meridian", name: "Meridian SaaS", rag: "AMBER" });
  if (pack.executiveSummary !== null || pack.outlook !== null) return "narrative fields are not null";
  if (!pack.keyMetrics?.length) return "no metrics";
  if (pack.keyMetrics.some((m) => !m.value || !m.rag)) return "a metric is incomplete";
  const filled = fallbackNarrative(pack, { name: "Meridian SaaS" });
  if (!filled.executiveSummary) return "fallback wrote no summary";
  return true;
});

// ── Result ──────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(72)}`);
if (failures === 0) {
  console.log(`\x1b[32m${checks} checks passed.\x1b[0m`);
} else {
  console.log(`\x1b[31m${failures} of ${checks} checks FAILED.\x1b[0m`);
}
console.log(`
Not covered here — these still need a person:
  · Layout and interaction         npm run dev, then walk the 8-minute demo
  · The serverless functions        npx vercel dev, then generate a board pack
  · The live xAI path               only the no-key fallback is exercised above
  · Company names                   check none is a real business in Singapore or the UAE
`);

process.exit(failures === 0 ? 0 : 1);
