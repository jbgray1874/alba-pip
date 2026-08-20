// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Company detail modules, for every company
//  ----------------------------------------------------------------------------
//  GPDashboard held a MODULES object with data for exactly one company. Every
//  module tab was guarded `{tab==="finance" && d && <FinanceModule/>}`, and `d`
//  was undefined for the other eight — so eight of eleven tabs rendered nothing
//  at all, with no error and no message. The finance drill-down, which the
//  specification calls the platform's strongest asset, is launched from one of
//  those tabs, so it was unreachable for eight of nine companies.
//
//  This generates the same shape for any company. The finance, sales, people
//  and cross-functional modules are DERIVED from buildFinance(), so they cannot
//  disagree with the portfolio table, the scenarios or the drill-down.
//
//  Operations, procurement, technology and compliance have no source model yet
//  — there is no Jira, no Zendesk, no contract register. Those are generated
//  from each company's existing sub-scores, which already drive the health ring
//  on screen. A company scoring 51 on operations therefore shows worse
//  operational KPIs than one scoring 86, and the tab agrees with the ring above
//  it. Every one of those figures is marked `modelled: true` and carries
//  "Alba model" as its source rather than a system name, because a source label
//  that cannot be wrong is worse than none — it gets believed.
// ════════════════════════════════════════════════════════════════════════════

import { buildFinance } from "./financeData.js";
import { companyById } from "./companies.js";
import { AS_OF_MONTH } from "./portfolioSeries.js";
import { fmtMoney } from "./fx.js";

const MO = ["Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May"];

/** Deterministic per-company variation — no Math.random, no clock. */
function rngFor(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (v) => Math.round(v * 10) / 10;

/** RAG from a value against thresholds, direction-aware. */
const rag = (v, green, amber, lowerBetter = false) => lowerBetter
  ? (v <= green ? "green" : v <= amber ? "amber" : "red")
  : (v >= green ? "green" : v >= amber ? "amber" : "red");

/**
 * Scale a target figure by how well the company scores in that discipline.
 * score 50 returns `mid`; 100 returns `best`; 0 returns `worst`.
 */
function byScore(score, worst, mid, best) {
  const t = Math.max(0, Math.min(100, score)) / 100;
  return t < 0.5 ? worst + (mid - worst) * (t / 0.5) : mid + (best - mid) * ((t - 0.5) / 0.5);
}

const kpi = (label, value, status, delta, src, threshold, confidence, modelled = false) =>
  ({ label, value, status, delta, src, threshold, confidence, modelled });

/**
 * Every module for one company.
 * @param {string} id company id from the registry
 */
export function modulesFor(id, opts = {}) {
  const co = companyById(id);
  if (!co) return null;

  const fin = buildFinance({ id, status: co.rag.toLowerCase() }, opts);
  const ccy = fin.currency;
  const m = (v) => fmtMoney(v, ccy, { k: true });
  const rand = rngFor(id);
  const s = co.subScores;
  const h = fin.history;
  const last12 = (arr) => arr.slice(-12);

  const varPct = (fin.revenue.total / fin.revenue.budget - 1) * 100;
  const arr = fin.revenue.total * 12;
  const revPerHead = arr / fin.people.headcount;
  const burnPerHead = fin.cash.burn / fin.people.headcount;
  const growthPct = ((fin.revenue.total / h.revenue[0].actual) ** (12 / (h.months.length - 1)) - 1) * 100;
  const ruleOf40 = growthPct + fin.ebitda.pct;
  const dso = Math.round(byScore(s.finance, 68, 52, 34));
  const workingCapital = fin.cash.overdueTotal + fin.revenue.total * 0.4 - fin.cash.burn * 0.9;

  const freshness = `${co.upd}`;
  const ALBA = "Alba model";

  // ── Finance — every figure from the ledger ───────────────────────────────
  const finance = {
    src: `${fin.cash.source.label} · ${fin.revenue.source.label} · ${freshness}`,
    qual: co.freshness,
    asOf: fin.asOf,
    kpis: [
      kpi("Cash Balance", m(fin.cash.balance), rag(fin.runway, 12, 6), `${m(h.cash[h.cash.length - 2].balance - fin.cash.balance)} MoM`, fin.cash.source.label, `Warn <${m(fin.cash.burn * 3)}`, 98),
      kpi("Cash Runway", `${fin.runway} mo`, rag(fin.runway, 12, 6), `vs ${r1(fin.cash.balance / h.cash[0].burn)} mo on opening burn`, ALBA, "Red <6 mo", 98),
      kpi("Monthly Burn", m(fin.cash.burn), rag(fin.cash.burn, h.cash[0].burn, h.cash[0].burn * 1.5, true), `from ${m(h.cash[0].burn)}`, fin.cash.source.label, "Warn +10% MoM", 96),
      kpi("Revenue vs Budget", `${Math.round((fin.revenue.total / fin.revenue.budget) * 100)}%`, rag(varPct, 0, -5), `${varPct >= 0 ? "+" : ""}${varPct.toFixed(1)}% vs plan`, fin.revenue.source.label, "Red <85%", 99),
      kpi("Gross Margin", `${fin.ebitda.grossMargin}%`, rag(fin.ebitda.grossMargin - h.ebitda[0].grossMarginPct, 0, -3), `from ${h.ebitda[0].grossMarginPct}%`, fin.revenue.source.label, "Watch vs opening", 97),
      kpi("EBITDA Margin", `${fin.ebitda.pct}%`, rag(fin.ebitda.pct, 5, -10), m(fin.ebitda.value), fin.revenue.source.label, "Red <-15%", 97),
      kpi("ARR", m(arr), rag(varPct, 0, -5), `${m(fin.revenue.total)}/month × 12`, ALBA, "Watch", 100),
      kpi("Overdue AR", m(fin.cash.overdueTotal), rag(fin.cash.overdueTotal / fin.revenue.total, 0.15, 0.3, true), `${fin.cash.debtors.length} accounts`, fin.revenue.source.label, "Warn >25% of revenue", 94),
      kpi("DSO", `${dso} days`, rag(dso, 45, 60, true), `finance score ${s.finance}/100`, ALBA, "Red >60 days", 84, true),
      kpi("Burn Multiple", `${r1(fin.cash.burn / Math.max(1, fin.revenue.total - h.revenue[h.revenue.length - 2].actual))}×`, rag(fin.ebitda.pct, 5, -10), "burn ÷ net new revenue", ALBA, "Red >3×", 88, true),
      kpi("Working Capital", m(workingCapital), rag(workingCapital, fin.cash.burn, 0), "AR + inventory less near-term payables", ALBA, "Watch", 86, true),
      kpi("Revenue per Employee", m(revPerHead), rag(s.finance, 75, 50), `${fin.people.headcount} employees`, ALBA, "Watch", 96),
    ],
    rev: last12(h.revenue).map((x, i) => ({ m: MO[i], actual: x.actual, budget: x.budget })),
    cash: fin.cash.cashProj.map((p) => ({ m: p.m, v: p.v })),
    arAging: fin.cash.arAging.map((a) => ({ bucket: a.bucket, val: Math.round(a.val / 1000) })),
  };

  // ── Sales — from the CRM series ──────────────────────────────────────────
  const cov = fin.sales.pipelineCoverage;
  const quota = fin.revenue.budget * 3;
  const sales = {
    src: `${fin.sales.source.label} · ${freshness}`,
    qual: co.freshness,
    asOf: fin.asOf,
    kpis: [
      kpi("Pipeline Coverage", `${cov}×`, rag(cov, 3, 2), `from ${fin.sales.coverageFrom}×`, fin.sales.source.label, "Red <2×", 95),
      kpi("Win Rate", `${fin.sales.winRatePct}%`, rag(fin.sales.winRatePct, 30, 22), `from ${fin.sales.winRateFrom}%`, fin.sales.source.label, "Red <20%", 95),
      kpi("Quarterly Quota", m(quota), rag(varPct, 0, -5), `${m(fin.revenue.budget)}/month × 3`, ALBA, "Watch", 98),
      kpi("Open Pipeline", m(quota * cov), rag(cov, 3, 2), "quota × coverage", ALBA, "Watch", 92),
      kpi("Largest Account", m((fin.revenue.deals[0]?.amount ?? 0) / 1000), rag(s.sales, 75, 50), fin.revenue.deals[0]?.party ?? "—", fin.revenue.source.label, "Warn >20% of revenue", 99),
      kpi("Sales Cycle", `${Math.round(byScore(s.sales, 108, 84, 58))} days`, rag(s.sales, 70, 45), `sales score ${s.sales}/100`, ALBA, "Warn >90 days", 82, true),
      kpi("Net Revenue Retention", `${Math.round(byScore(s.sales, 84, 100, 124))}%`, rag(s.sales, 70, 50), "expansion less churn", ALBA, "Red <90%", 80, true),
      kpi("Quota Attainment", `${Math.round((fin.revenue.total / fin.revenue.budget) * 100)}%`, rag(varPct, 0, -5), "actual ÷ plan", ALBA, "Red <85%", 98),
      kpi("Deals in Quarter", `${Math.round(byScore(s.sales, 9, 16, 26))}`, rag(s.sales, 70, 45), "open opportunities", fin.sales.source.label, "Watch", 84, true),
    ],
    pipe: last12(fin.sales.history).map((x, i) => ({
      m: MO[i],
      pipe: Math.round(quota * x.pipelineCoverage),
      target: Math.round(quota * 3),
    })),
    funnel: (() => {
      const won = Math.max(2, Math.round(byScore(s.sales, 6, 12, 22)));
      const wr = fin.sales.winRatePct / 100;
      const neg = Math.round(won / wr);
      return [
        { stage: "Leads", v: Math.round(neg * 14) },
        { stage: "Qualified", v: Math.round(neg * 5.2) },
        { stage: "Demo", v: Math.round(neg * 2.6) },
        { stage: "Proposal", v: Math.round(neg * 1.6) },
        { stage: "Negotiation", v: neg },
        { stage: "Closed Won", v: won },
      ];
    })(),
  };

  // ── People — from the HRIS series ────────────────────────────────────────
  const pHist = last12(fin.people.history);
  const hr = {
    src: `${fin.people.source.label} · ${freshness}`,
    qual: co.freshness,
    asOf: fin.asOf,
    kpis: [
      kpi("Headcount", `${fin.people.headcount}`, rag(fin.people.headcount - fin.people.planHeadcount, 0, -5), `plan ${fin.people.planHeadcount}`, fin.people.source.label, "Watch vs plan", 100),
      kpi("Attrition", `${fin.people.attritionPct}%`, rag(fin.people.attritionPct, 12, 20, true), `from ${fin.people.history[0].attritionPct}%`, fin.people.source.label, "Red >20%", 97),
      kpi("Open Roles", `${Math.max(0, fin.people.planHeadcount - fin.people.headcount)}`, rag(fin.people.planHeadcount - fin.people.headcount, 0, -6), "plan less in seat", ALBA, "Warn >5", 100),
      kpi("Revenue per Employee", m(revPerHead), rag(s.finance, 75, 50), "ARR ÷ headcount", ALBA, "Watch", 96),
      kpi("Burn per Employee", m(burnPerHead), rag(burnPerHead, fin.revenue.total / fin.people.headcount * 0.4, fin.revenue.total / fin.people.headcount * 0.8, true), "monthly", ALBA, "Watch", 96),
      kpi("Time to Hire", `${Math.round(byScore(s.hr, 74, 52, 34))} days`, rag(s.hr, 70, 45), `people score ${s.hr}/100`, ALBA, "Warn >60 days", 80, true),
      kpi("Engagement", `${Math.round(byScore(s.hr, 54, 68, 84))}%`, rag(s.hr, 70, 50), "last pulse survey", ALBA, "Red <60%", 76, true),
      kpi("Manager Span", `${r1(byScore(s.hr, 3.4, 5.8, 7.6))}`, rag(s.hr, 65, 45), "reports per manager", ALBA, "Watch", 78, true),
      kpi("Payroll", m((fin.cash.burnCats.find((b) => /people|payroll|salar/i.test(b.label))?.value) ?? fin.cash.burn * 0.55), "amber", "share of burn", fin.cash.source.label, "Watch", 94),
    ],
    att: pHist.map((x, i) => ({ m: MO[i], att: x.attritionPct, bench: 12 })),
    hcWaterfall: pHist.slice(-6).map((x, i, a) => {
      const prev = i === 0 ? pHist[pHist.length - 7]?.headcount ?? x.headcount : a[i - 1].headcount;
      const net = x.headcount - prev;
      const leavers = Math.max(1, Math.round((x.attritionPct / 100) * x.headcount / 12));
      return { m: MO[MO.length - 6 + i], hires: Math.max(0, net + leavers), leavers: -leavers };
    }),
  };

  // ── Modelled disciplines ─────────────────────────────────────────────────
  // No source system exists for these yet. Each figure is driven by the
  // company's own sub-score so the tab agrees with the health ring, is flagged
  // `modelled`, and names "Alba model" rather than a system it never touched.
  const jitter = (n) => 1 + (rand() - 0.5) * n;

  const ops = {
    src: `${ALBA} · derived from operations score ${s.ops}/100`, qual: 70, asOf: fin.asOf, modelled: true,
    kpis: [
      kpi("SLA Adherence", `${Math.round(byScore(s.ops, 78, 91, 99) * jitter(0.02))}%`, rag(s.ops, 75, 55), `ops score ${s.ops}/100`, ALBA, "Red <90%", 70, true),
      kpi("Ticket Backlog", `${Math.round(byScore(s.ops, 320, 170, 46) * jitter(0.15))}`, rag(s.ops, 75, 55), "open at month end", ALBA, "Warn >150", 70, true),
      kpi("Cycle Time", `${r1(byScore(s.ops, 7.4, 4.2, 2.1) * jitter(0.1))} days`, rag(s.ops, 75, 55), "request to delivery", ALBA, "Warn >4 days", 70, true),
      kpi("On-Time Delivery", `${Math.round(byScore(s.ops, 74, 88, 98) * jitter(0.02))}%`, rag(s.ops, 75, 55), "against commitment", ALBA, "Red <90%", 70, true),
      kpi("CSAT", `${r1(byScore(s.ops, 6.2, 8.0, 9.3))}/10`, rag(s.ops, 75, 55), "customer satisfaction", ALBA, "Red <7", 70, true),
      kpi("Incident Rate", `${Math.round(byScore(s.ops, 11, 5, 1) * jitter(0.2))}/wk`, rag(s.ops, 75, 55), "operational incidents", ALBA, "Warn >5/wk", 70, true),
      kpi("Capacity Utilisation", `${Math.round(byScore(s.ops, 96, 84, 76) * jitter(0.03))}%`, rag(s.ops, 75, 55), "against available", ALBA, "Warn >90%", 70, true),
      kpi("Rework Rate", `${r1(byScore(s.ops, 9.4, 4.1, 1.2))}%`, rag(s.ops, 75, 55), "output requiring rework", ALBA, "Warn >5%", 70, true),
      kpi("Cost to Serve", m(fin.revenue.total * (byScore(s.ops, 0.22, 0.14, 0.08))), rag(s.ops, 75, 55), "share of revenue", ALBA, "Watch", 70, true),
    ],
  };

  const procurement = {
    src: `${ALBA} · derived from procurement score ${s.procurement}/100`, qual: 70, asOf: fin.asOf, modelled: true,
    kpis: [
      kpi("Spend vs Budget", `${Math.round(byScore(s.procurement, 114, 100, 92) * jitter(0.02))}%`, rag(s.procurement, 75, 55), `procurement score ${s.procurement}/100`, ALBA, "Red >110%", 70, true),
      kpi("Supplier Concentration", `${Math.round(byScore(s.procurement, 62, 42, 24))}%`, rag(s.procurement, 75, 55), "top 3 suppliers", ALBA, "Warn >40%", 70, true),
      kpi("Contract Coverage", `${Math.round(byScore(s.procurement, 54, 78, 96))}%`, rag(s.procurement, 75, 55), "spend under contract", ALBA, "Warn <80%", 70, true),
      kpi("Maverick Spend", `${Math.round(byScore(s.procurement, 26, 12, 3))}%`, rag(s.procurement, 75, 55), "outside agreed suppliers", ALBA, "Red >15%", 70, true),
      kpi("Savings Delivered", m(fin.cash.burn * byScore(s.procurement, 0.01, 0.04, 0.09)), rag(s.procurement, 75, 55), "year to date", ALBA, "Watch", 70, true),
      kpi("Overdue Renewals", `${Math.round(byScore(s.procurement, 9, 3, 0))}`, rag(s.procurement, 75, 55), "past renewal date", ALBA, "Warn >2", 70, true),
      kpi("Payment Terms", `${Math.round(byScore(s.procurement, 24, 38, 62))} days`, rag(s.procurement, 75, 55), "weighted average", ALBA, "Watch", 70, true),
      kpi("Suppliers", `${Math.round(byScore(s.procurement, 380, 210, 96))}`, rag(s.procurement, 75, 55), "active in period", ALBA, "Watch", 70, true),
      kpi("Portfolio Overlap", `${Math.round(byScore(s.procurement, 3, 6, 9))}`, "amber", "suppliers shared across the fund", ALBA, "See Procurement screen", 70, true),
    ],
  };

  const technology = {
    src: `${ALBA} · derived from technology score ${s.technology}/100`, qual: 70, asOf: fin.asOf, modelled: true,
    kpis: [
      kpi("Uptime", `${(byScore(s.technology, 98.4, 99.6, 99.98)).toFixed(2)}%`, rag(s.technology, 75, 55), `technology score ${s.technology}/100`, ALBA, "Red <99%", 70, true),
      kpi("Incidents / Month", `${Math.round(byScore(s.technology, 14, 5, 1) * jitter(0.2))}`, rag(s.technology, 75, 55), "severity 1 and 2", ALBA, "Warn >5", 70, true),
      kpi("MTTR", `${Math.round(byScore(s.technology, 210, 74, 22))} min`, rag(s.technology, 75, 55), "mean time to restore", ALBA, "Warn >2h", 70, true),
      kpi("Cloud Spend", m(fin.cash.burn * byScore(s.technology, 0.14, 0.09, 0.05)), rag(s.technology, 75, 55), "monthly", ALBA, "Warn +10% MoM", 70, true),
      kpi("Deploy Frequency", `${Math.round(byScore(s.technology, 1, 6, 18))}/wk`, rag(s.technology, 75, 55), "to production", ALBA, "Green >5/wk", 70, true),
      kpi("Change Fail Rate", `${Math.round(byScore(s.technology, 19, 8, 2))}%`, rag(s.technology, 75, 55), "deploys requiring rollback", ALBA, "Warn >10%", 70, true),
      kpi("Tech Debt Ratio", `${Math.round(byScore(s.technology, 34, 19, 8))}%`, rag(s.technology, 75, 55), "effort on remediation", ALBA, "Warn >25%", 70, true),
      kpi("Critical Vulnerabilities", `${Math.round(byScore(s.technology, 18, 4, 0))}`, rag(s.technology, 75, 55), "unpatched", ALBA, "Red >5", 70, true),
      kpi("Engineering Headcount", `${Math.max(1, Math.round(fin.people.headcount * byScore(s.technology, 0.12, 0.22, 0.34)))}`, "green", "share of total", ALBA, "Watch", 70, true),
    ],
  };

  const compliance = {
    src: `${ALBA} · derived from compliance score ${s.compliance}/100`, qual: 70, asOf: fin.asOf, modelled: true,
    kpis: [
      kpi("Policy Attestations", `${Math.round(byScore(s.compliance, 68, 89, 100))}%`, rag(s.compliance, 75, 55), `compliance score ${s.compliance}/100`, ALBA, "Red <85%", 70, true),
      kpi("Open Audit Issues", `${Math.round(byScore(s.compliance, 14, 4, 0))}`, rag(s.compliance, 75, 55), "unresolved", ALBA, "Warn >3", 70, true),
      kpi("Overdue Actions", `${Math.round(byScore(s.compliance, 11, 3, 0))}`, rag(s.compliance, 75, 55), "past due date", ALBA, "Warn >2", 70, true),
      kpi("Mandatory Training", `${Math.round(byScore(s.compliance, 71, 92, 100))}%`, rag(s.compliance, 75, 55), "completed", ALBA, "Red <90%", 70, true),
      kpi("Data Requests Open", `${Math.round(byScore(s.compliance, 7, 2, 0))}`, rag(s.compliance, 75, 55), "subject access", ALBA, "Warn >3", 70, true),
      kpi("Incidents Reported", `${Math.round(byScore(s.compliance, 6, 2, 0))}`, rag(s.compliance, 75, 55), "in period", ALBA, "Watch", 70, true),
      kpi("Insurance Renewal", `${Math.round(byScore(s.compliance, 12, 84, 210))} days`, rag(s.compliance, 75, 55), "until next renewal", ALBA, "Warn <60 days", 70, true),
      kpi("Register Completeness", `${Math.round(byScore(s.compliance, 62, 86, 99))}%`, rag(s.compliance, 75, 55), "risk register", ALBA, "Red <80%", 70, true),
      kpi("Board Reporting", "on time", "green", "last four cycles", ALBA, "Watch", 70, true),
    ],
  };

  // ── Cross-functional — every one derived ─────────────────────────────────
  const crossFunctional = {
    src: `${fin.revenue.source.label} · ${fin.sales.source.label} · ${fin.people.source.label} · derived`,
    qual: co.freshness, asOf: fin.asOf,
    kpis: [
      kpi("Revenue per Employee", m(revPerHead), rag(s.finance, 75, 50), `ARR ${m(arr)} ÷ ${fin.people.headcount}`, ALBA, "Watch", 96),
      kpi("Burn per Employee", m(burnPerHead), rag(fin.ebitda.pct, 5, -10), "monthly burn ÷ headcount", ALBA, "Watch", 96),
      kpi("Rule of 40", `${Math.round(ruleOf40)}`, rag(ruleOf40, 40, 20), `growth ${growthPct.toFixed(0)}% + EBITDA ${fin.ebitda.pct}%`, ALBA, "Red <20", 92),
      kpi("Growth Rate", `${growthPct.toFixed(0)}%`, rag(growthPct, 25, 8), `annualised over ${h.months.length} months`, ALBA, "Watch", 94),
      kpi("Sales Efficiency", `${r1((fin.revenue.total - h.revenue[h.revenue.length - 4].actual) * 3 / Math.max(1, fin.ebitda.opexLines[0].value))}`, rag(s.sales, 75, 50), "net new revenue ÷ S&M spend", ALBA, "Green >0.5", 88),
      kpi("Gross Margin", `${fin.ebitda.grossMargin}%`, rag(fin.ebitda.grossMargin - h.ebitda[0].grossMarginPct, 0, -3), `from ${h.ebitda[0].grossMarginPct}%`, ALBA, "Watch vs opening", 97),
      kpi("Coverage × Win Rate", `${r1(cov * fin.sales.winRatePct / 100)}`, rag(cov * fin.sales.winRatePct / 100, 0.9, 0.6), "expected quota cover", ALBA, "Red <0.6", 90),
      kpi("Attrition vs Plan Gap", `${fin.people.attritionPct}% / ${Math.max(0, fin.people.planHeadcount - fin.people.headcount)}`, rag(fin.people.attritionPct, 12, 20, true), "leaving while roles unfilled", ALBA, "Watch", 95),
      kpi("Months to Cash Floor", `${fin.runway}`, rag(fin.runway, 12, 6), `cash ${m(fin.cash.balance)} ÷ burn ${m(fin.cash.burn)}`, ALBA, "Red <6", 98),
    ],
  };

  return { finance, sales, hr, ops, procurement, technology, compliance, crossFunctional,
           meta: { asOf: fin.asOf, currency: ccy, company: co.name, freshness: co.freshness, updated: co.upd } };
}

/**
 * Benchmarks for one company against its sector.
 *
 * GPDashboard held a BENCHMARKS literal with one key and fell back to
 * `BENCHMARKS.meridian` for everything else — so eight companies displayed
 * Meridian's benchmark figures under their own name. Khaleej, on 29% gross
 * margin, showed 71%. Silently wrong is worse than blank, because blank gets
 * reported and wrong gets quoted.
 *
 * The company column is read from the finance model. The sector quartiles are
 * reference ranges per sector — the one thing here that genuinely cannot come
 * from the portfolio, since it describes companies the fund does not own.
 */
const SECTOR_BENCHMARKS = {
  "B2B SaaS":        { gm: [72, 80, 60], nrr: [105, 120, 90], rule40: [35, 50, 20], revPerHead: [120, 160, 80],  attrition: [12, 8, 18], cacPayback: [14, 10, 22] },
  "B2B Software":    { gm: [74, 82, 62], nrr: [108, 124, 92], rule40: [36, 52, 20], revPerHead: [125, 168, 84],  attrition: [12, 8, 18], cacPayback: [14, 10, 22] },
  "FinTech":         { gm: [68, 79, 55], nrr: [110, 128, 94], rule40: [38, 54, 22], revPerHead: [140, 190, 95],  attrition: [11, 7, 17], cacPayback: [13, 9, 20] },
  "HealthTech":      { gm: [62, 74, 48], nrr: [102, 116, 88], rule40: [28, 44, 14], revPerHead: [105, 145, 70],  attrition: [14, 9, 21], cacPayback: [17, 12, 26] },
  "Logistics":       { gm: [38, 48, 28], nrr: [98, 110, 86],  rule40: [22, 34, 10], revPerHead: [135, 180, 90],  attrition: [18, 12, 26], cacPayback: [15, 11, 23] },
  "Manufacturing":   { gm: [42, 52, 32], nrr: [96, 108, 84],  rule40: [20, 32, 9],  revPerHead: [150, 200, 105], attrition: [13, 9, 19], cacPayback: [16, 11, 24] },
  "Consumer":        { gm: [34, 44, 24], nrr: [94, 106, 82],  rule40: [18, 30, 8],  revPerHead: [115, 155, 78],  attrition: [22, 15, 30], cacPayback: [18, 13, 27] },
  "Energy Services": { gm: [31, 40, 22], nrr: [97, 109, 85],  rule40: [19, 31, 8],  revPerHead: [160, 215, 110], attrition: [15, 10, 22], cacPayback: [19, 14, 28] },
};
const DEFAULT_BENCHMARK = SECTOR_BENCHMARKS["B2B SaaS"];

export function benchmarksFor(id, opts = {}) {
  const co = companyById(id);
  if (!co) return null;
  const fin = buildFinance({ id, status: co.rag.toLowerCase() }, opts);
  const b = SECTOR_BENCHMARKS[co.sector] ?? DEFAULT_BENCHMARK;
  const s = co.subScores;

  const arr = fin.revenue.total * 12;
  const growthPct = ((fin.revenue.total / fin.history.revenue[0].actual) ** (12 / (fin.history.months.length - 1)) - 1) * 100;
  const row = (kpi, value, [median, top, bottom], unit, lowerBetter = false, modelled = false) =>
    ({ kpi, company: Math.round(value * 10) / 10, sectorMedian: median, topQuartile: top, bottomQuartile: bottom, unit, lowerBetter, modelled });

  return [
    row("Gross Margin",    fin.ebitda.grossMargin, b.gm, "%"),
    row("Rule of 40",      growthPct + fin.ebitda.pct, b.rule40, ""),
    row("Revenue per Emp", arr / fin.people.headcount, b.revPerHead, `${fin.currency === "GBP" ? "£" : ""}k`),
    row("Attrition",       fin.people.attritionPct, b.attrition, "%", true),
    row("NRR",             byScore(s.sales, 84, 100, 124), b.nrr, "%", false, true),
    row("CAC Payback",     byScore(s.sales, 26, 16, 9), b.cacPayback, "mo", true, true),
  ];
}

/** Which disciplines are modelled rather than read from a source system. */
export const MODELLED_DISCIPLINES = ["ops", "procurement", "technology", "compliance"];

export { AS_OF_MONTH };
