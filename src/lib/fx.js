// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — FX and reporting currency
//  ----------------------------------------------------------------------------
//  Portfolio companies report in their own currency. The fund reports in one,
//  so a GP comparing nine companies is comparing like with like.
//
//  Rates are PINNED by default. Live rates would mean the fund's total cash
//  changes between a rehearsal and the meeting, and the demo specification is
//  explicit that no screen may need explaining away. fetchLiveRates() is
//  available and clearly labelled when someone wants today's number — the same
//  live/simulated distinction FEED_STATUS already draws elsewhere.
//
//  open.er-api.com/v6/latest/GBP returns a full rates table in one call, so
//  every currency below comes from the request dataFeeds.js already makes.
// ════════════════════════════════════════════════════════════════════════════

/** Units of each currency per 1 GBP. Pinned — see RATES_PINNED_AT. */
export const PINNED_RATES = {
  GBP: 1,
  USD: 1.27,
  EUR: 1.17,
  SGD: 1.71,
  AED: 4.66,
};

export const RATES_PINNED_AT = "2026-05-31";

export const CURRENCY_SYMBOL = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  SGD: "S$",
  AED: "AED ",
};

let _rates = { ...PINNED_RATES };
let _source = "pinned";

export function rates() {
  return { ..._rates };
}

export function fxStatus() {
  return _source === "live"
    ? { status: "live", label: "FX", detail: "ExchangeRate-API" }
    : { status: "pinned", label: "FX", detail: `Pinned ${RATES_PINNED_AT}` };
}

/** Reset to the pinned set — used when leaving a live session. */
export function usePinnedRates() {
  _rates = { ...PINNED_RATES };
  _source = "pinned";
}

/**
 * Fetch today's rates. Opt-in: nothing calls this on load, because a demo that
 * silently revalues itself is worse than one that is a fortnight stale.
 */
export async function fetchLiveRates() {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/GBP");
    if (!r.ok) return { ...rates(), source: "pinned", provider: "unavailable" };
    const d = await r.json();
    const next = { GBP: 1 };
    for (const code of Object.keys(PINNED_RATES)) {
      if (code === "GBP") continue;
      if (typeof d?.rates?.[code] === "number") next[code] = d.rates[code];
    }
    // Only adopt a live set that covers every currency in use.
    if (Object.keys(next).length === Object.keys(PINNED_RATES).length) {
      _rates = next;
      _source = "live";
      return { ...next, source: "live", provider: "ExchangeRate-API" };
    }
    return { ...rates(), source: "pinned", provider: "incomplete response" };
  } catch {
    return { ...rates(), source: "pinned", provider: "unreachable" };
  }
}

/** Convert between any two currencies in the table. */
export function convert(amount, from, to = "GBP") {
  if (from === to) return amount;
  const r = rates();
  const fromRate = r[from];
  const toRate = r[to];
  if (!fromRate || !toRate) return amount; // unknown currency — do not silently distort
  return (amount / fromRate) * toRate;
}

/** Format an amount already expressed in `ccy`. `k` marks thousands. */
export function fmtMoney(amount, ccy = "GBP", { k = false } = {}) {
  const sym = CURRENCY_SYMBOL[ccy] ?? `${ccy} `;
  return `${sym}${Math.round(amount).toLocaleString()}${k ? "k" : ""}`;
}

/** The conversion, spelled out — for an evidence row rather than a tooltip. */
export function conversionNote(amount, from, to = "GBP") {
  if (from === to) return null;
  const r = rates();
  return `${fmtMoney(amount, from, { k: true })} at ${(r[to] / r[from]).toFixed(4)} ${to}/${from} (${_source === "live" ? "live" : `pinned ${RATES_PINNED_AT}`})`;
}
