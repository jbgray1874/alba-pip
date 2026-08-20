// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Live data, and saying so honestly
//  ----------------------------------------------------------------------------
//  Five tiles on the Live Data screen were labelled `tier: "live"`. Two of them
//  were: the GBP/USD and GBP/EUR pairs genuinely fetch. The other three — cash,
//  NASDAQ and the S&P — were seeded from the model and random-walked behind a
//  label that said they came from a market feed. A moving number with a LIVE
//  badge on it is the most believable thing on a screen, which is exactly why
//  it must not be decoration.
//
//  So there is one vocabulary for where a figure comes from, and the badge that
//  renders it reads its state from the fetch rather than from a constant. When
//  a live source cannot be reached — no network, a blocked origin, an embedded
//  viewer with a strict content policy — the badge says so and names what is
//  being shown instead. It never keeps claiming to be live.
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLiveRates, usePinnedRates, rates, RATES_PINNED_AT, PINNED_RATES } from "./fx.js";

/**
 * Where a figure comes from. One vocabulary, used by every badge on every
 * screen, so "live" means the same thing in all of them.
 */
export const TIERS = {
  live: {
    id: "live", label: "LIVE", colour: "#00c97a",
    definition: "Fetched from an external provider during this session. The timestamp is when it last arrived.",
  },
  /**
   * The connector is attached and this reading moves around the figure that
   * source last reported. It is not a live poll and does not claim to be.
   *
   * This state used to be labelled SIMULATED, which put six blue SIMULATED
   * stamps across the landing page. Accurate, and read by everyone who saw it
   * as "none of this is real". SIMULATED is now reserved for what it should
   * always have meant: a provider that has stopped answering.
   */
  derived: {
    id: "derived", label: "FROM LEDGER", colour: "#9A9AA0",
    definition: "The connector is attached and this reading moves around the figure it last reported. The mean is that figure — the same number the drill-down shows. Not a live poll.",
  },
  simulated: {
    id: "simulated", label: "SIMULATED", colour: "#3d8bff",
    definition: "The provider is not answering. The reading continues from the last good value so the tile never blanks and never freezes.",
  },
  modelled: {
    id: "modelled", label: "MODEL", colour: "#f5a524",
    definition: "Derived from the company's discipline score because no source system is connected for this metric.",
  },
  pinned: {
    id: "pinned", label: "PINNED", colour: "#7a90b8",
    definition: "Deliberately fixed so a rehearsal and the meeting that follows it show identical numbers.",
  },
  unavailable: {
    id: "unavailable", label: "OFFLINE", colour: "#ff3d5a",
    definition: "The live source could not be reached. The pinned value is shown in its place.",
  },
};

export const LIVE_REFRESH_MS = 60_000;

/** "just now", "12s ago", "4m ago" — recomputed on a tick, not on a clock read. */
export function agoLabel(fromMs, nowMs) {
  if (!fromMs) return null;
  const s = Math.max(0, Math.round((nowMs - fromMs) / 1000));
  if (s < 3) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

/**
 * Live foreign exchange, opt-in.
 *
 * Nothing calls this on load. A demo that silently revalues itself between the
 * rehearsal and the meeting is worse than one that is a fortnight stale, so
 * pinned is the default and going live is a deliberate act with a visible
 * badge attached.
 *
 * `version` increments on every successful fetch. Consumers put it in their
 * dependency list so the portfolio recomputes when the rates move — without
 * it, the badge would say live while the figures stayed where they were.
 */
export function useLiveRates({ intervalMs = LIVE_REFRESH_MS } = {}) {
  const [state, setState] = useState("pinned"); // pinned | loading | live | unavailable
  const [at, setAt] = useState(null);
  const [provider, setProvider] = useState(null);
  const [version, setVersion] = useState(0);
  const [now, setNow] = useState(() => 0);
  const timer = useRef(null);
  const ticker = useRef(null);

  const refresh = useCallback(async () => {
    setState((s) => (s === "live" ? "live" : "loading"));
    const result = await fetchLiveRates();
    if (result.source === "live") {
      setState("live");
      setProvider(result.provider);
      setAt(performance.now());
      setVersion((v) => v + 1);
    } else {
      // The fetch failed or came back incomplete. fetchLiveRates leaves the
      // pinned table in place, so the figures on screen are still correct —
      // what changes is that the badge stops claiming otherwise.
      setState("unavailable");
      setProvider(result.provider ?? "unreachable");
      setVersion((v) => v + 1);
    }
  }, []);

  const goLive = useCallback(() => {
    refresh();
    clearInterval(timer.current);
    timer.current = setInterval(refresh, intervalMs);
  }, [refresh, intervalMs]);

  const goPinned = useCallback(() => {
    clearInterval(timer.current);
    timer.current = null;
    usePinnedRates();
    setState("pinned");
    setProvider(null);
    setAt(null);
    setVersion((v) => v + 1);
  }, []);

  // A ticking "updated Ns ago" is the only part of a live badge a viewer can
  // check, so it has to move on its own rather than at the fetch interval.
  useEffect(() => {
    if (state !== "live") return undefined;
    ticker.current = setInterval(() => setNow(performance.now()), 1000);
    return () => clearInterval(ticker.current);
  }, [state]);

  useEffect(() => () => { clearInterval(timer.current); clearInterval(ticker.current); }, []);

  const tier = state === "live" ? TIERS.live
    : state === "unavailable" ? TIERS.unavailable
    : state === "loading" ? TIERS.live
    : TIERS.pinned;

  return {
    state, tier, provider, version,
    isLive: state === "live",
    loading: state === "loading",
    ago: state === "live" ? agoLabel(at, now || at) : null,
    detail: state === "live" ? `${provider} · refreshes every ${Math.round(intervalMs / 1000)}s`
      : state === "loading" ? "contacting the provider"
      : state === "unavailable" ? `${provider} — showing rates pinned ${RATES_PINNED_AT}`
      : `Pinned ${RATES_PINNED_AT}`,
    goLive, goPinned, refresh,
    // What actually changed, so a viewer can see the live switch do something
    // rather than take the badge's word for it.
    comparison: Object.keys(PINNED_RATES)
      .filter((c) => c !== "GBP")
      .map((c) => ({ code: c, pinned: PINNED_RATES[c], current: rates()[c] }))
      .map((r) => ({ ...r, movePct: ((r.current - r.pinned) / r.pinned) * 100 })),
  };
}
