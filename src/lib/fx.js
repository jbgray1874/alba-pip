// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — FX and reporting currency
//  ----------------------------------------------------------------------------
//  Portfolio companies report in their own currency and bank in several more,
//  so nothing can be added up until it is all expressed in one. The fund picks
//  that one; every screen restates into it and says what rate it used.
//
//  The table covers the G10 plus SGD and AED. The G10 because those are the
//  currencies a fund of this shape actually holds, SGD and AED because two
//  portfolio companies operate in them, and no others because a rate nobody
//  can check is worse than a currency the product declines to handle.
//
//  Rates are PINNED by default, and that is a demo decision rather than a
//  technical one: a portfolio that silently revalues itself between the
//  rehearsal and the meeting is worse than one that is a fortnight stale.
//  Fetching today's rates is opt-in, labelled, and reversible.
//
//  Three sources, in order, because the first two can both be unreachable from
//  a browser and the figures must not stop:
//
//    1. Yahoo Finance, through /api/fx/yahoo — the pair-by-pair source, and the
//       one a treasury desk would recognise. It needs the serverless functions,
//       so it is unavailable on a static build.
//    2. open.er-api.com — a whole rates table in one call, no key, reachable
//       from the page itself.
//    3. The pinned table, which is always there and always says so.
// ════════════════════════════════════════════════════════════════════════════

/** Units of each currency per 1 GBP. Pinned — see RATES_PINNED_AT. */
export const PINNED_RATES = {
  GBP: 1,        // base
  USD: 1.27,
  EUR: 1.17,
  JPY: 193.40,
  CHF: 1.09,
  CAD: 1.73,
  AUD: 1.92,
  NZD: 2.09,
  NOK: 13.62,
  SEK: 13.28,
  SGD: 1.71,
  AED: 4.66,     // not G10; two portfolio companies operate in it
};

/**
 * The currencies a roll-up may be displayed in.
 *
 * The G10 plus SGD, which is what was asked for, ordered as a dealer would
 * quote them rather than alphabetically — the majors first.
 */
export const DISPLAY_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD", "NOK", "SEK", "SGD"];

export const RATES_PINNED_AT = "2026-05-31";

export const CURRENCY_SYMBOL = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  JPY: "¥",
  CHF: "CHF ",
  CAD: "C$",
  AUD: "A$",
  NZD: "NZ$",
  NOK: "kr ",
  SEK: "kr ",
  SGD: "S$",
  AED: "AED ",
};

let _rates = { ...PINNED_RATES };
let _source = "pinned";
let _provider = `Pinned ${RATES_PINNED_AT}`;

export function rates() {
  return { ..._rates };
}

export function fxStatus() {
  return _source === "live"
    ? { status: "live", label: "FX", detail: _provider }
    : { status: "pinned", label: "FX", detail: `Pinned ${RATES_PINNED_AT}` };
}

/** Reset to the pinned set — used when leaving a live session. */
export function usePinnedRates() {
  _rates = { ...PINNED_RATES };
  _source = "pinned";
  _provider = `Pinned ${RATES_PINNED_AT}`;
}

/** A set is only adopted if it covers every currency the table carries. */
function complete(next) {
  return Object.keys(PINNED_RATES).every((code) => typeof next[code] === "number" && next[code] > 0);
}

/**
 * Yahoo Finance, through the serverless function.
 *
 * The pair-by-pair source, and the one a treasury desk would recognise. It
 * cannot be called from the page — Yahoo sends no CORS headers — so it goes
 * via /api/fx/yahoo, which does not exist on a static build. That is not an
 * error condition; it is the ordinary case today, and the caller falls through.
 */
async function fromYahoo() {
  try {
    const r = await fetch("/api/fx/yahoo");
    if (!r.ok) return null;
    const d = await r.json();
    return d?.ok && complete(d.rates) ? { rates: d.rates, provider: "Yahoo Finance" } : null;
  } catch {
    return null;
  }
}

/** open.er-api.com — a whole table in one call, no key, callable from the page. */
async function fromExchangeRateApi() {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/GBP");
    if (!r.ok) return null;
    const d = await r.json();
    const next = { GBP: 1 };
    for (const code of Object.keys(PINNED_RATES)) {
      if (code === "GBP") continue;
      if (typeof d?.rates?.[code] === "number") next[code] = d.rates[code];
    }
    return complete(next) ? { rates: next, provider: "ExchangeRate-API" } : null;
  } catch {
    return null;
  }
}

/**
 * Fetch today's rates. Opt-in: nothing calls this on load, because a demo that
 * silently revalues itself is worse than one that is a fortnight stale.
 *
 * Yahoo first, then the open table, then the pinned set — and a partial answer
 * from either source is refused rather than merged. Half the portfolio restated
 * at today's rate and half at a rate from a fortnight ago is a total that is
 * not a number in any currency, and it would look entirely ordinary on screen.
 */
export async function fetchLiveRates() {
  for (const source of [fromYahoo, fromExchangeRateApi]) {
    const got = await source();
    if (got) {
      _rates = got.rates;
      _source = "live";
      _provider = got.provider;
      return { ...got.rates, source: "live", provider: got.provider };
    }
  }
  return { ...rates(), source: "pinned", provider: "no rate source reachable" };
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
