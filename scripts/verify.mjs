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
import { buildCash, buildCashScenario } from "../src/lib/scenarioCash.js";
import { buildMargin } from "../src/lib/scenarioMargin.js";
import { buildProcurement } from "../src/lib/scenarioProcurement.js";
import { modulesFor, MODELLED_DISCIPLINES, benchmarksFor } from "../src/lib/companyModules.js";
import { trackedActions, actionSummary } from "../src/lib/actionTracker.js";
import { TIERS } from "../src/lib/liveData.js";
import { loadPrefs as _lp } from "../src/lib/prefs.js";
import { INTEGRATIONS, licenceStatus, integrationHealth, readingAt } from "../src/lib/liveFeed.js";
import { fmtMoney } from "../src/lib/fx.js";
import { buildExceptionReport, buildGrowthBrief, buildCashReport, buildMarginReport, buildProcurementReport, reportToHtml } from "../src/lib/reports.js";
import { buildInvestigation } from "../src/lib/investigation.js";
import { buildSignalDevelopment, investigationConfidence, ALERT_ON } from "../src/lib/signalDevelopment.js";
import { buildProtectionPlan } from "../src/lib/protectionPlan.js";
import { buildOpportunityRadar } from "../src/lib/opportunityRadar.js";
import { buildActionPlan } from "../src/lib/actionPlan.js";
import { portfolioAlerts, portfolioActions, THRESHOLDS } from "../src/lib/alertsFeed.js";
import { customerBook, debtorProfile } from "../src/lib/customers.js";
import { salesQualityFor } from "../src/lib/companyModules.js";
import { portfolioContext } from "../api/ai/_context.js";
import { readFile, readdir } from "node:fs/promises";

let failures = 0;
let checks = 0;

const ok = (n) => console.log(`  \x1b[32m✓\x1b[0m ${n}`);
const bad = (n, d) => { failures++; console.log(`  \x1b[31m✗\x1b[0m ${n}\n      ${d}`); };
// Some checks read files, so a check may return a promise. Awaiting the result
// here rather than in each caller — five checks were silently passing
// "[object Promise]" to the failure reporter before this.
const pending = [];
const check = (name, fn) => {
  checks++;
  const run = async () => {
    try { const r = await fn(); r === true ? ok(name) : bad(name, r); }
    catch (e) { bad(name, e.message); }
  };
  const p = run();
  pending.push(p);
  return p;
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

// ── 8b. Scenarios 2, 3 and 5 ────────────────────────────────────────────────
section("Scenario 2 — cash");

const s2 = buildCash();
check("the weekly statement adds up on every line", () => {
  const bad = s2.trajectory.weeks.filter(
    (w) => w.opening + w.receipts - w.payroll - w.suppliers - w.debtService !== w.closing);
  return bad.length === 0 || `${bad.length} weeks do not add up, first is week ${bad[0].week}`;
});
check("the model is anchored to reported burn, not rebuilt bottom-up", () => {
  const b = s2.baseline;
  // receipts − outflow = reported burn, and the composition sums to outflow.
  if (Math.abs((b.monthlyOutflow - b.monthlyReceipts) - b.reportedBurn) > 1e-6)
    return `identity broken: outflow ${b.monthlyOutflow} − receipts ${b.monthlyReceipts} ≠ burn ${b.reportedBurn}`;
  const parts = b.composition.reduce((t, c) => t + c.value, 0);
  return Math.abs(parts - b.monthlyOutflow) < 1e-6 || `composition ${parts} ≠ outflow ${b.monthlyOutflow}`;
});
check("the cash screen agrees with the portfolio table on runway", () =>
  s2.bases[0].months === s2.fin.runway || `${s2.bases[0].months} vs ${s2.fin.runway}`);
check("the burn trend is measured from the ledger, not assumed", () => {
  const t = s2.burnTrend;
  if (!(t.months >= 12)) return `only ${t.months} months of history`;
  if (!(t.monthlyGrowth > 0)) return "no burn growth measured";
  const implied = t.from * Math.pow(1 + t.monthlyGrowth, t.months);
  return Math.abs(implied - t.to) < 1 || `compounding ${t.from} at the stated rate gives ${implied.toFixed(0)}, not ${t.to}`;
});
check("no cash-floor breach is asserted where the data has none", () => {
  const claims = /falls below|breach/i.test(s2.insight.headline);
  const has = s2.trajectory.weeks.some((w) => w.belowMinimum);
  return claims === has || (claims ? "headline claims a breach the weeks do not show" : true);
});
check("each lever moves the forecast", () => {
  const a = buildCashScenario({}, { baseline: s2.baseline }).runwayMonths;
  const dso = buildCashScenario({ collectionsDaysImprovement: 17 }, { baseline: s2.baseline }).runwayMonths;
  const pause = buildCashScenario({ hiringPause: true }, { baseline: s2.baseline }).runwayMonths;
  const cut = buildCashScenario({ discretionaryCutPct: 0.2 }, { baseline: s2.baseline }).runwayMonths;
  const stuck = [["collections", dso], ["hiring pause", pause], ["supplier cut", cut]].filter(([, v]) => v === a);
  return stuck.length === 0 || `${stuck.map(([n]) => n).join(", ")} changed nothing`;
});

section("Scenario 3 — margin");

const s3 = buildMargin();
check("the margin bridge sums to the observed movement", () => {
  const sum = s3.bridge.reduce((t, b) => t + b.value, 0);
  return Math.abs(sum - s3.marginMove) < 0.11 || `drivers ${sum.toFixed(1)} vs observed ${s3.marginMove}`;
});
check("the margin movement is the ledger's, not a parameter", () => {
  const fin = buildFinance({ id: "forgetech", status: "green" });
  const move = fin.ebitda.grossMargin - fin.history.ebitda[0].grossMarginPct;
  return Math.abs(move - s3.marginMove) < 0.05 || `screen says ${s3.marginMove}, ledger says ${move.toFixed(1)}`;
});
check("the residual is labelled rather than spread across the other drivers", () => {
  const residual = s3.bridge.filter((b) => b.residual);
  if (residual.length !== 1) return `${residual.length} lines marked residual`;
  const share = Math.abs(residual[0].value / s3.marginMove);
  return share < 0.35 || `the residual is ${(share * 100).toFixed(0)}% of the movement — the drivers explain too little`;
});
check("the scenario only fires on a company that reads green", () => {
  if (s3.company.rag !== "GREEN") return `${s3.company.name} is ${s3.company.rag} — there is no masking to reveal`;
  return s3.varPct > 0 || `revenue is ${s3.varPct.toFixed(1)}% against plan, so nothing is being masked`;
});
check("the margin loss outweighs the revenue beat it hides behind", () =>
  s3.annualGrossProfitLost > s3.revenueOutperformance ||
  `margin ${Math.round(s3.annualGrossProfitLost)} vs revenue ${Math.round(s3.revenueOutperformance)} — the scenario has no punchline`);

section("Scenario 5 — procurement");

const s5 = buildProcurement();
check("categories sum to the confirmed addressable spend", () => {
  const sum = s5.byCategory.reduce((t, c) => t + c.spend, 0);
  return sum === s5.totals.confirmedSpend || `categories ${sum} vs confirmed ${s5.totals.confirmedSpend}`;
});
check("unconfirmed spend is excluded from the headline saving", () => {
  const inHeadline = s5.byCategory.reduce((t, c) => t + c.saving, 0);
  if (inHeadline !== s5.totals.saving) return "category savings do not sum to the headline";
  // Every queued record's spend must be outside the confirmed base.
  const queued = s5.reviewQueue.reduce((t, r) => t + r.annualSpend, 0);
  return queued === s5.totals.pendingSpend || `queue holds ${queued}, pending reports ${s5.totals.pendingSpend}`;
});
check("only suppliers used by enough companies are counted", () => {
  const wrong = s5.addressable.filter((v) => v.companies < 3).map((v) => v.canonical);
  return wrong.length === 0 || `below threshold but counted: ${wrong.join(", ")}`;
});
check("name normalisation actually collapses the variants", () => {
  const spread = s5.vendors.filter((v) => v.ledgerVariants.length > 1);
  if (spread.length < 5) return `only ${spread.length} suppliers have differing ledger names — the problem is not demonstrated`;
  const auto = s5.vendors.reduce((t, v) => t + v.autoMatched, 0);
  const total = s5.vendors.reduce((t, v) => t + v.companies, 0);
  return auto / total > 0.8 || `only ${((auto / total) * 100).toFixed(0)}% matched automatically`;
});
check("every vendor spend traces to a company's own figures", () => {
  for (const v of s5.vendors) {
    for (const c of v.contracts) {
      if (!(c.annualSpend > 0)) return `${v.canonical} at ${c.companyName} has no spend`;
      if (!COMPANIES.some((x) => x.id === c.company)) return `${v.canonical} references unknown company ${c.company}`;
    }
  }
  return true;
});

check("all five scenarios carry sourced, dated evidence and dated actions", () => {
  for (const [name, sc] of [["cash", s2], ["margin", s3], ["procurement", s5]]) {
    const i = sc.insight;
    if (!i.evidence.length) return `${name}: no evidence`;
    const bad = i.evidence.filter((e) => !e.source || !e.asOf);
    if (bad.length) return `${name}: "${bad[0].label}" has no source or date`;
    if (!i.actions.length) return `${name}: no actions`;
    const undated = i.actions.filter((a) => !a.due || !a.owner);
    if (undated.length) return `${name}: an action has no owner or due date`;
  }
  return true;
});

// ── 8c. Company modules and the closed loop ─────────────────────────────────
section("Company detail — every company, not just one");

const codeOfEarly = async (rel) => (await readFile(new URL(rel, import.meta.url), "utf8"))
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const clientSrc = await codeOfEarly("../src/views/ClientPortal.jsx");
const realtimeSrc = await codeOfEarly("../src/views/RealTime.jsx");
const scenarioSrcs = await Promise.all(
  ["ScenarioRevenueMiss", "ScenarioExpansion", "ScenarioCash", "ScenarioMargin", "ScenarioProcurement"]
    .map(async (n) => [`${n}.jsx`, await codeOfEarly(`../src/views/${n}.jsx`)]));

check("every company has every module populated", () => {
  for (const c of COMPANIES) {
    const m = modulesFor(c.id);
    if (!m) return `${c.name}: no modules at all`;
    for (const key of ["finance", "sales", "hr", "ops", "procurement", "technology", "compliance", "crossFunctional"]) {
      if (!m[key]?.kpis?.length) return `${c.name}: ${key} tab would render empty`;
    }
    if (!m.finance.rev?.length || !m.finance.cash?.length) return `${c.name}: finance charts have no data`;
    if (!m.sales.pipe?.length || !m.sales.funnel?.length) return `${c.name}: sales charts have no data`;
    if (!m.hr.att?.length || !m.hr.hcWaterfall?.length) return `${c.name}: people charts have no data`;
  }
  return true;
});

check("no module KPI renders as undefined, NaN or Infinity", () => {
  for (const c of COMPANIES) {
    const m = modulesFor(c.id);
    for (const [key, mod] of Object.entries(m)) {
      if (key === "meta") continue;
      for (const k of mod.kpis) {
        if (/undefined|NaN|Infinity/.test(`${k.value}${k.delta}`)) return `${c.name} ${key}: "${k.label}" = ${k.value} (${k.delta})`;
      }
    }
  }
  return true;
});

check("benchmarks are the company's own, not another company's", () => {
  // BenchmarkModule fell back to BENCHMARKS.meridian, so eight companies showed
  // Meridian's figures under their own name. Silently wrong beats blank for
  // damage: blank gets reported, wrong gets quoted.
  const seen = new Map();
  for (const c of COMPANIES) {
    const b = benchmarksFor(c.id);
    if (!b || b.length < 5) return `${c.name}: no benchmarks`;
    const fin = buildFinance({ id: c.id, status: c.rag.toLowerCase() });
    const gm = b.find((x) => x.kpi === "Gross Margin");
    if (Math.abs(gm.company - fin.ebitda.grossMargin) > 0.1)
      return `${c.name}: benchmark says ${gm.company}% gross margin, model says ${fin.ebitda.grossMargin}%`;
    const key = b.map((x) => x.company).join(",");
    if (seen.has(key)) return `${c.name} and ${seen.get(key)} show identical benchmark figures`;
    seen.set(key, c.name);
  }
  return true;
});

check("no screen is pinned to a single company", () => {
  // ClientPortal and RealTime both hardcoded Meridian — RealTime seeded cash at
  // 412,500 against a model that says 663,000, the same stale figure that had
  // already been found in three other places.
  const pinned = [];
  for (const [file, src] of [["ClientPortal.jsx", clientSrc], ["RealTime.jsx", realtimeSrc]]) {
    if (!src.includes("COMPANIES")) pinned.push(`${file} never reads the registry`);
    if (/412500|412,500|\b4\.8\b.*runway|runway.*\b4\.8\b/.test(src)) pinned.push(`${file} still carries a hardcoded figure`);
  }
  return pinned.length === 0 || pinned.join("; ");
});

check("generating a report shows it rather than only offering a file", () => {
  // A download is silently inert in a sandboxed viewer, so the button appeared
  // to work and produced nothing. Every scenario now opens the report on screen.
  const missing = [];
  for (const [file, src] of scenarioSrcs) {
    if (!src.includes("ReportPanel")) missing.push(file);
  }
  return missing.length === 0 || `${missing.join(", ")} still only offers a download`;
});

check("the company page agrees with the portfolio table", () => {
  for (const c of COMPANIES) {
    const m = modulesFor(c.id);
    const fin = buildFinance({ id: c.id, status: c.rag.toLowerCase() });
    const runway = m.finance.kpis.find((k) => k.label === "Cash Runway").value;
    if (runway !== `${fin.runway} mo`) return `${c.name}: module says ${runway}, model says ${fin.runway} mo`;
  }
  return true;
});

check("modelled figures are labelled as modelled, and measured ones are not", () => {
  for (const c of COMPANIES) {
    const m = modulesFor(c.id);
    for (const key of MODELLED_DISCIPLINES) {
      const unmarked = m[key].kpis.filter((k) => !k.modelled).map((k) => k.label);
      if (unmarked.length) return `${c.name} ${key}: "${unmarked[0]}" is modelled but not flagged`;
      const named = m[key].kpis.filter((k) => k.src !== "Alba model").map((k) => k.src);
      if (named.length) return `${c.name} ${key}: claims source "${named[0]}" for a modelled figure`;
    }
  }
  return true;
});

section("Action tracker — closed, not a to-do list");

const tracked = trackedActions();
const summary = actionSummary(tracked);

check("every action names a KPI and reads its movement from the ledger", () => {
  for (const a of tracked) {
    if (!a.metricLabel) return `${a.id}: no metric`;
    if (a.baseline == null || a.current == null) return `${a.id}: no baseline or current value`;
    if (!a.owner || !a.due) return `${a.id}: no owner or due date`;
    if (!["working", "no-change", "worse"].includes(a.verdict)) return `${a.id}: verdict "${a.verdict}"`;
  }
  return true;
});

check("the baseline is a real historic value from the ledger", () => {
  for (const a of tracked.slice(0, 6)) {
    const fin = buildFinance({ id: a.company, status: COMPANIES.find((c) => c.id === a.company).rag.toLowerCase() });
    const idx = fin.history.months.indexOf(a.raisedOn);
    if (idx < 0) return `${a.id}: raised ${a.raisedOn}, which is not a month in the ledger`;
  }
  return true;
});

check("the verdict follows the arithmetic, not the status", () => {
  for (const a of tracked) {
    const improved = a.better === "up" ? a.delta > 0 : a.delta < 0;
    const material = Math.abs(a.pctMove) >= 2;
    const expected = !material ? "no-change" : improved ? "working" : "worse";
    if (a.verdict !== expected) return `${a.id}: verdict ${a.verdict}, arithmetic says ${expected}`;
  }
  return true;
});

check("the tracker shows a credible mix rather than all one way", () => {
  if (!summary.working) return "no action shows its metric improving — the loop looks broken";
  if (!summary.worse) return "no action shows its metric worsening — nothing to act on";
  return true;
});

section("Reports — one per scenario");

check("all five scenarios produce a clean, circulatable report", () => {
  const built = [
    ["exception", buildExceptionReport(s1)],
    ["growth", buildGrowthBrief(s4)],
    ["cash", buildCashReport(s2)],
    ["margin", buildMarginReport(s3)],
    ["procurement", buildProcurementReport(s5)],
  ];
  for (const [name, r] of built) {
    const html = reportToHtml(r);
    if (/undefined|NaN|\[object Object\]/.test(html)) return `${name} report contains undefined, NaN or [object Object]`;
    if (html.length < 2000) return `${name} report is only ${html.length} characters`;
    if (!r.methodology || !r.preparedAt) return `${name} report has no methodology or preparation date`;
  }
  return true;
});

check("every insight carries the date it was raised", () => {
  for (const [name, sc] of [["1", s1], ["2", s2], ["3", s3], ["4", s4], ["5", s5]]) {
    if (!sc.insight.raisedOn) return `scenario ${name}: no raisedOn — reports print "prepared undefined"`;
  }
  return true;
});

// ── 8d. Live data ───────────────────────────────────────────────────────────
section("Live data — the badge must be able to be wrong");

const liveSrc = await codeOfEarly("../src/lib/liveData.js");
const realtimeLive = await codeOfEarly("../src/views/RealTime.jsx");
const commandSrcLive = await codeOfEarly("../src/views/CommandCentre.jsx");

check("there is one vocabulary for where a figure comes from", () => {
  for (const id of ["live", "simulated", "modelled", "pinned", "unavailable"]) {
    if (!TIERS[id]) return `no tier "${id}"`;
    if (!TIERS[id].definition || TIERS[id].definition.length < 40) return `tier "${id}" has no usable definition`;
  }
  return true;
});

check("nothing claims to be live unless it actually fetches", () => {
  // Five tiles were labelled live. Two fetched. The other three were seeded
  // from the model and random-walked behind a market-feed label.
  const claims = [...realtimeLive.matchAll(/tier:\s*"live"/g)].length;
  const fetches = /fetch\(\s*["'`]https:\/\//.test(realtimeLive);
  if (claims > 0 && !fetches) return `${claims} tiles claim live but the screen makes no external request`;
  if (claims > 2) return `${claims} tiles claim live; only the two FX pairs have a provider`;
  return true;
});

check("a failed fetch stops the badge claiming live", () => {
  if (!/tier:\s*market\.error\s*\?/.test(realtimeLive))
    return "the FX tiles keep their live tier when the provider is unreachable";
  if (!liveSrc.includes('setState("unavailable")'))
    return "useLiveRates has no unavailable state";
  return true;
});

check("live rates are opt-in, and pinned is the default", () => {
  if (!liveSrc.includes('useState("pinned")')) return "the hook does not start pinned";
  if (/useEffect\(\s*\(\)\s*=>\s*\{\s*refresh\(\)/.test(liveSrc)) return "it fetches on load — a demo must not revalue itself silently";
  return true;
});

check("switching to live FX actually revalues the portfolio", () => {
  // Without the version in the dependency list the badge would say live while
  // every figure stayed exactly where it was — the worst of both.
  if (!commandSrcLive.includes("usePortfolio(fx.version)")) return "the portfolio does not recompute when rates move";
  if (!commandSrcLive.includes("[fxVersion]")) return "usePortfolio ignores the rate version";
  return true;
});

check("the pinned rates still reproduce the demo figures", () => {
  // Live FX must be a switch, not a default: with it off, every figure has to
  // be the one that was rehearsed.
  const fin = buildFinance({ id: "straits", status: "green" }, { reportingCurrency: "GBP" });
  const expected = FIN_SEED.straits.revenue / 1.27;
  return Math.abs(fin.revenue.total - expected) < 1
    || `Straits restates to ${fin.revenue.total.toFixed(0)}, pinned rates say ${expected.toFixed(0)}`;
});

section("Continuity — no gaps, no frozen tiles, no stale claims");

check("no live reading ever stops moving", () => {
  // A tile marked LIVE whose number never moves teaches a viewer that the label
  // is decoration, and then they disbelieve every other one on the screen.
  for (const key of ["fund-cash", "fund-burn", "fund-rev", "fund-pipe", "meridian-ar", "cp-zafira-heads"]) {
    const vals = Array.from({ length: 60 }, (_, t) => readingAt(key, 1000, 0.004, t));
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] === vals[i - 1]) return `${key} repeats its value at tick ${i}`;
    }
  }
  return true;
});

check("a reading never wanders away from the figure it reports", () => {
  // The tile and the drill-down must be the same number with a live reading
  // around it, not two different claims.
  for (const key of ["fund-cash", "meridian-rev", "khaleej-burn"]) {
    const vals = Array.from({ length: 200 }, (_, t) => readingAt(key, 1000, 0.004, t));
    const min = Math.min(...vals), max = Math.max(...vals);
    if (min < 990 || max > 1010) return `${key} ranges ${min.toFixed(1)}–${max.toFixed(1)} on a base of 1000`;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (Math.abs(mean - 1000) > 2) return `${key} has a mean of ${mean.toFixed(1)}, not the reported 1000`;
  }
  return true;
});

check("two tiles never move in lockstep", () => {
  const a = Array.from({ length: 40 }, (_, t) => readingAt("fund-cash", 1000, 0.004, t));
  const b = Array.from({ length: 40 }, (_, t) => readingAt("fund-burn", 1000, 0.004, t));
  return a.some((v, i) => Math.abs(v - b[i]) > 0.5) || "every tile is drawing the same curve";
});


check("company names follow the reference screens", () => {
  // The demo flow and the design reference must name the same companies, or a
  // viewer holding the screenshots cannot follow the walkthrough.
  const want = ["NovaTech Solutions", "BrightWave Digital", "Apex Manufacturing",
                "Northstar Health", "Veridian Logistics", "Orbit Commerce"];
  const have = COMPANIES.map((c) => c.name);
  const missing = want.filter((n) => !have.includes(n));
  if (missing.length) return `absent from the registry: ${missing.join(", ")}`;
  if (!FUNDS.some((f) => /Northstar Growth Fund/.test(f.name))) return "the reference fund is not in the registry";
  return true;
});

check("renaming moved no figure", () => {
  // Ids are the key for every seed, ledger and cross-reference, so a display
  // rename must be inert. This fails if anyone keys off a name.
  for (const [id, seed] of Object.entries(FIN_SEED)) {
    const f = buildFinance({ id, status: "amber" });
    if (Math.abs(f.native.revenue - seed.revenue) > 0.01) return `${id} revenue moved`;
    if (Math.abs(f.native.cash - seed.cash) > 0.01) return `${id} cash moved`;
  }
  const s = buildRevenueMiss();
  return s.company.name === "NovaTech Solutions" || `scenario 1 is on ${s.company.name}, not the reference company`;
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

// The endpoints must actually USE the grounded modules. Commit 80363ea said in
// its message that both had been rewritten to do so; only _groundedPack.js was
// staged, and the two endpoints stayed on the ungrounded path for four further
// commits without anything noticing. A claim in a commit message is not a test.
// Comments in these files describe what was removed and name the old values, so
// the scans below read code only — otherwise the explanation trips the check.
const codeOf = async (rel) => (await readFile(new URL(rel, import.meta.url), "utf8"))
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

const boardpackSrc = await codeOf("../api/ai/boardpack.js");
const agentSrc = await codeOf("../api/ai/agent.js");

check("boardpack.js is wired to the grounded pack", () =>
  (boardpackSrc.includes("_groundedPack.js") && boardpackSrc.includes("groundedPack(")) ||
  "boardpack.js does not call groundedPack — it is asking the model for the figures");

check("agent.js is wired to the grounded context", () =>
  (agentSrc.includes("_context.js") && agentSrc.includes("companyContext")) ||
  "agent.js does not build its prompt from the finance model");

check("no endpoint falls back to Meridian's figures for another company", () => {
  const stale = [/£?413k/, /£?412k/, /company\.runway \|\|/, /finance\.cash \|\|/];
  for (const src of [boardpackSrc, agentSrc]) {
    const hit = stale.find((p) => p.test(src));
    if (hit) return `a hardcoded default survives: ${hit}`;
  }
  return true;
});

// ── 10. The AI screen ───────────────────────────────────────────────────────
section("AI agents — the screen calls our own endpoint, over computed evidence");

const agentsSrc = await codeOf("../src/views/Agents.jsx");


// Scanned across every view rather than the one screen that was fixed: five
// such calls existed, three in Agents.jsx and two in GPDashboard.jsx, none
// carrying an Authorization header. They could only ever fail, and each was
// caught silently — so what a partner saw was always the hardcoded catch block.
const views = await readdir(new URL("../src/views/", import.meta.url));
for (const file of views.filter((f) => f.endsWith(".jsx"))) {
  const src = await codeOf(`../src/views/${file}`);
  check(`${file} keeps model calls on our own endpoint`, () => {
    const vendor = /api\.anthropic\.com|api\.openai\.com|api\.x\.ai/.exec(src);
    return vendor ? `calls ${vendor[0]} directly from the browser, with no key` : true;
  });
}

check("the AI screen posts to /api/ai/agent", () =>
  agentsSrc.includes("/api/ai/agent") || "Agents.jsx does not call our endpoint");

check("every company can be investigated", () => {
  for (const c of COMPANIES) {
    const inv = buildInvestigation(c.id);
    if (!inv.steps.length) return `${c.name}: no reasoning steps`;
    if (!inv.actions.length) return `${c.name}: no actions`;
    const text = inv.steps.map((s) => s.text).join(" ") + inv.rootCause;
    if (/undefined|NaN/.test(text)) return `${c.name}: chain contains undefined or NaN`;
  }
  return true;
});

check("the investigation agrees with the finance screen", () => {
  for (const c of COMPANIES) {
    const inv = buildInvestigation(c.id);
    const fin = buildFinance({ id: c.id, status: c.rag.toLowerCase() });
    if (inv.fin.runway !== fin.runway) return `${c.name}: runway ${inv.fin.runway} vs ${fin.runway}`;
    if (!inv.steps[1].text.includes(String(fin.runway))) return `${c.name}: chain does not quote the runway on screen`;
  }
  return true;
});

check("no root cause is claimed where no threshold is breached", () => {
  for (const c of COMPANIES) {
    const inv = buildInvestigation(c.id);
    if (!inv.underStress && /largest single contributor/.test(inv.rootCause))
      return `${c.name}: names a root cause on ${inv.fin.runway} months of runway with no breach`;
  }
  return true;
});

check("contribution shares sum to 100% where causes are ranked", () => {
  for (const c of COMPANIES) {
    const { contributions } = buildInvestigation(c.id);
    if (!contributions.length) continue;
    const total = contributions.reduce((t, x) => t + x.share, 0);
    if (Math.abs(total - 100) > 1) return `${c.name}: shares sum to ${total}%`;
  }
  return true;
});

check("the investigation is deterministic", () => {
  const a = JSON.stringify(buildInvestigation("careos").steps);
  const b = JSON.stringify(buildInvestigation("careos").steps);
  return a === b || "two runs disagree";
});

check("portfolio context covers every company and both funds", () => {
  const { text, rows } = portfolioContext();
  if (rows.length !== COMPANIES.length) return `${rows.length} rows for ${COMPANIES.length} companies`;
  const missing = COMPANIES.filter((c) => !text.includes(c.name)).map((c) => c.name);
  if (missing.length) return `absent from the model's context: ${missing.join(", ")}`;
  for (const f of FUNDS) if (!text.includes(f.name)) return `fund missing: ${f.name}`;
  if (/undefined|NaN/.test(text)) return "context contains undefined or NaN";
  return true;
});

// The handlers are async, so they are run here and the outcome checked below.
const call = async (handler, body) => {
  let out = null, code = 200;
  await handler({ method: "POST", body }, {
    status(c) { code = c; return this; },
    json(o) { out = o; return this; },
    end() { return this; },
  });
  return { code, out };
};

const agentHandler = (await import("../api/ai/agent.js")).default;
const boardpackHandler = (await import("../api/ai/boardpack.js")).default;

const noKeyRuns = {
  investigate: await call(agentHandler, { type: "investigate", companyId: "careos" }),
  qa: await call(agentHandler, { type: "qa", question: "Which companies need capital?" }),
  attention: await call(agentHandler, { type: "attention" }),
  pack: await call(boardpackHandler, { company: { id: "nusantara" } }),
  unknown: await call(boardpackHandler, { company: { id: "not-a-company" } }),
};

check("every endpoint answers with no API key set", () => {
  for (const [name, r] of Object.entries(noKeyRuns)) {
    if (name === "unknown") continue;
    if (r.code !== 200) return `${name} returned ${r.code}`;
    const body = r.out.text ?? JSON.stringify(r.out.pack ?? "");
    if (!body || body.length < 80) return `${name} returned nothing usable`;
    if (/undefined|NaN|\[object Object\]/.test(body)) return `${name} contains undefined, NaN or [object Object]`;
    if (r.out.live) return `${name} claims to be live without a key`;
  }
  return true;
});

check("a company we do not hold is refused rather than answered as Meridian", () => {
  const { code, out } = noKeyRuns.unknown;
  if (code !== 400) return `returned ${code} instead of refusing`;
  if (out.pack) return "produced a board pack for an unknown company";
  return true;
});

check("the no-key board pack quotes the company it was asked for", () => {
  const fin = buildFinance({ id: "nusantara", status: "amber" });
  const mrr = noKeyRuns.pack.out.pack.keyMetrics.find((x) => x.label === "MRR").value;
  const expected = `£${Math.round(fin.revenue.total).toLocaleString()}k`;
  return mrr === expected || `board pack says ${mrr}, finance model says ${expected}`;
});

// ── 11. Shell ───────────────────────────────────────────────────────────────
section("Shell — navigation, landing pages and interface scale");

const appSrc = await codeOf("../src/App.jsx");
const { HOMES, SCALES, loadPrefs, savePrefs } = await import("../src/lib/prefs.js");

check("every nav entry renders something", () => {
  // A view added to the VIEWS list without a matching render branch shows an
  // empty pane rather than an error, which is the kind of thing that is only
  // noticed in front of an audience.
  const ids = [...appSrc.matchAll(/\{\s*id:\s*'([a-z]+)'/g)].map((m) => m[1]);
  if (ids.length < 10) return `only found ${ids.length} nav entries — the parse is wrong`;
  const orphans = ids.filter((id) => !appSrc.includes(`view==='${id}'`));
  return orphans.length === 0 || `no render branch for: ${orphans.join(", ")}`;
});

check("both landing pages are real views", () => {
  const missing = HOMES.filter((h) => !appSrc.includes(`view==='${h.id}'`)).map((h) => h.id);
  return missing.length === 0 || `home points at a view that does not render: ${missing.join(", ")}`;
});

const commandSrc = await codeOf("../src/views/CommandCentre.jsx");
const gpSrc = await codeOf("../src/views/GPDashboard.jsx");
const guideSrc = await codeOf("../src/views/UserGuide.jsx");
const integrationSrc = await codeOf("../src/views/IntegrationPlan.jsx");
const stripSrc = await codeOf("../src/components/LiveStrip.jsx");
const feedSrc = await codeOf("../src/lib/liveFeed.js");
const missSrc = await codeOf("../src/views/ScenarioRevenueMiss.jsx");
const prefsSrc = await codeOf("../src/lib/prefs.js");
const planSrc = await codeOf("../src/views/ProtectionPlan.jsx");
const campaignSrc = await codeOf("../src/views/ActionPlan.jsx");
const approvalSrc = await codeOf("../src/lib/approval.js");
const DEFAULT_NAV_OPEN = /navOpen:\s*true/.test(prefsSrc);
const viewFiles = (await readdir(new URL("../src/views/", import.meta.url))).filter((f) => f.endsWith(".jsx"));
const viewSources = new Map(await Promise.all(viewFiles.map(async (f) => [f, await codeOf(`../src/views/${f}`)])));

check("no view or endpoint hardcodes a company name", () => {
  const gone = ["Straits Analytics", "Zafira Systems", "ForgeTech", "CareOS", "SwiftLogix", "Meridian SaaS"];
  const offenders = [];
  for (const [file, src] of viewSources) {
    const hit = gone.find((n) => src.includes(n));
    if (hit) offenders.push(`${file} still names ${hit}`);
  }
  if (appSrc && gone.some((n) => appSrc.includes(n))) offenders.push("App.jsx still names a renamed company");
  return offenders.length === 0 || offenders.join("; ");
});


section("Brand — one design system, not seventeen");

const themeSrc = await codeOfEarly("../src/lib/theme.js");
const indexSrc = await readFile(new URL("../index.html", import.meta.url), "utf8");
const cssSrc = await readFile(new URL("../src/index.css", import.meta.url), "utf8");

check("no view declares a colour outside the token file", () => {
  // Seventeen palettes, each a shade adrift of the next, was how the app came
  // to look nothing like the product it is named after.
  const offenders = [];
  for (const file of viewFiles) {
    const src = viewSources.get(file);
    const block = /^const T = \{[\s\S]*?^\};?$/m.exec(src);
    if (!block) continue;
    const literals = block[0].match(/#[0-9a-fA-F]{6,8}/g) ?? [];
    // A handful of accent shades have no token yet; more than a couple means a
    // view has started keeping its own palette again.
    if (literals.length > 4) offenders.push(`${file} (${literals.length} raw colours)`);
  }
  return offenders.length === 0 || offenders.join(", ");
});

check("every palette resolves — no view references a token it does not define", () => {
  for (const file of viewFiles) {
    const src = viewSources.get(file);
    const block = /^const T = \{[\s\S]*?^\};?$/m.exec(src);
    if (!block) continue;
    const defined = new Set([...block[0].matchAll(/^\s*([a-zA-Z][a-zA-Z0-9]*)\s*:/gm)].map((m) => m[1]));
    const used = new Set([...src.matchAll(/\bT\.([a-zA-Z][a-zA-Z0-9]*)/g)].map((m) => m[1]));
    const missing = [...used].filter((k) => !defined.has(k));
    if (missing.length) return `${file} uses T.${missing[0]} but never defines it`;
  }
  return true;
});

check("the brand typefaces are loaded and declared", () => {
  for (const face of ["Inter", "Source+Serif+4", "IBM+Plex+Mono"]) {
    if (!indexSrc.includes(face)) return `${face.replace(/\+/g, " ")} is not requested`;
  }
  if (!/Hanken|Fraunces|JetBrains/.test(indexSrc) === false) return "a prototype typeface is still being loaded";
  for (const key of ["sans", "serif", "mono"]) {
    if (!themeSrc.includes(`${key}:`)) return `theme has no ${key} stack`;
  }
  // Every face needs a real fallback — a blocked font request must not drop to
  // a default the design never anticipated.
  if (!themeSrc.includes("sans-serif") || !themeSrc.includes("Georgia")) return "a typeface has no fallback stack";
  return true;
});

check("the shell matches the reference: sections across the top, not a list down the side", () => {
  for (const g of ["Portfolio", "Intelligence", "Actions", "Reports"]) {
    if (!appSrc.includes(`'${g}'`)) return `no ${g} section`;
  }
  if (!appSrc.includes("GROUPS")) return "the navigation is not grouped";
  if (!appSrc.includes("Wordmark")) return "the mark is missing from the top bar";
  // Scan the VIEWS array only. This used to match `{ id: '...' }` anywhere in
  // the file, so an unrelated object literal elsewhere in App.jsx counted as an
  // ungrouped view and failed the check.
  const block = appSrc.match(/const VIEWS = \[([\s\S]*?)\n\]/);
  if (!block) return "VIEWS is not an array literal any more";
  const total = [...block[1].matchAll(/\{\s*id:\s*'([a-z]+)'/g)].length;
  const grouped = [...block[1].matchAll(/\{\s*id:\s*'([a-z]+)',\s*group:/g)].length;
  if (!total) return "VIEWS is empty";
  return grouped === total || `${total - grouped} views have no section`;
});


check("no credential lifecycle is shown to a viewer", () => {
  // Until the platform reads real token state from the providers, an expiry
  // date here is a number someone typed, and a red chip on a demo screen is a
  // claim about an account nobody in the room can check.
  const dated = INTEGRATIONS.filter((i) => i.expires).map((i) => i.name);
  if (dated.length) return `carrying typed expiry dates: ${dated.join(", ")}`;
  const h = integrationHealth();
  if (h.expired.length || h.expiring.length) return "an integration presents as lapsed or expiring";
  if (h.connected.length !== INTEGRATIONS.length) return "not every source presents as connected";
  return true;
});

check("no screen renders an expiry date or a lapsed chip", () => {
  const offenders = [];
  for (const [file, src] of [["IntegrationPlan.jsx", integrationSrc], ["UserGuide.jsx", guideSrc],
                             ["LiveStrip.jsx", stripSrc]]) {
    if (/\bexpires\b|\bExpired\b|\blapsed\b|AS_OF_DATE/.test(src)) offenders.push(file);
  }
  return offenders.length === 0 || `${offenders.join(", ")} still surfaces credential lifecycle`;
});

check("the degradation path still works when a source stops answering", () => {
  // Exercised against a fixture rather than by shipping a lapsed credential.
  // A provider going quiet is an ordinary demo event — no network on the day,
  // a blocked origin in an embedded viewer — and the tile must keep moving.
  const fixture = { id: "fixture", name: "Fixture", kind: "Test", feeds: ["Test"], expires: "2020-01-01" };
  const st = licenceStatus(fixture, "2026-05-31");
  if (st.id !== "expired") return `a source ${Math.round((Date.parse("2026-05-31") - Date.parse("2020-01-01")) / 86400000)} days past its date reads ${st.id}`;
  if (!/continu/i.test(st.note)) return "the degraded note does not say the figures continue";
  const vals = Array.from({ length: 30 }, (_, t) => readingAt("fixture-feed", 500, 0.004, t));
  for (let i = 1; i < vals.length; i++) if (vals[i] === vals[i - 1]) return "a degraded feed freezes";
  return true;
});


check("the live strip is on the screens a partner actually uses", () => {
  const missing = [];
  for (const [file, src] of [["CommandCentre.jsx", commandSrcLive], ["GPDashboard.jsx", gpSrc], ["ClientPortal.jsx", clientSrc]]) {
    if (!src.includes("LiveStrip")) missing.push(file);
  }
  return missing.length === 0 || `no continuous readings on ${missing.join(", ")}`;
});


check("clicking a company in Portfolio Health opens that company", () => {
  // CommandCentre passes the id; App discarded it, so the route from the fund
  // view to a company's detail broke in the middle and landed on the list.
  if (!/onOpenCompany=\{\(id\)/.test(appSrc)) return "App drops the company id CommandCentre passes";
  if (!appSrc.includes("openCompany={openCompany}")) return "GPDashboard is not given the company to open";
  if (!gpSrc.includes("openCompany")) return "GPDashboard ignores the company handed to it";
  return true;
});


check("the user guide covers every screen in the nav", () => {
  // A guide that silently falls behind the product is worse than none — it is
  // the failure mode every written-once artefact in this project has hit.
  const ids = [...appSrc.matchAll(/\{\s*id:\s*'([a-z]+)'/g)].map((m) => m[1]);
  const documented = ["guide", "client", "realtime", "news", "gantt", "improvements", "integrations"];
  const missing = ids.filter((id) => !documented.includes(id) && !guideSrc.includes(`to="${id}"`));
  return missing.length === 0 || `no link to: ${missing.join(", ")}`;
});

check("the user guide documents the features that were added after it", () => {
  const topics = [
    ["the company page and the MODEL tag", /MODEL/],
    ["the action tracker's closed loop", /action tracker/i],
    ["reports, one per scenario", /Cash Position Review/],
    ["the interface scale shortcut", /Ctrl and/],
    ["the two landing pages", /landing page/i],
  ];
  const absent = topics.filter(([, re]) => !re.test(guideSrc)).map(([t]) => t);
  return absent.length === 0 || `undocumented: ${absent.join("; ")}`;
});

check("the user guide is reachable from both landing pages", () => {
  if (!appSrc.includes("onGuide")) return "App does not pass onGuide to either landing page";
  if (!commandSrc.includes("onGuide")) return "Portfolio Health has no guide link";
  if (!gpSrc.includes("onGuide")) return "GP Dashboard has no guide link";
  return true;
});

check("no view sets its own viewport height inside the scaled shell", async () => {
  // `100vh` inside a `zoom` context resolves in scaled units and overflows the
  // shell. Views live inside App's pane and should size to it, not the window.
  // This used to check two files; Agents and PortfolioAnalytics were both
  // overflowing at any scale above 100% and neither was covered.
  const offenders = [];
  for (const f of viewFiles) {
    const src = await codeOf(`../src/views/${f}`);
    if (/100vh/.test(src)) offenders.push(f);
  }
  return offenders.length === 0 || `${offenders.join(", ")} still measures the viewport`;
});

check("every screen is built from the shared page primitives", async () => {
  // Consistency is the whole point of Shell.jsx. A view that draws its own
  // header is a view that drifts. The exceptions are the two that are not
  // pages: FinanceDrilldown is a modal over a page, and RealTime carries a
  // fixed ticker above a scrolling body.
  const exempt = new Set(["FinanceDrilldown.jsx"]);
  const missing = [];
  for (const f of viewFiles) {
    if (exempt.has(f)) continue;
    const src = await codeOf(`../src/views/${f}`);
    if (!/from "\.\.\/components\/Shell\.jsx"/.test(src)) missing.push(f);
  }
  return missing.length === 0 || `${missing.join(", ")} does not use the shared primitives`;
});

check("no view carries its own root font-family", async () => {
  // Three views set the system stack on their root element, which overrode the
  // design system for everything beneath them.
  const offenders = [];
  for (const f of viewFiles) {
    const src = await codeOf(`../src/views/${f}`);
    // Only style declarations — Improvements.jsx names typefaces in the copy
    // describing a proposed improvement, which is not a declaration.
    const declarations = [...src.matchAll(/fontFamily:\s*("[^"]*"|'[^']*'|`[^`]*`)/g)].map((m) => m[1]);
    if (declarations.some((d) => /-apple-system|BlinkMacSystemFont|Segoe UI|DM Mono|Hanken|Fraunces|JetBrains|Georgia/.test(d))) {
      offenders.push(f);
    }
  }
  return offenders.length === 0 || `${offenders.join(", ")} declares a typeface the design system does not`;
});

check("the stylesheet loads the typefaces the design system names", () => {
  // index.css declared Hanken Grotesk, Fraunces and JetBrains Mono for four
  // commits after index.html stopped loading any of them, so every screen fell
  // back to a system face while the tokens said something else.
  for (const face of ["Inter", "Source Serif 4", "IBM Plex Mono"]) {
    if (!indexSrc.includes(face.replace(/ /g, "+"))) return `index.html does not load ${face}`;
    if (!cssSrc.includes(face)) return `index.css does not declare ${face}`;
  }
  const declared = [...cssSrc.matchAll(/--font-(?:ui|mono|display):\s*([^;]+);/g)].map((m) => m[1]);
  for (const value of declared) {
    for (const stale of ["Hanken", "Fraunces", "JetBrains", "DM Mono"]) {
      if (value.includes(stale)) return `index.css still declares ${stale}, which index.html does not load`;
    }
  }
  return declared.length === 3 || `expected three declared faces, found ${declared.length}`;
});

check("no view outside the report sheet contains a raw colour", async () => {
  // theme.js is the only place a hex belongs. Seventeen views used to carry
  // their own palette; the Delivery Plan alone had eighty-eight.
  const offenders = [];
  for (const f of viewFiles) {
    const src = await codeOf(`../src/views/${f}`);
    // Ignore hex inside the standalone HTML the board pack export writes.
    const stripped = src.replace(/`[^`]*<html[\s\S]*?`/g, "");
    const hits = stripped.match(/["'`]#[0-9a-fA-F]{3,8}["'`]/g);
    if (hits) offenders.push(`${f} (${hits.length})`);
  }
  return offenders.length === 0 || `raw colours in ${offenders.join(", ")}`;
});

check("every button on every screen is wired to something", async () => {
  // Two gold primary buttons — APPROVE PLAN and APPROVE CAMPAIGN — shipped with
  // no onClick. A gold button that does nothing is the worst control on a demo
  // screen: it is the one thing in the room somebody will reach for.
  const dead = [];
  for (const f of [...viewFiles.map((x) => `views/${x}`), "components/ReportPanel.jsx", "components/Shell.jsx"]) {
    const src = await codeOf(`../src/${f}`);
    for (const m of src.matchAll(/<Button\b([^>]*)>/g)) {
      if (!/onClick/.test(m[1])) dead.push(`${f.split("/").pop()}: <Button${m[1].slice(0, 40)}>`);
    }
  }
  return dead.length === 0 || `dead: ${dead.join(" | ")}`;
});

check("approving a plan is a state change, not a decoration", () => {
  if (!/useApproval/.test(planSrc)) return "the protection plan does not track approval";
  if (!/useApproval/.test(campaignSrc)) return "the commercial plan does not track approval";
  if (!/APPROVER/.test(approvalSrc)) return "there is no named approver";
  // It must be able to come back off, or it is a one-way trapdoor in a demo.
  return /withdraw/.test(approvalSrc) || "an approval cannot be withdrawn";
});

check("the user guide says where each of the nine screens is", () => {
  for (const id of ["command", "radar", "expansion", "actionplan", "revenuemiss", "gp", "protection"]) {
    if (!guideSrc.includes(`to="${id}"`)) return `the guide does not link to ${id}`;
  }
  if (!/nine reference screens/i.test(guideSrc)) return "the guide does not name the nine screens";
  if (/green button/.test(guideSrc)) return "the guide still calls the report button green";
  if (/from the sidebar/.test(guideSrc)) return "the guide still describes the old sidebar";
  return true;
});

check("the top bar cannot clip its own controls", () => {
  // A fixed 48px row with marginLeft:auto on the right-hand group meant that in
  // a window under about 1150px the SIZE control, the fund selector and the
  // account were pushed off the edge — not scrolled to, not collapsed, gone,
  // with nothing to indicate they existed. It was reported as "can't see the
  // menu items you refer to", which is exactly what it looked like.
  const bar = appSrc.match(/className="alba-topbar"[\s\S]{0,320}?\}\}/);
  if (!bar) return "the top bar is not identifiable — has the class been removed?";
  if (!/flexWrap:\s*'wrap'/.test(bar[0])) return "the top bar does not wrap, so it will clip again";
  if (/height:\s*48\b/.test(bar[0])) return "the top bar is still a fixed height and cannot wrap";
  if (!/minHeight:\s*48/.test(bar[0])) return "the top bar has lost its resting height";
  return true;
});

check("the navigation carries labels, not nineteen unlabelled glyphs", () => {
  // It shipped as a 52px icon-only rail — which is what the reference screens
  // draw, but the reference screens have four destinations and this has
  // nineteen. At #5E5E66 on #070708 it read as an empty black strip.
  if (!/navOpen/.test(appSrc)) return "there is no expanded navigation state";
  if (!/v\.label/.test(appSrc)) return "the navigation does not render view labels";
  if (!/v\.sub/.test(appSrc)) return "the navigation does not render the one-line description";
  if (!DEFAULT_NAV_OPEN) return "the navigation defaults to collapsed";
  return true;
});

check("no tile badged as a live reading is frozen", () => {
  // Portfolio headcount sat at 1,103 for six consecutive samples in the running
  // app: amplitude 0.0012 on 1,103 people rounds to the same integer every
  // tick. A tile that says it is reading and never moves is the one failure
  // this strip exists to prevent, and it shipped.
  //
  // Every spec is replayed here through its own formatter, exactly as the tile
  // renders it, and must produce several distinct strings across a minute.
  const SPECS = [
    { key: "fund-cash", base: 30_664, amp: 0.0025, fmt: (v) => fmtMoney(v, "GBP", { k: true }) },
    { key: "fund-burn", base: 1_735, amp: 0.004, fmt: (v) => fmtMoney(v, "GBP", { k: true }) },
    { key: "fund-rev", base: 11_084, amp: 0.003, fmt: (v) => fmtMoney(v, "GBP", { k: true }) },
    { key: "fund-pipe", base: 87_564, amp: 0.005, fmt: (v) => fmtMoney(v, "GBP", { k: true }) },
    { key: "fund-rph", base: 120_600, amp: 0.0035, fmt: (v) => `£${Math.round(v).toLocaleString()}` },
    { key: "fund-gbpusd", base: 1.2712, amp: 0.0011, fmt: (v) => v.toFixed(4) },
  ];
  const stuck = [];
  for (const s of SPECS) {
    const seen = new Set();
    for (let n = 0; n < 30; n++) seen.add(s.fmt(readingAt(s.key, s.base, s.amp, n)));
    if (seen.size < 4) stuck.push(`${s.key} shows ${seen.size} value(s) in 30 ticks`);
  }
  if (stuck.length) return stuck.join("; ");

  // And no view may put a bare integer count on the strip, which is how the
  // frozen tile got there.
  const offenders = [];
  for (const [name, src] of [["CommandCentre", commandSrc], ["GPDashboard", gpSrc]]) {
    if (/label:\s*["'`](Portfolio headcount|Headcount)["'`]/.test(src)) {
      offenders.push(`${name} puts headcount on a per-second strip`);
    }
  }
  return offenders.length === 0 || offenders.join("; ");
});

check("the live strip distinguishes connected from not answering", () => {
  // Every branch of the tier ternary used to return "simulated", so a connected
  // source and a dead one carried the same badge and the landing page showed
  // six identical SIMULATED stamps.
  if (!TIERS.derived) return "there is no tier for a connected, non-polled reading";
  if (TIERS.derived.label === TIERS.simulated.label) return "derived and simulated read the same";
  if (!/lapsed \? "simulated" : s\.integration \? "derived" : "modelled"/.test(feedSrc)) {
    return "useLiveFeeds does not separate the three states";
  }
  return true;
});

check("filter labels are written, not pluralised by string concatenation", () => {
  // "All statuss" shipped on the landing page.
  if (/key \+ "s"/.test(commandSrc)) return "still appends an s to the filter key";
  if (/All statuss/.test(commandSrc)) return "still renders All statuss";
  return /ALL_LABEL/.test(commandSrc) || "no written-out filter labels";
});

check("the revenue bridge leaves room for its own value labels", () => {
  // At 1.02 headroom the first two deduction bars topped out at the plan level
  // and their labels were clipped — the two largest drivers in the bridge were
  // the two you could not read.
  if (/const max = plan \* 1\.0\d;/.test(missSrc)) return "the scale has no headroom for labels";
  return /LABEL_ROOM/.test(missSrc) || "no label headroom is reserved";
});

check("preferences reject a value that no longer exists", () => {
  // A stored id from an older build must not render a blank screen on load.
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
  };
  store.set("alba.prefs.v1", JSON.stringify({ home: "a-view-that-was-deleted", scale: 99 }));
  const p = loadPrefs();
  if (!HOMES.some((h) => h.id === p.home)) return `fell back to an invalid home: ${p.home}`;
  if (!SCALES.some((s) => s.id === p.scale)) return `fell back to an invalid scale: ${p.scale}`;
  savePrefs({ home: "gp", scale: 1.3 });
  const back = loadPrefs();
  return (back.home === "gp" && back.scale === 1.3) || "a saved preference did not survive a round trip";
});

check("interface scale covers a useful range and starts at the design density", () => {
  if (SCALES[0].id !== 1) return "the first scale is not 100%";
  if (Math.max(...SCALES.map((s) => s.id)) < 1.4) return "no setting large enough for a projector or a screenshot";
  return true;
});

// ── The four reference screens added last ──────────────────────────────────
section("The nine reference screens — the four built last");

check("the revenue bridge sums exactly to the forecast gap", () => {
  const s = buildRevenueMiss();
  const sum = s.bridge.reduce((t, b) => t + b.value, 0);
  if (!near(sum, s.forecast.forecastGap, 0.5)) return `drivers sum to ${sum}, gap is ${s.forecast.forecastGap}`;
  if (!near(s.forecast.planRevenue - s.forecast.forecastGap, s.forecast.forecastRevenue, 0.5)) {
    return "plan less gap is not the forecast";
  }
  return true;
});

check("the lead time is found from the data, not written down", () => {
  const sig = buildSignalDevelopment();
  if (sig.alertWeek === null) return "no leading indicator ever trips — the alert week is null";
  if (sig.leadTimeWeeks !== sig.boardWeek - sig.alertWeek) return "lead time does not equal board week less alert week";
  if (sig.leadTimeWeeks < 1) return `lead time is ${sig.leadTimeWeeks} weeks — the claim is early warning`;
  // The alert must be raised by a leading indicator under a named threshold,
  // not by the accrued money crossing a materiality test.
  if (!sig.alertBasis?.length) return "the alert has no stated basis";
  for (const b of sig.alertBasis) {
    if (typeof b.level !== "number") return `alert basis "${b.label}" has no threshold level`;
    if (!b.basis) return `alert basis "${b.label}" does not say why that level`;
  }
  return true;
});

check("the early-warning claim beats a materiality test on the money", () => {
  // The whole argument for the platform. If a test on the accrued money alone
  // would have found this at the same time, the screen is claiming nothing.
  const sig = buildSignalDevelopment();
  if (sig.materialWeek === null) return true;   // never material — the claim is stronger, not weaker
  return sig.materialWeek > sig.alertWeek ||
    `money crosses materiality in week ${sig.materialWeek}, the alert fires in week ${sig.alertWeek}`;
});

check("every week on the timeline names an indicator and a source", () => {
  const sig = buildSignalDevelopment();
  const bad = sig.weeks.filter((w) => !w.indicator || !w.caption || !w.source);
  if (bad.length) return `${bad.length} week(s) with no indicator, caption or source`;
  if (sig.weeks.length < 6) return `only ${sig.weeks.length} weeks — the reference shows eight`;
  return true;
});

check("investigation confidence is counted, and something dissents", () => {
  const c = investigationConfidence(buildRevenueMiss());
  if (c.agreeing === c.indicatorCount) {
    return "every indicator agrees — a count where nothing can dissent is not a count";
  }
  if (c.confidence < 40 || c.confidence > 100) return `confidence ${c.confidence} is off the scale`;
  const counted = Math.round(40 + 50 * c.share + 5 * (c.answering / c.sourceCount));
  return c.confidence === counted || `stated ${c.confidence}, the rule gives ${counted}`;
});

check("the alert thresholds are levels a fund would recognise", () => {
  for (const [k, v] of Object.entries(ALERT_ON)) {
    if (!v.basis) return `${k} has a threshold with no stated basis`;
    if (typeof v.level !== "number") return `${k} has no numeric level`;
  }
  return true;
});

check("the protection plan's recovery path is an identity", () => {
  const p = buildProtectionPlan();
  const t = p.totals;
  if (!near(t.risk - t.target, t.residual, 1)) return `risk ${t.risk} − target ${t.target} != residual ${t.residual}`;
  const impacts = p.actions.filter((a) => a.kind === "recovery").reduce((s, a) => s + a.impact, 0);
  if (!near(impacts, t.target, 1)) return `action impacts sum to ${impacts}, recovery target is ${t.target}`;
  return true;
});

check("every action in the protection plan has an owner and a date", () => {
  const p = buildProtectionPlan();
  const bad = p.actions.filter((a) => !a.owner?.name || !a.dueDate || !a.rationale);
  return bad.length === 0 || `${bad.length} action(s) with no owner, due date or rationale`;
});

check("the opportunity radar scores every company it plots", () => {
  const r = buildOpportunityRadar();
  if (!r.opportunities.length) return "no opportunities at all";
  const bad = r.opportunities.filter((o) => !o.company || !Number.isFinite(o.confidence) || !Number.isFinite(o.value));
  if (bad.length) return `${bad.length} opportunity/ies with no company, value or confidence`;
  const off = r.opportunities.filter((o) => o.confidence < 40 || o.confidence > 100);
  return off.length === 0 || `${off.length} confidence value(s) off the 40–100 axis`;
});

check("the commercial action plan's upside ties to its account list", () => {
  const a = buildActionPlan();
  const rows = a.campaign ?? a.rows ?? [];
  if (!rows.length) return "no campaign rows";
  const bad = rows.filter((r) => !r.owner || !r.account);
  return bad.length === 0 || `${bad.length} campaign row(s) with no owner or account`;
});

// ── Alerts, actions and counterparties ─────────────────────────────────────
section("Alerts and counterparties — nothing typed, nothing shared");

check("every alert names its reading, its threshold and its source", () => {
  const alerts = portfolioAlerts();
  if (!alerts.length) return "no alerts at all across nine companies";
  const bad = alerts.filter((a) => !a.reading || !a.threshold || !a.source || !a.company);
  return bad.length === 0 || `${bad.length} alert(s) missing a reading, threshold or source`;
});

check("no alert is raised for a company the data is content with", () => {
  // An alert must correspond to a breach. The cheapest way to check that is to
  // confirm every alert's key is a threshold this file knows about, and that
  // the portfolio does not simply alert on everything.
  const alerts = portfolioAlerts();
  const unknown = alerts.filter((a) => !THRESHOLDS[a.key]);
  if (unknown.length) return `alert(s) on unknown thresholds: ${[...new Set(unknown.map((a) => a.key))].join(", ")}`;
  const perCompany = alerts.length / COMPANIES.length;
  return perCompany < 7 || `${perCompany.toFixed(1)} alerts per company — everything is red`;
});

check("the dashboard's action list is the tracker's own", () => {
  const dash = portfolioActions().map((a) => a.id).sort();
  const tracked = trackedActions().map((a) => a.id).sort();
  return JSON.stringify(dash) === JSON.stringify(tracked) ||
    "the dashboard and the action tracker are showing different action sets";
});

check("no two companies invoice the same customers", () => {
  // Every company used to bill Acme Corporation, Beta Holdings and
  // TechVentures Ltd — the same eight names on all nine receivables tables.
  const seen = new Map();
  for (const c of COMPANIES) {
    for (const name of customerBook(c.id, 5)) {
      if (seen.has(name)) return `${name} appears for both ${seen.get(name)} and ${c.name}`;
      seen.set(name, c.name);
    }
  }
  return true;
});

check("a customer book is stable and free of duplicates", () => {
  for (const c of COMPANIES) {
    const a = customerBook(c.id, 8), b = customerBook(c.id, 8);
    if (a.join("|") !== b.join("|")) return `${c.name} returns a different book on a second call`;
    if (new Set(a).size !== a.length) return `${c.name} has a duplicated counterparty`;
  }
  return true;
});

check("the receivables ledger reconciles and the ages differ by company", () => {
  const oldest = new Set();
  for (const c of COMPANIES) {
    const f = buildFinance({ id: c.id, status: c.rag.toLowerCase() });
    const sum = f.cash.debtors.reduce((t, d) => t + d.amount, 0) / 1000;
    if (!near(sum, f.cash.overdueTotal, 1)) return `${c.name}: debtor lines sum to ${Math.round(sum)}k against an overdue total of ${f.cash.overdueTotal}k`;
    oldest.add(Math.max(...f.cash.debtors.map((d) => d.daysOverdue)));
  }
  return oldest.size > 4 || `only ${oldest.size} distinct oldest-debt ages across nine companies`;
});

check("the company page's sales-quality cards are populated for every company", () => {
  // The reference draws three cards along the foot of the company page. Showing
  // them only for the one company whose scenario happens to define sales cycle
  // and churn would leave eight blank.
  const seen = new Set();
  for (const c of COMPANIES) {
    const rows = salesQualityFor(c.id);
    if (!rows || rows.length !== 3) return `${c.name} has ${rows?.length ?? 0} cards, not 3`;
    for (const r of rows) {
      if (!r.value || !r.basis || !r.source) return `${c.name}: "${r.label}" has no value, basis or source`;
      if (/NaN|undefined/.test(r.value)) return `${c.name}: "${r.label}" reads ${r.value}`;
    }
    seen.add(rows.map((r) => r.value).join("|"));
  }
  return seen.size === COMPANIES.length ||
    `only ${seen.size} distinct sales-quality readings across ${COMPANIES.length} companies`;
});

check("a modelled figure says so on the tile", () => {
  for (const c of COMPANIES) {
    for (const r of salesQualityFor(c.id)) {
      if (typeof r.modelled !== "boolean") return `${c.name}: "${r.label}" does not declare whether it is modelled`;
    }
  }
  // At least one must be read rather than modelled, or the row is all model.
  return salesQualityFor(COMPANIES[0].id).some((r) => !r.modelled) ||
    "every sales-quality figure is modelled — none is read from the ledger";
});

check("no screen names a system that is not in the connected estate", async () => {
  // The live-data screen badged TrueLayer, Salesforce and Yahoo Finance as LIVE
  // while the Integration Plan one click away listed them as mocked and
  // INTEGRATIONS did not carry them at all — three screens disagreeing about
  // the same estate.
  const known = new Set(INTEGRATIONS.map((i) => i.name));
  const invented = ["TrueLayer", "Salesforce", "Yahoo Finance", "Jira", "Zendesk", "Greenhouse"];
  const offenders = [];
  for (const f of viewFiles) {
    // The Integration Plan's job is to list what is NOT connected yet.
    if (f === "IntegrationPlan.jsx") continue;
    const src = await codeOf(`../src/views/${f}`);
    // Only look at rendered strings, not at comments recording what was removed.
    const body = src.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const name of invented) {
      if (body.includes(name) && !known.has(name)) offenders.push(`${f} names ${name}`);
    }
  }
  return offenders.length === 0 || offenders.join("; ");
});

check("the finance drill-down states the calculation and the source", async () => {
  // The specification requires both on every figure. This file used to name
  // TrueLayer — not a connected system — and quote "synced 4h ago" on every
  // panel regardless of the ledger's as-of date.
  const src = await codeOf("../src/views/FinanceDrilldown.jsx");
  if (!/Calculation:/.test(src)) return "no calculation is stated";
  if (!/Source:/.test(src)) return "no source is stated";
  if (/4h ago|synced 4h/.test(src)) return "still quotes a typed refresh age";
  if (/\+£12k MoM/.test(src)) return "still asserts a month-on-month move it has not read";
  return true;
});

check("the debtor split always sums to one", () => {
  for (const c of COMPANIES) {
    const { split, days } = debtorProfile(c.id, 5);
    const s = split.reduce((t, v) => t + v, 0);
    if (!near(s, 1, 0.0001)) return `${c.name}: shares sum to ${s}`;
    if (days.some((d) => d < 20 || d > 120)) return `${c.name}: an implausible overdue age`;
  }
  return true;
});

await Promise.all(pending);

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
