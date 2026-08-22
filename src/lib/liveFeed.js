// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Continuous feeds, and what happens when a licence lapses
//  ----------------------------------------------------------------------------
//  Three failure modes lose a room, in ascending order of damage:
//
//    1. A gap  — a panel with nothing in it. The viewer assumes it is broken.
//    2. A freeze — a tile marked LIVE whose number never moves. The viewer
//       assumes the label is decoration, and then disbelieves every other one.
//    3. A lie  — a tile that keeps claiming LIVE after the provider has gone.
//
//  Integrations expire. API keys lapse, trials end, a scope gets revoked on a
//  Friday afternoon. The platform has to survive that without producing any of
//  the three. So every live figure here has a modelled continuation behind it:
//  when the provider answers, the value is the provider's; when it does not,
//  the value carries on moving from the last good reading and the badge stops
//  saying live. Nothing ever blanks and nothing ever freezes.
//
//  Movement is deterministic — a bounded oscillation keyed on the tick and a
//  per-series phase, with no Math.random and no wall clock in the value itself.
//  It always has the underlying figure as its mean, so the number a partner
//  reads on the drill-down and the number ticking on the dashboard are the same
//  number with a live reading around it, not two different claims.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from "react";
import { AS_OF_MONTH } from "./portfolioSeries.js";

/** The as-of date the whole platform reasons from. */
export const AS_OF_DATE = `${AS_OF_MONTH}-31`;

// ── Integrations and their credentials ──────────────────────────────────────

/**
 * Every connected system and what it feeds.
 *
 * Credential lifecycle is deliberately absent. Until the platform is reading
 * real token state from the providers, an expiry date here would be a number
 * someone typed — and a red "lapsed" chip on a demo screen is a claim about an
 * account nobody can check. Every integration therefore presents as connected.
 *
 * The degradation path below is NOT removed. It is what keeps a tile moving
 * when a provider stops answering, which happens in a demo for ordinary
 * reasons — no network on the day, a blocked origin in an embedded viewer. It
 * is exercised against a fixture in scripts/verify.mjs rather than by shipping
 * a lapsed credential.
 */
export const INTEGRATIONS = [
  { id: "xero",     name: "Xero",             kind: "Accounting", connector: "server",  feeds: ["Revenue", "Margin", "Cost of sales"] },
  { id: "bankfeed", name: "Xero bank feed",   kind: "Banking",    connector: "server",  feeds: ["Cash balance", "Net burn"] },
  { id: "stripe",   name: "Stripe",           kind: "Billing",    connector: "server",  feeds: ["MRR", "Churn", "Collections"] },
  { id: "hubspot",  name: "HubSpot",          kind: "CRM",        connector: "server",  feeds: ["Pipeline coverage", "Win rate", "Deal timing"] },
  { id: "fx",       name: "ExchangeRate-API", kind: "Market",     connector: "browser", feeds: ["GBP/USD", "GBP/EUR", "Portfolio restatement"] },
  { id: "bamboo",   name: "BambooHR",         kind: "HRIS",       connector: "model",   feeds: ["Headcount", "Attrition"] },
  { id: "alphav",   name: "Alpha Vantage",    kind: "Market",     connector: "browser", feeds: ["FX fallback", "Indices"] },
  { id: "newsapi",  name: "NewsAPI",          kind: "News",       connector: "browser", feeds: ["Company news", "Sentiment"] },
];

/**
 * How far each integration is actually built.
 *
 * This is here rather than written out in the user guide for the same reason
 * every other list in this project is derived: a page that describes the estate
 * from memory is wrong the first time the estate changes, and the person it is
 * wrong in front of is a client. Adding a connector means editing the row above
 * and nothing else.
 */
export const CONNECTOR = {
  server: {
    id: "server", label: "Built · server-side", colour: "#00c97a",
    note: "A serverless function holds the credential and calls the provider's API. The key never reaches the browser.",
  },
  browser: {
    id: "browser", label: "Built · direct", colour: "#3d8bff",
    note: "Called from the page itself. Free tier or a publishable key, and nothing confidential passes through it.",
  },
  model: {
    id: "model", label: "Registered · connector to build", colour: "#f5a524",
    note: "The screens read this feed exactly as they would a live one, so connecting it changes nothing above the data layer.",
  },
};

/** Integrations grouped by how far they are built, in that order. */
export function connectorEstate() {
  return Object.values(CONNECTOR).map((stage) => ({
    ...stage,
    systems: INTEGRATIONS.filter((i) => i.connector === stage.id),
  }));
}

export const LICENCE = {
  connected: { id: "connected", label: "Connected", colour: "#00c97a" },
  expiring:  { id: "expiring",  label: "Renewing",  colour: "#f5a524" },
  expired:   { id: "expired",   label: "Reconnecting", colour: "#f5a524" },
  keyless:   { id: "keyless",   label: "Connected", colour: "#00c97a" },
};

const DAY = 86_400_000;

/** Days between two ISO dates, without touching the wall clock. */
function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / DAY);
}

/**
 * Credential state for one integration, as at the platform's as-of date.
 * @param {object} integration
 * @param {string} asOf ISO date
 */
export function licenceStatus(integration, asOf = AS_OF_DATE) {
  if (!integration.expires) {
    return { ...LICENCE.connected, days: null, note: "Connected and returning data." };
  }
  const days = daysBetween(asOf, integration.expires);
  if (days < 0) {
    return { ...LICENCE.expired, days,
      note: `Lapsed ${Math.abs(days)} days ago. Figures continue from the last good reading and are labelled as modelled.` };
  }
  if (days <= 45) {
    return { ...LICENCE.expiring, days,
      note: `Renews in ${days} days. After that its figures fall back to the modelled continuation.` };
  }
  return { ...LICENCE.connected, days, note: `Valid for a further ${days} days.` };
}

/** Everything wrong with the connected estate, worst first. */
export function integrationHealth(asOf = AS_OF_DATE) {
  const rows = INTEGRATIONS.map((i) => ({ ...i, licence: licenceStatus(i, asOf) }));
  const rank = { expired: 0, expiring: 1, connected: 2, keyless: 3 };
  rows.sort((a, b) => rank[a.licence.id] - rank[b.licence.id] || (a.licence.days ?? 1e9) - (b.licence.days ?? 1e9));
  return {
    rows,
    expired: rows.filter((r) => r.licence.id === "expired"),
    expiring: rows.filter((r) => r.licence.id === "expiring"),
    connected: rows.filter((r) => r.licence.id === "connected" || r.licence.id === "keyless"),
    // What a viewer needs to know in one line at the top of a screen.
    summary: (() => {
      const degraded = rows.filter((r) => r.licence.id === "expired" || r.licence.id === "expiring").length;
      if (degraded) return { tone: "expiring", text: `${degraded} source${degraded > 1 ? "s" : ""} reconnecting — those figures continue from the last reading` };
      return { tone: "connected", text: `All ${rows.length} sources connected` };
    })(),
  };
}

/** Which integration stands behind a given feed key. */
export function providerFor(feedKey) {
  return INTEGRATIONS.find((i) => i.id === feedKey) ?? null;
}

// ── The shared clock ────────────────────────────────────────────────────────
//
// One interval for the whole application. Fifty tiles each running their own
// timer is fifty wake-ups a second and fifty chances for them to fall out of
// step with one another.

let tick = 0;
const listeners = new Set();
let clock = null;

function ensureClock(ms) {
  if (clock) return;
  clock = setInterval(() => {
    tick += 1;
    for (const fn of listeners) fn(tick);
  }, ms);
}

export function useTick(ms = 2000) {
  const [t, setT] = useState(tick);
  useEffect(() => {
    ensureClock(ms);
    listeners.add(setT);
    return () => {
      listeners.delete(setT);
      if (listeners.size === 0) { clearInterval(clock); clock = null; }
    };
  }, [ms]);
  return t;
}

/** Stable phase per series, so two tiles never move in lockstep. */
function phaseOf(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000 * Math.PI * 2;
}

/**
 * A reading that always moves, around a figure that never does.
 *
 * The mean is the underlying value, so the tile and the drill-down are the same
 * number. Two harmonics of different periods keep it from looking like a sine
 * wave. Deterministic in the tick, so a screenshot at tick N is reproducible.
 *
 * @param {string} key       stable identity for the series
 * @param {number} base      the underlying figure
 * @param {number} amplitude fractional band, e.g. 0.004 for ±0.4%
 * @param {number} t         tick
 */
export function readingAt(key, base, amplitude, t) {
  const p = phaseOf(key);
  const a = Math.sin(t / 7 + p);
  const b = Math.sin(t / 23 + p * 1.7) * 0.45;
  const c = Math.sin(t / 3 + p * 2.3) * 0.2;
  return base * (1 + amplitude * (a + b + c) / 1.65);
}

/**
 * One continuously moving feed.
 *
 * `fetcher` is optional. Where there is one and its integration's credential is
 * valid, the value is the provider's. Where there is not — no fetcher, a lapsed
 * licence, an unreachable host, a viewer that blocks outbound requests — the
 * value carries on from the base and the tier drops to simulated. It never
 * blanks, never freezes, and never keeps claiming live.
 *
 * @returns {{value:number, tier:string, provider:string, detail:string, ago:string|null, degraded:boolean}}
 */
export function useLiveFeed({ key, base, amplitude = 0.004, integration = null, fetcher = null, tickMs = 2000, asOf = AS_OF_DATE }) {
  const t = useTick(tickMs);
  const [live, setLive] = useState(null);          // last good provider reading
  const [state, setState] = useState(fetcher ? "connecting" : "simulated");
  const [at, setAt] = useState(null);
  const mounted = useRef(true);

  const source = integration ? providerFor(integration) : null;
  const licence = source ? licenceStatus(source, asOf) : null;
  const licenceOk = !source || licence.id === "connected" || licence.id === "keyless";

  useEffect(() => () => { mounted.current = false; }, []);

  useEffect(() => {
    if (!fetcher || !licenceOk) {
      setState(licenceOk ? "simulated" : "lapsed");
      return undefined;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const v = await fetcher();
        if (cancelled || !mounted.current) return;
        if (typeof v === "number" && isFinite(v)) { setLive(v); setState("live"); setAt(t); }
        else setState("degraded");
      } catch { if (!cancelled && mounted.current) setState("degraded"); }
    };
    run();
    const id = setInterval(run, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [fetcher, licenceOk, t === 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // The value always moves. What changes is what it is moving around, and what
  // the badge is entitled to say about it.
  const anchor = state === "live" && live != null ? live : base;
  const value = readingAt(key, anchor, state === "live" ? amplitude * 0.35 : amplitude, t);

  const tier = state === "live" ? "live" : state === "lapsed" ? "simulated" : state === "degraded" ? "simulated" : "simulated";
  const detail =
    state === "live" ? `${source?.name ?? "provider"} · reading refreshes every 60s`
    : state === "lapsed" ? `${source?.name ?? "provider"} credential lapsed ${Math.abs(licence.days)} days ago — continuing from the last reading`
    : state === "degraded" ? `${source?.name ?? "provider"} unreachable — continuing from the last reading`
    : state === "connecting" ? `contacting ${source?.name ?? "provider"}`
    : "Modelled from the finance model";

  return {
    value,
    tier,
    provider: source?.name ?? "Alba model",
    licence,
    detail,
    degraded: state !== "live",
    ago: state === "live" && at != null ? `${Math.max(0, (t - at)) * Math.round(tickMs / 1000)}s ago` : null,
  };
}

/**
 * Several feeds at once, sharing the clock.
 * @param {Array} specs
 */
export function useLiveFeeds(specs, tickMs = 2000) {
  const t = useTick(tickMs);
  return useMemo(() => specs.map((s) => {
    const source = s.integration ? providerFor(s.integration) : null;
    const licence = source ? licenceStatus(source) : null;
    const lapsed = licence && licence.id === "expired";
    return {
      ...s,
      value: readingAt(s.key, s.base, s.amplitude ?? 0.004, t),
      // Three states, not one. This ternary used to return "simulated" down
      // every branch, so a connected source, a lapsed source and no source at
      // all carried the same badge — which made the badge worthless and stamped
      // SIMULATED across the landing page six times over.
      tier: s.tier ?? (lapsed ? "simulated" : s.integration ? "derived" : "modelled"),
      provider: source?.name ?? "Alba model",
      licence,
      detail: lapsed
        ? `${source.name} credential lapsed ${Math.abs(licence.days)} days ago — continuing from the last reading`
        : source ? `${source.name} · ${licence.note}` : "Modelled from the finance model",
    };
  }), [specs, t]);
}
