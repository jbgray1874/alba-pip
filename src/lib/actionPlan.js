// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Commercial action plan
//  ----------------------------------------------------------------------------
//  buildExpansion() finds the accounts. It stops there, and a list of accounts
//  is not a campaign: nobody owns it, nothing is dated, and at the next board
//  meeting the honest answer to "what happened to the cross-sell cohort?" is
//  that it was noted.
//
//  This file turns that cohort into work. Every account gets a proposition, a
//  named owner, a stage and a date, and every one of those is derived rather
//  than typed:
//
//    · the proposition comes from what the account already owns and from the
//      factor that scored highest in its own breakdown
//    · the stage comes from the score, banded off PARAMS.qualifyingScore
//    · the owner comes from the segment, because the sales pods are organised
//      that way
//    · the date comes from the ledger's as-of month — accounts are worked in
//      priority order a week apart, and pulled forward when the renewal is
//      close enough to force it
//
//  Nothing here reads the wall clock. A rehearsal on Tuesday and the meeting on
//  Thursday produce the same dates, which is the whole point of anchoring to
//  the as-of month instead of to today.
//
//  The named people are presentation. They are declared here, once, rather than
//  spelled into the view.
// ════════════════════════════════════════════════════════════════════════════

import { buildExpansion, PARAMS, PRODUCTS } from "./scenarioExpansion.js";
import { fundById } from "./companies.js";
import { trackedActions } from "./actionTracker.js";
import { SOURCES } from "./kpiDefinitions.js";
import { fmtMoney } from "./fx.js";

/** How many of the qualified accounts the campaign takes to market first. */
export const TOP_N = 8;

/**
 * The campaign calendar, in days from the first of the ledger's as-of month.
 * Every date on the screen is one of these plus an account's own renewal
 * timing — there is no other source of a date in this file.
 */
export const CADENCE = {
  approvalDays: 35,      // five weeks to approve
  mobiliseDays: 7,       // no account is approached inside a week of approval
  outreachLagDays: 14,   // the sequence opens a fortnight after approval
  sequenceDays: 7,       // one account a week, in priority order
  discoveryDays: 30,     // discovery closes a month after the last first action
  reviewDays: 28,        // pipeline review a month after that
};

/**
 * Stages, banded off the qualifying score rather than set by hand, with the
 * lead time each one needs ahead of a renewal. A discovery-stage account has to
 * be opened earlier than one that is ready for an executive conversation.
 */
export const STAGES = {
  outreach:  { id: "outreach",  label: "Executive outreach", tone: "green",
               floor: PARAMS.qualifyingScore + 16, leadDays: 45 },
  plan:      { id: "plan",      label: "Account plan",       tone: "blue",
               floor: PARAMS.qualifyingScore + 6,  leadDays: 60 },
  discovery: { id: "discovery", label: "Discovery",          tone: "purple",
               floor: 0,                            leadDays: 75 },
};

export function stageFor(score) {
  if (score >= STAGES.outreach.floor) return STAGES.outreach;
  if (score >= STAGES.plan.floor) return STAGES.plan;
  return STAGES.discovery;
}

/**
 * The cast. Presentation, not data — but declared once here so the view never
 * carries a person's name, and so the segment-to-pod mapping is inspectable.
 */
export const OWNERS = [
  { id: "raman",  name: "Priya Raman",  initials: "PR", role: "VP Sales, Middle East",       tone: "gold",   segments: ["Banking", "Lending"] },
  { id: "tan",    name: "Wei Han Tan",  initials: "WT", role: "VP Sales, Southeast Asia",    tone: "blue",   segments: ["Marketplace"] },
  { id: "haddad", name: "Layla Haddad", initials: "LH", role: "Head of Customer Success",    tone: "green",  segments: ["Retail"] },
  { id: "ellery", name: "Marcus Ellery", initials: "ME", role: "Head of Solutions Engineering", tone: "purple", segments: ["Logistics"] },
];

export const SPONSOR = { name: "Nadia Rahim", initials: "NR", role: "Chief Revenue Officer", tone: "gold" };
export const INVESTMENT_OWNER = { name: "Iain Fraser", initials: "IF", role: "Partner", tone: "gold" };

export function ownerForSegment(segment) {
  return OWNERS.find((o) => o.segments.includes(segment)) ?? OWNERS[0];
}

// ── Dates ───────────────────────────────────────────────────────────────────

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Days from the first of the as-of month — the same anchor the cohort uses. */
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

/** `2026-06-19` → `19 Jun`, for a metric numeral and the timeline nodes. */
export function fmtDayMonth(iso) {
  const [, m, d] = String(iso).split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTH_ABBR[m - 1]}`;
}

/** `2026-05` → `May 2026`, for the meta line. */
export function fmtMonth(month) {
  const [y, m] = String(month).split("-").map(Number);
  return `${MONTH_ABBR[m - 1]} ${y}`;
}

// ── The proposition ─────────────────────────────────────────────────────────

/**
 * What is actually being sold, and the single strongest reason from the
 * account's own scoring breakdown. Both read out of buildExpansion().
 */
function propositionFor(account) {
  const ownsTreasury = account.products.includes(PRODUCTS.C);
  const headline = ownsTreasury
    ? `${PRODUCTS.B} beside ${PRODUCTS.C}`
    : `${PRODUCTS.B} attached to ${PRODUCTS.A}`;
  const strongest = [...account.breakdown].sort((a, b) => b.points - a.points)[0];
  return {
    headline,
    basis: `${account.segment} · ${strongest.basis}`,
    strongestFactor: strongest.factor,
    strongestPoints: strongest.points,
    of: strongest.of,
  };
}

// ── The plan ────────────────────────────────────────────────────────────────

/**
 * @param {object} opts passed through to buildExpansion — reporting currency
 * @returns the campaign, its milestones, its accountability and its arithmetic
 */
export function buildActionPlan(opts = {}) {
  const source = opts.expansion ?? buildExpansion(opts);
  const { company, fin, currency, customers, qualified, totals } = source;
  const asOf = fin.asOf;
  const money = (v) => fmtMoney(v, currency, { k: true });

  const approvalDay = CADENCE.approvalDays;
  const floorDay = approvalDay + CADENCE.mobiliseDays;
  const openDay = approvalDay + CADENCE.outreachLagDays;

  const campaign = qualified.slice(0, TOP_N).map((account, i) => {
    const stage = stageFor(account.score);
    const owner = ownerForSegment(account.segment);

    // Worked in priority order a week apart, unless the renewal is near enough
    // to pull the account forward. Never inside the mobilisation week.
    const sequencedDay = openDay + i * CADENCE.sequenceDays;
    const renewalDrivenDay = Math.max(floorDay, account.renewalInDays - stage.leadDays);
    const actionDay = Math.min(sequencedDay, renewalDrivenDay);

    return {
      rank: i + 1,
      account: account.account,
      segment: account.segment,
      owner,
      stage,
      score: account.score,
      products: account.products,
      proposition: propositionFor(account),
      actionDay,
      actionDate: addDays(asOf, actionDay),
      pulledForward: renewalDrivenDay < sequencedDay,
      renewalDate: account.renewalDate,
      renewalInDays: account.renewalInDays,
      conversionProbability: account.conversionProbability,
      grossOpportunity: account.grossOpportunity,
      expectedArr: account.expectedValue,
      currentArr: account.arr,
    };
  });

  // ── Arithmetic. Everything below is a sum of the rows above. ──
  const expected = campaign.reduce((t, c) => t + c.expectedArr, 0);
  const gross = campaign.reduce((t, c) => t + c.grossOpportunity, 0);
  const expectedLow = expected * (1 - PARAMS.sensitivity);
  const expectedHigh = expected * (1 + PARAMS.sensitivity);
  const conversionRate = gross === 0 ? 0 : expected / gross;
  const expectedWins = Math.round(campaign.reduce((t, c) => t + c.conversionProbability, 0));
  const shareOfCohort = totals.expected === 0 ? 0 : expected / totals.expected;

  const byStage = Object.values(STAGES).map((s) => ({
    ...s,
    count: campaign.filter((c) => c.stage.id === s.id).length,
    expectedArr: campaign.filter((c) => c.stage.id === s.id).reduce((t, c) => t + c.expectedArr, 0),
  }));

  // The owner carrying the most expected ARR runs the campaign. Derived, so it
  // moves if the cohort moves.
  const byOwner = OWNERS.map((o) => ({
    ...o,
    accounts: campaign.filter((c) => c.owner.id === o.id).length,
    expectedArr: campaign.filter((c) => c.owner.id === o.id).reduce((t, c) => t + c.expectedArr, 0),
  })).filter((o) => o.accounts > 0).sort((a, b) => b.expectedArr - a.expectedArr);
  const campaignOwner = byOwner[0] ?? OWNERS[0];

  // ── Milestones. Two are cadence, two are consequences of the rows. ──
  const days = campaign.map((c) => c.actionDay);
  const firstOutreachDay = days.length ? Math.min(...days) : openDay;
  const lastActionDay = days.length ? Math.max(...days) : openDay;
  const discoveryDay = lastActionDay + CADENCE.discoveryDays;
  const reviewDay = discoveryDay + CADENCE.reviewDays;
  const firstFortnightDay = approvalDay + 14;
  const firstWave = campaign.filter((c) => c.actionDay <= firstFortnightDay);

  const milestones = [
    { id: "approval", label: "Approval", day: approvalDay, date: addDays(asOf, approvalDay),
      done: true, note: "Investment committee sign-off" },
    { id: "outreach", label: "First outreach", day: firstOutreachDay, date: addDays(asOf, firstOutreachDay),
      done: false, note: `${firstWave.length} accounts opened in the first fortnight` },
    { id: "discovery", label: "Discovery complete", day: discoveryDay, date: addDays(asOf, discoveryDay),
      done: false, note: `${byStage.find((s) => s.id === "discovery").count} discovery accounts qualified` },
    { id: "review", label: "Pipeline review", day: reviewDay, date: addDays(asOf, reviewDay),
      done: false, note: `${money(expected)} weighted pipeline reviewed` },
  ];

  const reviewsToReview = Math.max(1, Math.round((reviewDay - approvalDay) / 14));

  // ── The playbook, written from the figures rather than beside them. ──
  const playbook = [
    { step: "01", title: "Qualify",
      detail: `${qualified.length} of ${customers.length} customers score ${PARAMS.qualifyingScore} or above and do not own the ${PRODUCTS.B}. The top ${campaign.length} carry ${Math.round(shareOfCohort * 100)}% of the cohort's expected value.` },
    { step: "02", title: "Assign",
      detail: `Each account goes to the pod that owns its segment. ${byOwner.length} named owners across ${campaign.length} accounts, ${campaignOwner.name} carrying ${money(campaignOwner.expectedArr)}.` },
    { step: "03", title: "Approach",
      detail: `${byStage.find((s) => s.id === "outreach").count} accounts open with executive outreach; the remaining ${campaign.length - byStage.find((s) => s.id === "outreach").count} run account planning or discovery first.` },
    { step: "04", title: "Review",
      detail: `Fortnightly against expected ARR, to a pipeline review on ${fmtDate(addDays(asOf, reviewDay))}, ${Math.round((reviewDay - approvalDay) / 7)} weeks after approval.` },
  ];

  const fund = fundById(company.fund);

  const accountability = [
    { label: "Executive sponsor", name: SPONSOR.name, detail: `${SPONSOR.role}, ${company.name}`, tone: SPONSOR.tone, initials: SPONSOR.initials },
    { label: "Campaign owner", name: campaignOwner.name, detail: `${campaignOwner.role} · ${campaignOwner.accounts} accounts, ${money(campaignOwner.expectedArr)}`, tone: campaignOwner.tone, initials: campaignOwner.initials },
    { label: "Investment owner", name: INVESTMENT_OWNER.name, detail: `${INVESTMENT_OWNER.role}, ${fund ? fund.name : "Alba"}`, tone: INVESTMENT_OWNER.tone, initials: INVESTMENT_OWNER.initials },
    { label: "Review cadence", name: "Fortnightly", detail: `${reviewsToReview} reviews to ${fmtDate(addDays(asOf, reviewDay))}`, tone: "gold", initials: "··" },
  ];

  // The caveat that keeps the number honest, written from the assumptions.
  const advisory =
    `Expected ARR is each account's current ARR times a ${Math.round(PARAMS.attachRate * 100)}% attach rate times the ` +
    `conversion probability implied by its own score. Both assumptions are visible and neither is a commitment. ` +
    `The range applies ±${Math.round(PARAMS.sensitivity * 100)}% to conversion.`;

  // Where this plan already exists in the tracker, so the provenance line is a
  // statement of fact rather than a promise.
  const tracked = trackedActions(opts).find((a) => a.company === company.id && a.status !== "done") ?? null;

  return {
    company, fund, fin, asOf, currency, money,
    product: { base: PRODUCTS.A, target: PRODUCTS.B, adjacent: PRODUCTS.C },
    assumptions: {
      attachRate: PARAMS.attachRate,
      sensitivity: PARAMS.sensitivity,
      qualifyingScore: PARAMS.qualifyingScore,
    },
    campaign, byStage, byOwner, campaignOwner,
    milestones, playbook, accountability, advisory, tracked,
    cohort: { qualified: qualified.length, customers: customers.length, expected: totals.expected, gross: totals.gross },
    totals: {
      targetAccounts: campaign.length,
      expected, gross, expectedLow, expectedHigh,
      conversionRate, expectedWins, shareOfCohort,
      firstActionDate: addDays(asOf, firstOutreachDay),
      firstWave: firstWave.length,
      pulledForward: campaign.filter((c) => c.pulledForward).length,
    },
    sources: [SOURCES.crm, SOURCES.billing, SOURCES.alba],
  };
}
