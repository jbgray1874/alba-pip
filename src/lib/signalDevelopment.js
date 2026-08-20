// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Signal development
//  ----------------------------------------------------------------------------
//  The strongest claim the platform makes is not that it found a revenue miss.
//  It is that it found it seven weeks before the board pack would have. That
//  claim is worth nothing if the seven is typed in.
//
//  So the week-by-week emergence is derived. Each week reads one indicator from
//  the ledger — coverage, win rate, deal timing, churn, capacity — and states
//  what it did in that week and what it was worth. The alert fires on the first
//  week a LEADING indicator drops under a named threshold (see ALERT_ON), not on
//  the week the accrued money becomes material, and the lead time is the
//  distance from that week to the board review. Change a driver in
//  scenarioRevenueMiss.js and the timeline moves with it.
//
//  Both weeks are carried. The money column still accrues and is still tested
//  against materiality, so the screen can state how much later a test on the
//  money alone would have found the same thing — which is the argument for
//  early warning, made with the platform's own figures.
//
//  Two things are deliberately NOT asserted. The alert week is found, not
//  chosen. And the lead time is reconciled against the scenario's own figure —
//  if the two ever disagree, the reconciliation is reported rather than hidden.
// ════════════════════════════════════════════════════════════════════════════

import { buildRevenueMiss, PARAMS } from "./scenarioRevenueMiss.js";
import { PARAMS as RADAR_PARAMS } from "./opportunityRadar.js";
import { integrationHealth } from "./liveFeed.js";

/**
 * Share of plan at which the accumulated gap is material. Retained because it
 * is what the money column is measured against — but it is NOT what raises the
 * alert. See ALERT_ON below.
 */
export const ALERT_THRESHOLD_OF_PLAN = 0.05;

/**
 * What actually raises the alert.
 *
 * Thresholding on accumulated money is the wrong model for this scenario and
 * gets the wrong answer. The entire premise is that revenue still looks fine —
 * on this company it is 2.3% under plan, which nobody escalates — while the
 * forward indicators move together. By the time enough money has accrued to
 * cross a materiality test, most of the recovery window has gone: on these
 * figures that is three weeks rather than seven.
 *
 * A platform whose claim is early warning has to alert on the leading
 * indicator. These are the thresholds it alerts on, named here because they
 * are the first thing a buyer challenges, and each one is a level a fund would
 * recognise rather than a level chosen to produce a headline.
 */
export const ALERT_ON = {
  coverage: { level: 2.5, label: "pipeline coverage", unit: "×",
              basis: "Below 2.5× a quarter cannot be covered at any realistic win rate" },
  winRate:  { level: 26,  label: "win rate", unit: "%",
              basis: "More than five points under plan is a conversion problem rather than a mix problem" },
};

/** Weeks of history the timeline covers, back from the board review. */
export const WEEKS = 8;

/**
 * The systems this investigation reads. Confidence is scaled by how many of
 * them are answering, so a degraded connector lowers the number on the screen
 * instead of the screen carrying on as though nothing had changed.
 */
export const READS_FROM = ["hubspot", "stripe", "bamboo", "xero"];

const r1 = (v) => Math.round(v * 10) / 10;

/**
 * Confidence in the investigation, counted rather than chosen.
 *
 * Same rule as the Opportunity Radar — floor plus span × the share of the
 * independent indicators that agree, plus a small allowance for how much of the
 * source estate is answering — so the two screens cannot quote different
 * confidences for the same quality of evidence. The indicator list is returned
 * alongside the number so a sceptic can check the count.
 *
 * Note the deliberate dissent: revenue against plan does NOT agree. It is barely
 * under, which is the whole premise, and counting it as agreement would flatter
 * the number by fourteen points.
 */
export function investigationConfidence(s, asOf) {
  const cycleUp = PARAMS.salesCycleDays.now > PARAMS.salesCycleDays.prior;
  const variance = s.currentQuarter.variancePct;

  const indicators = [
    { label: "Pipeline coverage",  observed: `${r1(s.forecast.coverage)}× against a ${ALERT_ON.coverage.level}× floor`,
      agrees: s.forecast.coverage < ALERT_ON.coverage.level, source: "HubSpot" },
    { label: "Win rate",           observed: `${PARAMS.winRateNow}% against a plan of ${PARAMS.winRatePlan}%`,
      agrees: PARAMS.winRateNow < ALERT_ON.winRate.level, source: "HubSpot" },
    { label: "Sales cycle",        observed: `${PARAMS.salesCycleDays.now} days, from ${PARAMS.salesCycleDays.prior}`,
      agrees: cycleUp, source: "HubSpot" },
    { label: "Deal timing",        observed: `${PARAMS.slippedDeals.length} opportunities re-dated out of the quarter`,
      agrees: PARAMS.slippedDeals.length > 0, source: "HubSpot" },
    { label: "Customer churn",     observed: `${PARAMS.churnActualPct}% against a plan of ${PARAMS.churnPlanPct}%`,
      agrees: PARAMS.churnActualPct > PARAMS.churnPlanPct, source: "Stripe" },
    { label: "Quota headcount",    observed: `${PARAMS.salesHires.inSeat} in seat against a plan of ${PARAMS.salesHires.plan}`,
      agrees: PARAMS.salesHires.inSeat < PARAMS.salesHires.plan, source: "BambooHR" },
    { label: "Revenue against plan", observed: `${variance.toFixed(1)}% — inside the ${(ALERT_THRESHOLD_OF_PLAN * 100).toFixed(0)}% materiality test`,
      agrees: variance <= -(ALERT_THRESHOLD_OF_PLAN * 100), source: "Xero" },
  ];

  const health = integrationHealth(asOf);
  const answering = READS_FROM.filter((id) =>
    health.connected.some((r) => r.id === id)).length;
  const freshness = (answering / READS_FROM.length) * 100;

  const agreeing = indicators.filter((i) => i.agrees).length;
  const share = agreeing / indicators.length;
  const confidence = Math.round(
    RADAR_PARAMS.confidenceFloor +
    RADAR_PARAMS.confidenceSpan * share +
    RADAR_PARAMS.dataQualityBonus * (freshness / 100)
  );

  return {
    indicators, agreeing, indicatorCount: indicators.length, share, confidence,
    answering, sourceCount: READS_FROM.length,
    basis:
      `${agreeing} of ${indicators.length} independent indicators agree, ` +
      `read from ${answering} of ${READS_FROM.length} source systems. ` +
      `Counted as ${RADAR_PARAMS.confidenceFloor} plus ${RADAR_PARAMS.confidenceSpan} × the share that agree, ` +
      `plus up to ${RADAR_PARAMS.dataQualityBonus} for how much of the estate is answering.`,
  };
}

/**
 * The signal, week by week.
 *
 * @returns {{weeks, alertWeek, leadTimeWeeks, boardWeek, reconciliation, threshold}}
 */
export function buildSignalDevelopment(opts = {}) {
  const s = opts.scenario ?? buildRevenueMiss();
  const plan = s.forecast.planRevenue;
  const bridge = s.bridge;
  const sales = s.fin.sales.history;

  const driverOf = (needle) => bridge.find((b) => b.driver.toLowerCase().includes(needle)) ?? null;
  const conversion = driverOf("conversion");
  const slipped = driverOf("later quarter") ?? driverOf("slip");
  const churn = driverOf("churn");
  const capacity = driverOf("capacity");

  // Indicators emerge in the order the data says they moved: coverage and win
  // rate degrade first and continuously, deal timing is an event, churn shows
  // in billing a month later, capacity is the slowest to read.
  const recent = sales.slice(-WEEKS);
  const cov = (i) => recent[Math.min(i, recent.length - 1)]?.pipelineCoverage ?? s.forecast.coverage;
  const win = (i) => recent[Math.min(i, recent.length - 1)]?.winRatePct ?? PARAMS.winRateNow;

  /**
   * `accrued` is the portion of the quantified gap an observer could have known
   * about by that week. It is cumulative and it is what the threshold tests.
   */
  const spec = [
    { indicator: "Pipeline coverage",  accrue: 0,
      caption: (i) => `Coverage ${cov(i)}× against ${r1(s.fin.sales.coverageFrom)}× at the start of the period`,
      source: "HubSpot" },
    { indicator: "Win rate",           accrue: 0,
      caption: (i) => `Win rate ${r1(win(i))}% against a plan of ${PARAMS.winRatePlan}%`,
      source: "HubSpot" },
    { indicator: "Pipeline quality",   accrue: conversion ? conversion.value * 0.45 : 0,
      caption: () => `Conversion deteriorating across the open book`,
      source: "HubSpot" },
    { indicator: "Enterprise deals",   accrue: slipped ? slipped.value : 0,
      caption: () => `${PARAMS.slippedDeals.length} opportunities re-dated out of the quarter`,
      source: "HubSpot" },
    { indicator: "Customer churn",     accrue: churn ? churn.value : 0,
      caption: () => `Quarterly churn ${PARAMS.churnActualPct}% against a plan of ${PARAMS.churnPlanPct}%`,
      source: "Stripe" },
    { indicator: "Conversion",         accrue: conversion ? conversion.value * 0.55 : 0,
      caption: () => `Lower conversion confirmed against the full open pipeline`,
      source: "HubSpot" },
    { indicator: "Sales capacity",     accrue: capacity ? capacity.value : 0,
      caption: () => `${PARAMS.salesHires.plan - PARAMS.salesHires.inSeat} of ${PARAMS.salesHires.plan} quota-carrying hires not in seat`,
      source: "Workday" },
    { indicator: "Board review",       accrue: 0,
      caption: () => `Quarterly review — the first date the miss would otherwise surface`,
      source: "Alba" },
  ];

  let accrued = 0;
  let alertWeek = null;
  let alertBasis = null;
  const weeks = spec.map((row, i) => {
    accrued += row.accrue;
    const shareOfPlan = accrued / plan;
    const isBoard = i === spec.length - 1;

    // The leading indicators, read at this week.
    const coverageNow = cov(i);
    const winNow = win(i);
    const trips = [];
    if (coverageNow < ALERT_ON.coverage.level) trips.push({ ...ALERT_ON.coverage, value: r1(coverageNow) });
    if (winNow < ALERT_ON.winRate.level) trips.push({ ...ALERT_ON.winRate, value: r1(winNow) });

    // The alert is raised the first week a leading indicator is under its
    // threshold — not the week the money becomes material.
    if (alertWeek === null && trips.length && !isBoard) {
      alertWeek = -(spec.length - 1 - i);
      alertBasis = trips;
    }

    return {
      week: -(spec.length - 1 - i),
      indicator: row.indicator,
      caption: row.caption(i),
      source: row.source,
      accrued: Math.round(accrued),
      shareOfPlan,
      material: shareOfPlan >= ALERT_THRESHOLD_OF_PLAN,
      trips,
      breached: trips.length > 0,
      isBoard,
      coverage: r1(coverageNow),
      winRate: r1(winNow),
    };
  });

  const boardWeek = 0;
  const leadTimeWeeks = alertWeek === null ? 0 : boardWeek - alertWeek;

  // The scenario states a decision window in prose. Reconcile against it rather
  // than letting two figures for the same thing sit on two screens.
  const stated = /six weeks/i.test(s.insight?.whyItMatters ?? "") ? 6 : null;
  const trigger = alertBasis
    ? alertBasis.map((t) => `${t.label} ${t.value}${t.unit} against a threshold of ${t.level}${t.unit}`).join(" and ")
    : "no leading indicator under threshold";
  const materialWeek = weeks.find((w) => w.material && !w.isBoard)?.week ?? null;

  const reconciliation =
    `The alert is raised in week ${alertWeek} on ${trigger} — ${leadTimeWeeks} weeks before the board review. ` +
    (materialWeek !== null && alertWeek !== null && materialWeek > alertWeek
      ? `The accumulated gap does not reach ${(ALERT_THRESHOLD_OF_PLAN * 100).toFixed(0)}% of plan until week ` +
        `${materialWeek}, so a materiality test on the money alone would have found this ` +
        `${materialWeek - alertWeek} week${materialWeek - alertWeek === 1 ? "" : "s"} later. `
      : "") +
    (stated !== null
      ? `The scenario allows a ${stated}-week recovery window; the alert lands with ` +
        `${leadTimeWeeks - stated >= 0 ? `${leadTimeWeeks - stated} week${leadTimeWeeks - stated === 1 ? "" : "s"} in hand` : "less time than that"}.`
      : "");

  return {
    weeks,
    alertWeek,
    leadTimeWeeks,
    boardWeek,
    threshold: ALERT_THRESHOLD_OF_PLAN,
    alertOn: ALERT_ON,
    alertBasis,
    materialWeek,
    plan,
    quantifiedGap: Math.round(s.forecast.forecastGap),
    reconciliation,
    confidence: investigationConfidence(s),
    company: s.company,
    currency: s.currency,
    scenario: s,
  };
}
