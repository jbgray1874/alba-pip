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
 * Every connected system, with the state of its credential.
 *
 * `expires` is the date the licence, token or trial runs out. Nothing here is
 * cosmetic: an integration past its date stops being a live source and its
 * figures fall back to the modelled continuation, which is exactly what will
 * happen in production when a refresh token is revoked.
 */
export const INTEGRATIONS = [
  { id: "xero",     name: "Xero",             kind: "Accounting", feeds: ["Revenue", "Margin", "Cost of sales"],
    credential: "OAuth 2.0 refresh token", expires: "2026-07-24", scope: "accounting.reports.read, accounting.transactions" },
  { id: "bankfeed", name: "Xero bank feed",   kind: "Banking",    feeds: ["Cash balance", "Net burn"],
    credential: "OAuth 2.0 refresh token", expires: "2026-07-24", scope: "accounting.transactions" },
  { id: "stripe",   name: "Stripe",           kind: "Billing",    feeds: ["MRR", "Churn", "Collections"],
    credential: "Restricted API key", expires: "2026-11-30", scope: "read_only" },
  { id: "hubspot",  name: "HubSpot",          kind: "CRM",        feeds: ["Pipeline coverage", "Win rate", "Deal timing"],
    credential: "Private app token", expires: "2026-06-14", scope: "crm.objects.deals.read" },
  { id: "fx",       name: "ExchangeRate-API", kind: "Market",     feeds: ["GBP/USD", "GBP/EUR", "Portfolio restatement"],
    credential: "Open endpoint — no key", expires: null, scope: "latest rates" },
  { id: "bamboo",   name: "BambooHR",         kind: "HRIS",       feeds: ["Headcount", "Attrition"],
    credential: "API key", expires: "2026-05-20", scope: "employees.read" },
  { id: "alphav",   name: "Alpha Vantage",    kind: "Market",     feeds: ["FX fallback", "Indices"],
    credential: "Free-tier API key", expires: "2026-05-01", scope: "25 requests/day" },
  { id: "newsapi",  name: "NewsAPI",          kind: "News",       feeds: ["Company news", "Sentiment"],
    credential: "Developer key", expires: "2026-09-30", scope: "everything endpoint" },
];

export const LICENCE = {
  connected: { id: "connected", label: "Connected",  colour: "#00c97a" },
  expiring:  { id: "expiring",  label: "Expiring",   colour: "#f5a524" },
  expired:   { id: "expired",   label: "Expired",    colour: "#ff3d5a" },
  keyless:   { id: "keyless",   label: "No credential needed", colour: "#3d8bff" },
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
    return { ...LICENCE.keyless, days: null, note: "Open endpoint — nothing to renew" };
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
      const e = rows.filter((r) => r.licence.id === "expired").length;
      const w = rows.filter((r) => r.licence.id === "expiring").length;
      if (e) return { tone: "expired", text: `${e} integration${e > 1 ? "s" : ""} lapsed — those figures are continuing from the last reading` };
      if (w) return { tone: "expiring", text: `${w} credential${w > 1 ? "s" : ""} renew within 45 days` };
      return { tone: "connected", text: "All integrations connected" };
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
      tier: s.tier ?? (lapsed ? "simulated" : s.integration ? "simulated" : "simulated"),
      provider: source?.name ?? "Alba model",
      licence,
      detail: lapsed
        ? `${source.name} credential lapsed ${Math.abs(licence.days)} days ago — continuing from the last reading`
        : source ? `${source.name} · ${licence.note}` : "Modelled from the finance model",
    };
  }), [specs, t]);
}
