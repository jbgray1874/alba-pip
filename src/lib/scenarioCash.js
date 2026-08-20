// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Scenario 2: the funded position that isn't
//  ----------------------------------------------------------------------------
//  Nusantara Foods reports 8.1 months of runway and the board pack calls the
//  company funded. That figure is cash divided by *this month's* burn — which
//  holds burn flat, the one thing eighteen months of ledger says it will not
//  do. Burn has gone from S$296k to S$615k over the period while cash fell from
//  S$12.9m to S$5.0m. The divisor has been moving the whole time.
//
//  There is no cash-floor breach inside the thirteen-week view on this
//  company's figures, and the model does not assert one. Manufacturing a breach
//  by tuning the floor would be exactly the failure this project keeps fixing.
//  What the data supports is the gap between three runway bases, so that is
//  what the screen shows.
//
//  The design decision that matters is where the model is anchored. A bottom-up
//  build — headcount times salary, plus suppliers, plus debt service — produces
//  a forecast whose implied burn does not match the burn the company reports,
//  and the portfolio table and the cash screen then disagree in front of the
//  customer. That happened once already in this project and cost a rebuild.
//
//  So the model is anchored to reported net burn and the composition derived
//  from it: payroll is calculated from headcount, debt service is a known
//  schedule, and supplier spend is whatever is left once the model ties. The
//  identity is receipts − outflow = reported burn. Every lever then moves a
//  baseline that is true by construction.
// ════════════════════════════════════════════════════════════════════════════

import { buildFinance } from "./financeData.js";
import { companyById } from "./companies.js";
import { makeInsight, evidence, CONFIDENCE } from "./insight.js";
import { SOURCES } from "./kpiDefinitions.js";
import { fmtMoney } from "./fx.js";

export const COMPANY_ID = "nusantara";

export const PARAMS = {
  weeks: 13,
  dsoDays: 62,                 // current days sales outstanding
  dsoPlanDays: 45,             // what the plan assumed
  salaryPerHeadPerYear: 78,    // thousands, native currency, fully loaded
  payrollClearsEveryNthWeek: 4,
  debtServicePerMonth: 45,     // thousands, native currency
  minimumCash: 1500,           // board-agreed floor that triggers a funding process
  plannedHires: 6,             // approved, not yet in seat
  collectionsReleaseWeeks: 8,  // a DSO improvement releases working capital over this period
};

const r0 = (v) => Math.round(v);
const r1 = (v) => Math.round(v * 10) / 10;

/**
 * The baseline, derived so that it reproduces the reported position exactly.
 */
export function cashBaseline(opts = {}) {
  const co = companyById(COMPANY_ID);
  const fin = buildFinance({ id: COMPANY_ID, status: co.rag.toLowerCase() }, opts);
  const ccy = fin.native.currency;
  const s = fin.native;

  const monthlyReceipts = s.revenue;
  const reportedBurn = s.burn;

  // The finding, and it is in the ledger rather than in an assumption: burn has
  // been climbing every month. Reported runway divides cash by *current* burn,
  // which holds it flat — the one thing eighteen months of data says it will
  // not do. The growth rate is measured, not chosen.
  const fx = s.cash / fin.cash.balance; // native per reporting unit
  const burnFirst = fin.history.cash[0].burn * fx;
  const burnMonths = fin.history.cash.length - 1;
  const burnGrowthMonthly = burnMonths > 0 && burnFirst > 0
    ? Math.pow(reportedBurn / burnFirst, 1 / burnMonths) - 1
    : 0;
  const cashFirst = fin.history.cash[0].balance * fx;

  // Fixed by the identity: receipts less outflow is the burn the company
  // reports. Nothing below is free to drift away from that.
  const monthlyOutflow = monthlyReceipts + reportedBurn;
  const monthlyPayroll = (fin.people.headcount * PARAMS.salaryPerHeadPerYear) / 12;
  const monthlyDebtService = PARAMS.debtServicePerMonth;
  const monthlySuppliers = monthlyOutflow - monthlyPayroll - monthlyDebtService;

  return {
    company: co, fin, currency: ccy,
    headcount: fin.people.headcount,
    planHeadcount: fin.people.planHeadcount,
    openingCash: s.cash,
    reportedBurn,
    reportedRunway: fin.runway,
    burnTrend: {
      from: r0(burnFirst), to: r0(reportedBurn), months: burnMonths,
      monthlyGrowth: burnGrowthMonthly,
      multiple: burnFirst > 0 ? r1(reportedBurn / burnFirst) : null,
      cashFrom: r0(cashFirst), cashTo: r0(s.cash),
    },
    monthlyReceipts,
    monthlyOutflow,
    monthlyPayroll,
    monthlySuppliers,
    monthlyDebtService,
    composition: [
      { label: "Payroll", value: monthlyPayroll, share: monthlyPayroll / monthlyOutflow,
        basis: `${fin.people.headcount} employees at ${PARAMS.salaryPerHeadPerYear}k fully loaded` },
      { label: "Suppliers and overheads", value: monthlySuppliers, share: monthlySuppliers / monthlyOutflow,
        basis: "Derived so that receipts less outflow equals reported net burn" },
      { label: "Debt service", value: monthlyDebtService, share: monthlyDebtService / monthlyOutflow,
        basis: "Contractual schedule" },
    ],
  };
}

/**
 * Recompute under management levers.
 *
 * @param {object}  levers
 * @param {number}  levers.collectionsDaysImprovement  days taken out of DSO
 * @param {boolean} levers.hiringPause                 freeze the approved hires
 * @param {number}  levers.discretionaryCutPct         proportion cut from supplier spend
 */
export function buildCashScenario(levers = {}, opts = {}) {
  const {
    collectionsDaysImprovement = 0,
    hiringPause = false,
    discretionaryCutPct = 0,
  } = levers;

  const base = opts.baseline ?? cashBaseline(opts);
  const annualRevenue = base.monthlyReceipts * 12;

  // A DSO improvement is a one-off release of working capital, not a permanent
  // uplift in receipts. Modelling it as recurring is the most common way a cash
  // plan overstates itself, and the easiest thing for a CFO to catch.
  const workingCapitalRelease = annualRevenue * (collectionsDaysImprovement / 365);

  const hiringCost = hiringPause ? 0 : (PARAMS.plannedHires * PARAMS.salaryPerHeadPerYear) / 12;
  const supplierSaving = base.monthlySuppliers * discretionaryCutPct;

  const monthlyPayroll = base.monthlyPayroll + hiringCost;
  const monthlySuppliers = base.monthlySuppliers - supplierSaving;
  const monthlyBurn = monthlyPayroll + monthlySuppliers + base.monthlyDebtService - base.monthlyReceipts;

  const weeklyReceipts = base.monthlyReceipts * (12 / 52);
  const weeklySuppliers = monthlySuppliers * (12 / 52);
  const weeklyDebtService = base.monthlyDebtService * (12 / 52);
  const weeklyRelease = collectionsDaysImprovement > 0
    ? workingCapitalRelease / PARAMS.collectionsReleaseWeeks
    : 0;

  // Round each line to the precision it is displayed at, then derive the
  // closing balance from those rounded lines. A cash statement whose columns do
  // not add up on screen is the fastest way to lose a finance director.
  const weeks = [];
  let cash = base.openingCash;
  let breachWeek = null;

  for (let w = 1; w <= PARAMS.weeks; w++) {
    const opening = r0(cash);
    const receipts = r0(weeklyReceipts + (w <= PARAMS.collectionsReleaseWeeks ? weeklyRelease : 0));
    const payroll = r0(w % PARAMS.payrollClearsEveryNthWeek === 0 ? monthlyPayroll : 0);
    const suppliers = r0(weeklySuppliers);
    const debtService = r0(weeklyDebtService);

    cash = opening + receipts - payroll - suppliers - debtService;
    if (breachWeek === null && cash < PARAMS.minimumCash) breachWeek = w;

    weeks.push({
      week: w, opening, receipts, payroll, suppliers, debtService,
      closing: cash, belowMinimum: cash < PARAMS.minimumCash,
    });
  }

  const effectiveCash = base.openingCash + workingCapitalRelease;
  const runwayMonths = monthlyBurn <= 0 ? Infinity : effectiveCash / monthlyBurn;

  return {
    levers: { collectionsDaysImprovement, hiringPause, discretionaryCutPct },
    openingCash: base.openingCash,
    workingCapitalRelease: r0(workingCapitalRelease),
    monthlyBurn: r0(monthlyBurn),
    monthlyPayroll: r0(monthlyPayroll),
    monthlySuppliers: r0(monthlySuppliers),
    runwayMonths: runwayMonths === Infinity ? Infinity : r1(runwayMonths),
    weeks,
    closingCash: r0(cash),
    minimumCash: PARAMS.minimumCash,
    breachWeek,
    headcount: base.headcount + (hiringPause ? 0 : PARAMS.plannedHires),
  };
}

/**
 * Runway on three bases, and the month cash passes the board floor on each.
 *
 * Reported runway is cash ÷ current burn. It is the figure on every screen and
 * it is not wrong — it is just answering a narrower question than the one the
 * board asked. These three make the difference explicit rather than leaving a
 * partner to notice it.
 */
export function runwayBases(base, plan) {
  const project = (startBurn, growth) => {
    let cash = base.openingCash;
    let burn = startBurn;
    let toFloor = null;
    for (let month = 1; month <= 120; month++) {
      cash -= burn;
      if (toFloor === null && cash < PARAMS.minimumCash) toFloor = month;
      if (cash <= 0) return { months: month - 1 + 1, monthsToFloor: toFloor, exhausted: month };
      burn *= 1 + growth;
    }
    return { months: Infinity, monthsToFloor: toFloor, exhausted: null };
  };

  const flat = project(base.reportedBurn, 0);
  const withPlan = project(plan.monthlyBurn, 0);
  const onTrend = project(plan.monthlyBurn, base.burnTrend.monthlyGrowth);

  return [
    { id: "reported", label: "As reported", months: base.reportedRunway, monthsToFloor: flat.monthsToFloor,
      basis: `Cash ${r0(base.openingCash)} ÷ current burn ${r0(base.reportedBurn)}, held flat` },
    { id: "plan", label: "Including approved hires", months: plan.runwayMonths, monthsToFloor: withPlan.monthsToFloor,
      basis: `Burn ${r0(plan.monthlyBurn)} once the ${PARAMS.plannedHires} approved hires are in payroll, held flat` },
    { id: "trend", label: "Burn continuing its trend", months: onTrend.exhausted ?? Infinity, monthsToFloor: onTrend.monthsToFloor,
      basis: `Burn compounding at ${(base.burnTrend.monthlyGrowth * 100).toFixed(1)}% a month, the rate observed over ${base.burnTrend.months} months` },
  ];
}

/** The management cases the specification asks to be shown side by side. */
export function buildCashCases(opts = {}) {
  const base = cashBaseline(opts);
  const run = (levers) => buildCashScenario(levers, { ...opts, baseline: base });

  const cases = [
    { id: "trajectory", name: `Current trajectory, including the ${PARAMS.plannedHires} approved hires`, levers: {} },
    { id: "collections", name: `Collections plan — ${PARAMS.dsoDays - PARAMS.dsoPlanDays} days out of DSO`, levers: { collectionsDaysImprovement: PARAMS.dsoDays - PARAMS.dsoPlanDays } },
    { id: "pause", name: "Collections plus hiring pause", levers: { collectionsDaysImprovement: PARAMS.dsoDays - PARAMS.dsoPlanDays, hiringPause: true } },
    { id: "full", name: "Collections, hiring pause and a 20% supplier cut", levers: { collectionsDaysImprovement: PARAMS.dsoDays - PARAMS.dsoPlanDays, hiringPause: true, discretionaryCutPct: 0.20 } },
  ].map((c) => ({ ...c, result: run(c.levers) }));

  return { base, cases };
}

export function buildCash(opts = {}) {
  const { base, cases } = buildCashCases(opts);
  const { fin, company: co, currency: ccy } = base;
  const money = (v) => fmtMoney(v, ccy, { k: true });

  const trajectory = cases[0].result;
  const remedy = cases[2].result;
  const bases = runwayBases(base, trajectory);
  const reported = bases[0], onTrend = bases[2];

  // The number that makes the scenario. Reported runway is calculated on
  // trailing burn; the approved hires have not hit payroll yet. Stating the
  // difference explicitly is what separates a signal from two screens that
  // appear to contradict each other.
  const forwardVsReported = {
    reportedMonths: fin.runway,
    forwardMonths: trajectory.runwayMonths,
    differenceMonths: r1(trajectory.runwayMonths - fin.runway),
    note:
      `Reported runway of ${fin.runway} months is calculated on trailing burn. Funding the ` +
      `${PARAMS.plannedHires} hires already approved takes it to ${trajectory.runwayMonths} months.`,
  };

  const firstBreach = trajectory.weeks.find((w) => w.belowMinimum) ?? null;
  const t = base.burnTrend;

  const insight = makeInsight({
    id: "cash-position-nusantara",
    raisedOn: fin.asOf,
    type: "risk",
    companyId: co.id,
    companyName: co.name,
    headline:
      `Reported runway of ${fin.runway} months assumes burn stops rising — it has ${t.multiple >= 1.8 ? "doubled" : `risen ${t.multiple}x`} in ${t.months} months`,
    whatHappened:
      `${co.name} reports ${fin.runway} months of runway and the last board pack described the company as ` +
      `funded. That figure is cash divided by this month's burn. Over the ${t.months} months on file burn has ` +
      `gone from ${money(t.from)} to ${money(t.to)} a month while cash fell from ${money(t.cashFrom)} to ` +
      `${money(t.cashTo)} — so the divisor has been moving the whole time.`,
    whyItMatters:
      `Carrying that trend forward at the observed ${(t.monthlyGrowth * 100).toFixed(1)}% a month, cash reaches ` +
      `the ${money(PARAMS.minimumCash)} board floor in month ${onTrend.monthsToFloor ?? "—"} rather than month ` +
      `${reported.monthsToFloor ?? "—"}. The ${PARAMS.plannedHires} approved hires are not yet in payroll and ` +
      `DSO has widened to ${PARAMS.dsoDays} days against a plan of ${PARAMS.dsoPlanDays}. Taking ` +
      `${PARAMS.dsoDays - PARAMS.dsoPlanDays} days out of DSO and pausing the hires returns the flat-burn ` +
      `figure to ${remedy.runwayMonths} months, but does not by itself stop the trend.`,
    evidence: [
      evidence("Cash on hand", money(base.openingCash), SOURCES.banking, fin.asOf),
      evidence("Reported net burn", `${money(base.reportedBurn)} per month`, SOURCES.banking, fin.asOf,
        { definition: "Trailing monthly cash outflow less receipts" }),
      evidence("Reported runway", `${fin.runway} months`, SOURCES.alba, fin.asOf,
        { definition: "Cash ÷ current monthly burn" }),
      evidence("Forward runway on the approved plan", `${trajectory.runwayMonths} months`, SOURCES.alba, fin.asOf,
        { definition: `Includes ${PARAMS.plannedHires} approved hires at ${PARAMS.salaryPerHeadPerYear}k fully loaded` }),
      evidence("Net burn trend", `${money(t.from)} to ${money(t.to)} per month over ${t.months} months`, SOURCES.banking, fin.asOf,
        { definition: `Compound growth of ${(t.monthlyGrowth * 100).toFixed(1)}% a month, measured from the ledger` }),
      evidence("Months to the board cash floor", `${onTrend.monthsToFloor ?? "beyond 10 years"} on trend against ${reported.monthsToFloor ?? "beyond 10 years"} on flat burn`, SOURCES.alba, fin.asOf,
        { floor: PARAMS.minimumCash }),
      evidence("Days sales outstanding", `${PARAMS.dsoDays} days against a plan of ${PARAMS.dsoPlanDays}`, SOURCES.accounting, fin.asOf),
      evidence("Overdue receivables", money(fin.cash.overdueTotal), SOURCES.accounting, fin.asOf,
        { accounts: fin.cash.debtors.length }),
      evidence("Headcount", `${base.headcount} in seat against a plan of ${base.planHeadcount}`, SOURCES.hris, fin.asOf),
    ],
    impact: {
      measure: "Months to the board cash floor, on trend against as reported",
      value: (onTrend.monthsToFloor ?? 0) - (reported.monthsToFloor ?? 0),
      currency: "months",
      direction: "downside",
      horizon: "To the cash floor",
    },
    confidence: CONFIDENCE.HIGH,
    methodology:
      "The weekly model is anchored to reported net burn rather than built bottom-up: total outflow is fixed by " +
      "the identity receipts − outflow = reported burn, payroll is calculated from headcount, and supplier spend " +
      "is the residual. Each weekly line is rounded before the closing balance is derived from it, so the " +
      "statement adds up as displayed. A DSO improvement is modelled as a one-off working capital release over " +
      `${PARAMS.collectionsReleaseWeeks} weeks, not as a permanent uplift in receipts. The trend basis compounds ` +
      "burn at the rate measured across the ledger rather than at a chosen one; no floor breach is asserted " +
      "inside the thirteen-week view, because on this company's figures there is not one.",
    actions: [
      { action: `Escalate ${money(fin.cash.overdueTotal)} of overdue receivables across ${fin.cash.debtors.length} accounts`,
        owner: "Chief Financial Officer", due: "12 Jun 2026",
        rationale: `${PARAMS.dsoDays - PARAMS.dsoPlanDays} days of DSO is ${money(cases[1].result.workingCapitalRelease)} of working capital.` },
      { action: `Pause the ${PARAMS.plannedHires} approved hires pending the collections result`,
        owner: "Chief Executive Officer", due: "12 Jun 2026",
        rationale: `Worth ${r1(remedy.runwayMonths - cases[1].result.runwayMonths)} months of runway on its own.` },
      { action: "Re-present the cash position to the board on all three bases, not the trailing one alone",
        owner: "Chief Financial Officer", due: "30 Jun 2026",
        rationale: `Flat burn says month ${reported.monthsToFloor ?? "—"}; the observed trend says month ${onTrend.monthsToFloor ?? "—"}.` },
      { action: `Establish why burn has risen ${t.multiple}x in ${t.months} months and what stops it`,
        owner: "Chief Financial Officer", due: "19 Jun 2026",
        rationale: "Every runway figure on every screen assumes it stops. Nothing in the data says it has." },
      { action: `Agree a funding decision date while cash is above the ${money(PARAMS.minimumCash)} floor`,
        owner: "Chief Executive Officer", due: "30 Jun 2026",
        rationale: "A decision taken under the floor is taken from a materially weaker position." },
    ],
    drillDown: { weeks: trajectory.weeks, composition: base.composition, cases, bases },
  });

  return {
    company: co, fin, currency: ccy,
    baseline: base, cases, trajectory, remedy, bases,
    forwardVsReported, firstBreach, burnTrend: t,
    insight,
  };
}
