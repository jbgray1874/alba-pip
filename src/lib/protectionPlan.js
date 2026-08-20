// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Revenue protection plan
//  ----------------------------------------------------------------------------
//  buildRevenueMiss() proves a forecast gap and attributes it to four drivers.
//  It stops there, and a proven gap is not a plan: nobody owns it, nothing is
//  dated, and the honest answer at the board meeting is that the number was
//  noted and the quarter was defended anyway.
//
//  This file turns the gap into work that can be approved. Each driver gets one
//  intervention, and each intervention carries an owner, a date and an expected
//  impact in money. The three headline figures are one figure:
//
//      forecast risk  −  recovery target  =  residual gap
//
//  The recovery target is nothing but the sum of the impacts in the table, and
//  the residual is the subtraction. None of the three is chosen. Move an
//  assumption and all three move together, which is the only way a board paper
//  survives someone adding the column up.
//
//  Every impact is a share of its own driver, and every share is derived from
//  the evidence that produced the driver in the first place:
//
//    · lower conversion   — only deals already at proposal or negotiation can be
//                           moved inside the quarter, so the deal book decides
//                           the share, not an opinion
//    · re-dated deals     — a deal pushed one month can be pulled back; one
//                           pushed three is a third as likely to be
//    · customer churn     — a retention review can only reach renewals that fall
//                           after it, so the share is days left in the quarter
//    · sales capacity     — interim cover carries some of the unfilled quota
//                           territories and no more
//
//  Dates are days from the first of the ledger's as-of month. Nothing here reads
//  the wall clock, so the plan rehearsed on Tuesday is the plan presented on
//  Thursday. The offsets chosen below reproduce the dates already carried by the
//  investigation and by the action tracker, so the three screens cannot disagree
//  about when a thing is due.
//
//  The named people are presentation. They are declared here, once, so no view
//  ever carries a person's name.
// ════════════════════════════════════════════════════════════════════════════

import { buildRevenueMiss, PARAMS as MISS } from "./scenarioRevenueMiss.js";
import { fundById } from "./companies.js";
import { trackedActions } from "./actionTracker.js";
import { SOURCES } from "./kpiDefinitions.js";
import { fmtMoney } from "./fx.js";

/** The recovery assumptions, stated rather than buried. */
export const PARAMS = {
  /** Stages a deal-by-deal review can still move before the quarter closes. */
  movableStages: ["Negotiation", "Proposal"],
  /** Quota territories interim capacity can cover of those left unfilled. */
  interimCoverRoles: 2,
  /** How the plan is governed once approved. */
  reviewEveryDays: 14,
  approvalDays: 21,
};

/**
 * The interventions, in the order they are worked.
 *
 * `dueDay` is days from the first of the as-of month. 42, 49, 56, 35 and 60
 * reproduce the due dates already on the investigation and on the two tracked
 * actions for this company; 63 is the one new action, a week behind the last of
 * the reused ones.
 *
 * `reuse` names the action already written on the scenario. Where it matches,
 * the wording, the owner and the rationale come from there rather than from a
 * second copy that is free to drift.
 */
const INTERVENTIONS = [
  {
    id: "conversion", dueDay: 42, matches: "conversion",
    reuse: "Deal-by-deal review",
    action: "Deal-by-deal review of the largest open opportunities",
    ownerRole: "Chief Revenue Officer",
  },
  {
    id: "slip", dueDay: 49, matches: "later quarter",
    reuse: "Recovery plan for the two re-dated",
    action: "Recovery plan for the re-dated enterprise opportunities",
    ownerRole: "Chief Executive Officer",
  },
  {
    id: "churn", dueDay: 56, matches: "churn",
    reuse: "Retention review",
    action: "Retention review of accounts renewing within 90 days",
    ownerRole: "VP Customer Success",
  },
  {
    id: "capacity", dueDay: 63, matches: "capacity",
    reuse: null,
    action: "Interim cover for the unfilled quota territories",
    ownerRole: "Chief People Officer",
  },
];

/**
 * Control actions. They protect the revised case rather than add to it, so they
 * carry no money — a plan that claims a recovery for every line of governance
 * is a plan whose total nobody should believe.
 */
const CONTROLS = [
  {
    id: "coverage", dueDay: 35,
    reuse: "Weekly pipeline inspection",
    action: "Weekly pipeline inspection until coverage recovers",
    ownerRole: "Chief Revenue Officer",
  },
  {
    id: "reforecast", dueDay: 60,
    reuse: "Re-forecast the quarter",
    action: "Re-forecast the quarter and brief the board",
    ownerRole: "Chief Financial Officer",
  },
];

/** The cast. Presentation, declared once, keyed by the role the model names. */
export const PEOPLE = {
  "Chief Executive Officer": { name: "Serena Koh", initials: "SK", tone: "gold" },
  "Chief Revenue Officer": { name: "Daniel Mercer", initials: "DM", tone: "blue" },
  "Chief Financial Officer": { name: "Priya Nair", initials: "PN", tone: "teal" },
  "VP Customer Success": { name: "Aisha Bello", initials: "AB", tone: "green" },
  "Chief People Officer": { name: "Jonas Lindqvist", initials: "JL", tone: "purple" },
};

export const INVESTMENT_OWNER = { name: "Catriona Wells", initials: "CW", role: "Partner", tone: "gold" };

/** How a tracked status reads on a chip. Untracked work is proposed, not open. */
const STATUS = {
  done: { id: "done", label: "Complete", tone: "green" },
  in_progress: { id: "in_progress", label: "In progress", tone: "blue" },
  open: { id: "open", label: "Open", tone: "gold" },
  proposed: { id: "proposed", label: "Proposed", tone: "muted" },
};

// ── Dates, anchored to the ledger rather than to the clock ──────────────────

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MS_PER_DAY = 86400000;

/** Days from the first of the as-of month, as an ISO date. */
export function addDays(asOfMonth, days) {
  const d = new Date(`${asOfMonth}-01T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** `2026-06-19` → `19 Jun 2026`. */
export function fmtDate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTH_ABBR[m - 1]} ${y}`;
}

/** `2026-06-19` → `19 Jun`, for a metric numeral. */
export function fmtDayMonth(iso) {
  const [, m, d] = String(iso).split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTH_ABBR[m - 1]}`;
}

/** `2026-05` → `May 2026`, for the meta line. */
export function fmtMonth(month) {
  const [y, m] = String(month).split("-").map(Number);
  return `${MONTH_ABBR[m - 1]} ${y}`;
}

/**
 * The quarter the forecast is about: the three months after the ledger closes,
 * measured in days from the same anchor every due date uses.
 */
export function quarterWindow(asOfMonth) {
  const anchor = new Date(`${asOfMonth}-01T00:00:00Z`);
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();
  const start = Date.UTC(y, m + 1, 1);
  const end = Date.UTC(y, m + 4, 0);          // last day of the third month
  const startDay = Math.round((start - anchor.getTime()) / MS_PER_DAY);
  const endDay = Math.round((end - anchor.getTime()) / MS_PER_DAY);
  return {
    startDay, endDay,
    days: endDay - startDay + 1,
    startDate: new Date(start).toISOString().slice(0, 10),
    endDate: new Date(end).toISOString().slice(0, 10),
  };
}

/** `Nov 2026` → a month index that can be subtracted. */
function monthIndex(text) {
  const [name, year] = String(text).trim().split(/\s+/);
  const m = MONTH_ABBR.indexOf(name.slice(0, 3));
  return m < 0 ? null : Number(year) * 12 + m;
}

/** Months a re-dated opportunity moved by. */
export function monthsSlipped(deal) {
  const from = monthIndex(deal.wasDue);
  const to = monthIndex(deal.nowDue);
  if (from == null || to == null) return 1;
  return Math.max(1, to - from);
}

// ── The plan ────────────────────────────────────────────────────────────────

/**
 * @param {object} opts passed through to buildRevenueMiss — reporting currency
 * @returns the actions, the recovery path and the arithmetic joining them
 */
export function buildProtectionPlan(opts = {}) {
  const source = opts.scenario ?? buildRevenueMiss(opts);
  const { company, fin, currency, forecast, bridge, deals, insight } = source;
  const asOf = fin.asOf;
  const money = (v) => fmtMoney(v, currency, { k: true });
  const pct = (v) => `${Math.round(v * 100)}%`;

  const quarter = quarterWindow(asOf);
  const driverFor = (needle) => bridge.find((b) => b.driver.toLowerCase().includes(needle)) ?? { driver: needle, value: 0 };
  const insightAction = (needle) => (needle ? insight.actions.find((a) => a.action.startsWith(needle)) : null);

  // ── The addressable share of each driver, derived from its own evidence ──

  // Conversion. Only deals already at proposal or negotiation can be moved
  // before the quarter closes; the deal book decides how much of the shortfall
  // that is.
  const quarterPipeline = deals.reduce((t, d) => t + d.quarterRevenue, 0);
  const movableDeals = deals.filter((d) => PARAMS.movableStages.includes(d.stage));
  const movablePipeline = movableDeals.reduce((t, d) => t + d.quarterRevenue, 0);
  const conversionShare = quarterPipeline === 0 ? 0 : movablePipeline / quarterPipeline;

  // Re-dated deals. A deal moved one month can be pulled back into the quarter;
  // one moved three months is a third as likely to be.
  const slipped = MISS.slippedDeals.map((d) => {
    const months = monthsSlipped(d);
    return { ...d, months, share: 1 / months, recoverableAcv: d.acv / months };
  });
  const slippedAcv = slipped.reduce((t, d) => t + d.acv, 0);
  const recoverableAcv = slipped.reduce((t, d) => t + d.recoverableAcv, 0);
  const slipShare = slippedAcv === 0 ? 0 : recoverableAcv / slippedAcv;

  // Churn. A retention review can only reach renewals that fall after it, so
  // the share is the part of the quarter still ahead of the review date.
  const churnDueDay = INTERVENTIONS.find((i) => i.id === "churn").dueDay;
  const churnDaysReachable = Math.max(0, Math.min(quarter.days, quarter.endDay - churnDueDay + 1));
  const churnShare = quarter.days === 0 ? 0 : churnDaysReachable / quarter.days;

  // Capacity. Interim cover carries some of the unfilled quota territories.
  const unfilledRoles = Math.max(0, MISS.salesHires.plan - MISS.salesHires.inSeat);
  const coveredRoles = Math.min(PARAMS.interimCoverRoles, unfilledRoles);
  const capacityShare = unfilledRoles === 0 ? 0 : coveredRoles / unfilledRoles;

  const SHARE = {
    conversion: {
      share: conversionShare,
      basis: `${money(movablePipeline)} of the ${money(quarterPipeline)} in-quarter pipeline sits at proposal or ` +
             `negotiation across ${movableDeals.length} of ${deals.length} opportunities. Nothing earlier than ` +
             `proposal closes inside the quarter, so nothing earlier is claimed.`,
    },
    slip: {
      share: slipShare,
      basis: `${money(recoverableAcv)} of the ${money(slippedAcv)} re-dated ACV is reachable — ` +
             slipped.map((d) => `${d.account} moved ${d.months} month${d.months === 1 ? "" : "s"}`).join(", ") +
             `. A deal pushed one month can be pulled back into the quarter; one pushed three is a third as likely to be.`,
    },
    churn: {
      share: churnShare,
      basis: `The review lands on ${fmtDate(addDays(asOf, churnDueDay))} with ${churnDaysReachable} of the quarter's ` +
             `${quarter.days} days still to run. Renewals falling before it cannot be influenced by it.`,
    },
    capacity: {
      share: capacityShare,
      basis: `${coveredRoles} of the ${unfilledRoles} unfilled quota territories covered by interim capacity. ` +
             `Headcount is ${MISS.salesHires.inSeat} in seat against a plan of ${MISS.salesHires.plan}.`,
    },
  };

  // ── The rows. Impact is a share of the driver, and nothing else. ──

  const recovery = INTERVENTIONS.map((iv) => {
    const driver = driverFor(iv.matches);
    const reused = insightAction(iv.reuse);
    const { share, basis } = SHARE[iv.id];
    const person = PEOPLE[iv.ownerRole] ?? PEOPLE["Chief Revenue Officer"];
    return {
      id: iv.id,
      kind: "recovery",
      action: reused ? reused.action : iv.action,
      fromInsight: !!reused,
      rationale: reused ? reused.rationale : basis,
      driver: driver.driver,
      driverValue: Math.round(driver.value),
      share,
      impact: Math.round(driver.value * share),
      basis,
      workings: driver.workings ?? null,
      dueDay: iv.dueDay,
      dueDate: addDays(asOf, iv.dueDay),
      owner: { role: iv.ownerRole, ...person },
    };
  });

  const controls = CONTROLS.map((cv) => {
    const reused = insightAction(cv.reuse);
    const person = PEOPLE[cv.ownerRole] ?? PEOPLE["Chief Financial Officer"];
    return {
      id: cv.id,
      kind: "control",
      action: reused ? reused.action : cv.action,
      fromInsight: !!reused,
      rationale: reused ? reused.rationale : "",
      driver: null,
      driverValue: 0,
      share: 0,
      impact: 0,
      basis: "Protects the revised case rather than adding to it, so no recovery is claimed for it.",
      workings: null,
      dueDay: cv.dueDay,
      dueDate: addDays(asOf, cv.dueDay),
      owner: { role: cv.ownerRole, ...person },
    };
  });

  // ── The identity. Three figures, one subtraction. ──
  const plan = Math.round(forecast.planRevenue);
  const risk = Math.round(forecast.forecastGap);
  const currentForecast = plan - risk;
  const target = recovery.reduce((t, r) => t + r.impact, 0);
  const residual = risk - target;
  const revisedCase = plan - residual;          // identical to currentForecast + target

  const recoveredShare = risk === 0 ? 0 : target / risk;
  const residualShare = risk === 0 ? 0 : residual / risk;

  // ── Status, read from the tracker rather than asserted here ──
  const tracked = trackedActions(opts).filter((a) => a.company === company.id);
  const withStatus = [...recovery, ...controls].map((row) => {
    const match = tracked.find((a) => a.title === row.action) ?? null;
    return { ...row, tracked: match, status: match ? (STATUS[match.status] ?? STATUS.open) : STATUS.proposed };
  });

  // Priority is the ranking the money implies. Control actions rank below the
  // work that recovers something, which is also the order a partner reads them.
  const actions = withStatus
    .slice()
    .sort((a, b) => b.impact - a.impact || a.dueDay - b.dueDay)
    .map((row, i) => ({ ...row, priority: i + 1, shareOfTarget: target === 0 ? 0 : row.impact / target }));

  const recoveryRows = actions.filter((a) => a.kind === "recovery");
  const controlRows = actions.filter((a) => a.kind === "control");
  const largest = recoveryRows[0] ?? null;

  // ── Governance ──
  const board = actions.find((a) => a.id === "reforecast") ?? actions[actions.length - 1];
  const firstActionDay = Math.min(...actions.map((a) => a.dueDay));
  const nextReviewDay = PARAMS.approvalDays + PARAMS.reviewEveryDays;
  const nextReviewDate = addDays(asOf, nextReviewDay);
  const reviewsToBoard = Math.max(1, Math.round((board.dueDay - PARAMS.approvalDays) / PARAMS.reviewEveryDays));
  const dueByNextReview = actions.filter((a) => a.dueDay <= nextReviewDay).length;

  // The executive carrying the most money is accountable for the plan. Derived,
  // so it moves when the arithmetic moves.
  const byOwner = Object.entries(
    recoveryRows.reduce((acc, r) => {
      acc[r.owner.role] = (acc[r.owner.role] ?? 0) + r.impact;
      return acc;
    }, {}),
  )
    .map(([role, impact]) => ({ role, impact, ...(PEOPLE[role] ?? PEOPLE["Chief Revenue Officer"]) }))
    .sort((a, b) => b.impact - a.impact);
  const accountable = byOwner[0] ?? { role: "Chief Revenue Officer", impact: 0, ...PEOPLE["Chief Revenue Officer"] };

  const fund = fundById(company.fund);

  const accountability = [
    {
      label: "Accountable executive",
      name: accountable.name, initials: accountable.initials, tone: accountable.tone,
      detail: `${accountable.role}, ${company.name} · carries ${money(accountable.impact)} of the recovery target`,
    },
    {
      label: "Investment owner",
      name: INVESTMENT_OWNER.name, initials: INVESTMENT_OWNER.initials, tone: INVESTMENT_OWNER.tone,
      detail: `${INVESTMENT_OWNER.role}, ${fund ? fund.name : "Alba"}`,
    },
    {
      label: "Review cadence",
      name: "Fortnightly", initials: "··", tone: "gold",
      detail: `${reviewsToBoard} reviews from approval to the board re-forecast on ${fmtDate(board.dueDate)}`,
    },
    {
      label: "Next review",
      name: fmtDate(nextReviewDate), initials: "→", tone: "green",
      detail: `${dueByNextReview} of ${actions.length} actions fall due on or before it`,
    },
  ];

  // ── The paragraph, written from the figures rather than beside them ──
  const recommendation =
    `${recoveryRows.length} interventions carry money and ${controlRows.length} carry governance. The largest is ` +
    `${largest ? `${largest.owner.role.toLowerCase()} work on ${largest.driver.toLowerCase()} at ${money(largest.impact)}, ` +
      `${pct(largest.shareOfTarget)} of the recovery target` : "not yet quantified"}. ` +
    `Together they take ${money(risk)} of forecast risk down to ${money(residual)}, which is ${pct(residualShare)} of ` +
    `the risk and ${(residual / plan * 100).toFixed(1)}% of the ${money(plan)} plan. ` +
    `Alba's recommendation is to approve the plan and restate the quarter at ${money(revisedCase)} now, rather than ` +
    `defend ${money(plan)} to the board and restate it in ${Math.max(1, Math.round((quarter.endDay - board.dueDay) / 30))} months ` +
    `when the room has no options left.`;

  const advisory =
    `Each impact is a share of the driver it addresses, and each share is read from the evidence behind that driver. ` +
    `None is a commitment. The recovery target is the sum of the ${recoveryRows.length} impacts in the table above and ` +
    `the residual gap is ${money(risk)} less ${money(target)}, so the three figures cannot disagree.`;

  // ── The path, as the reference draws it ──
  const path = [
    { id: "current", label: "Current forecast", value: currentForecast, tone: "txt1",
      sub: `Plan less ${money(risk)} of quantified risk` },
    { id: "recovery", label: "Targeted recovery", value: target, tone: "green",
      sub: `Sum of ${recoveryRows.length} expected impacts` },
    { id: "revised", label: "Revised case", value: revisedCase, tone: "txt1",
      sub: `What the plan delivers if it holds` },
    { id: "residual", label: "Residual gap", value: residual, tone: "red",
      sub: `Short of plan, and not recoverable in-quarter` },
  ];
  const operators = ["+", "=", "−"];

  const ledger = recovery
    .slice()
    .sort((a, b) => b.driverValue - a.driverValue)
    .map((r) => ({
      driver: r.driver,
      gap: r.driverValue,
      recovered: r.impact,
      remaining: r.driverValue - r.impact,
      share: r.share,
      basis: r.basis,
    }));

  const sourceLabels = [...new Set(insight.evidence.map((e) => e.source?.label).filter(Boolean))];

  return {
    company, fund, fin, asOf, currency, money, quarter,
    scenario: source,
    actions, recoveryRows, controlRows, ledger, path, operators,
    totals: {
      plan, risk, target, residual, currentForecast, revisedCase,
      recoveredShare, residualShare,
      riskShareOfPlan: plan === 0 ? 0 : risk / plan,
      residualShareOfPlan: plan === 0 ? 0 : residual / plan,
      drivers: bridge.length,
      firstActionDate: addDays(asOf, firstActionDay),
      nextReviewDate,
      boardDate: board.dueDate,
      reviewsToBoard,
      dueByNextReview,
      trackedCount: actions.filter((a) => a.tracked).length,
      reusedCount: actions.filter((a) => a.fromInsight).length,
    },
    accountability, accountable, recommendation, advisory,
    evidenceCount: insight.evidence.length,
    sourceLabels,
    sources: [SOURCES.crm, SOURCES.billing, SOURCES.accounting, SOURCES.alba],
  };
}
