// ════════════════════════════════════════════════════════════════════════════
//  /api/fx/yahoo — foreign exchange rates from Yahoo Finance
//  ----------------------------------------------------------------------------
//  Yahoo quotes FX as instruments rather than as a table: GBPUSD=X is a symbol
//  with a chart, the same as a share. So this asks for one pair per currency
//  against the base and assembles the table the application wants.
//
//  It has to be here rather than in the page for a reason that is not about
//  keys — Yahoo sends no CORS headers, so a browser will refuse the response
//  it just received. Server-side there is no such rule. That is also why the
//  page keeps open.er-api.com as its second source: on a static build this
//  endpoint does not exist, and the figures still have to come from somewhere.
//
//  No API key. Yahoo's chart endpoint is open, which is what makes it a
//  reasonable default and also why it is treated as best-effort: a source that
//  costs nothing can withdraw at any time, so every failure below falls through
//  to the caller's own fallback rather than erroring.
// ════════════════════════════════════════════════════════════════════════════

const CHART = "https://query1.finance.yahoo.com/v8/finance/chart/";

// The G10 plus SGD and AED, matching src/lib/fx.js. Quoted against GBP because
// that is the table's base; the application converts between any two from it.
const QUOTED = ["USD", "EUR", "JPY", "CHF", "CAD", "AUD", "NZD", "NOK", "SEK", "SGD", "AED"];

const BASE = "GBP";

/** One pair. Returns null rather than throwing, so one bad symbol cannot take the set down. */
async function pair(code, signal) {
  try {
    const r = await fetch(`${CHART}${BASE}${code}=X?interval=1d&range=1d`, {
      signal,
      // Yahoo serves a consent page to an unrecognised agent.
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AlbaPIP/1.0)" },
    });
    if (!r.ok) return null;
    const d = await r.json();
    const meta = d?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    return typeof price === "number" && price > 0
      ? { code, rate: price, at: meta.regularMarketTime ?? null }
      : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  // Eleven sequential round trips would be most of a second. They are
  // independent, so they go together, with a ceiling on the whole set rather
  // than on each one.
  const stop = AbortSignal.timeout(6000);
  const results = await Promise.all(QUOTED.map((c) => pair(c, stop)));

  const rates = { [BASE]: 1 };
  const missing = [];
  // By index. indexOf on the results array would have found the first null
  // every time and named one currency repeatedly while the real gaps went
  // unreported.
  results.forEach((r, i) => (r ? (rates[r.code] = r.rate) : missing.push(QUOTED[i])));

  const got = Object.keys(rates).length - 1;

  // A partial table is refused rather than merged. Half of the portfolio
  // restated at today's rate and half at a rate from a fortnight ago is a
  // total that is not a number in any currency, and it would look completely
  // ordinary on screen.
  if (got < QUOTED.length) {
    return res.status(200).json({
      ok: false,
      reason: `Yahoo returned ${got} of ${QUOTED.length} pairs`,
      missing,
      base: BASE,
    });
  }

  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
  return res.status(200).json({
    ok: true,
    base: BASE,
    rates,
    provider: "Yahoo Finance",
    fetchedAt: new Date().toISOString(),
  });
}
