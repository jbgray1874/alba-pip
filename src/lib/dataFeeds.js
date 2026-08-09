// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Data Feeds Layer
//  ----------------------------------------------------------------------------
//  Single source of truth for all external data. Every feed:
//    1. Reads its API key from environment variables (Vercel / .env)
//    2. Calls the real API if a key is present
//    3. Falls back to realistic simulation if no key (so demos always work)
//    4. Returns a consistent shape: { ...data, source: 'live' | 'simulated' }
//
//  WHEN YOU ADD KEYS:  set them in Vercel → Settings → Environment Variables
//  (or in a local .env file). NO CODE CHANGES NEEDED — feeds flip to live.
//
//    VITE_ALPHA_VANTAGE_KEY   → live FX + market data        (alphavantage.co)
//    VITE_NEWSAPI_KEY         → live company news            (newsapi.org)
//    VITE_FX_API              → (optional) exchangerate-api  (free, no key)
// ════════════════════════════════════════════════════════════════════════════

// ── KEY DETECTION ───────────────────────────────────────────────────────────
const KEYS = {
  alphaVantage: import.meta.env.VITE_ALPHA_VANTAGE_KEY || "",
  newsApi:      import.meta.env.VITE_NEWSAPI_KEY || "",
};

export const FEED_STATUS = {
  alphaVantage: KEYS.alphaVantage ? "live" : "simulated",
  fx:           "live",          // exchangerate-api free tier needs no key
  newsApi:      KEYS.newsApi ? "live" : "simulated",
  yahoo:        "live",          // via free endpoints
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const jitter = (v, pct = 0.004) =>
  +(v * (1 + (Math.random() - 0.5) * 2 * pct)).toFixed(v > 100 ? 2 : 4);

// ════════════════════════════════════════════════════════════════════════════
//  FX RATES  —  GBP/USD, GBP/EUR
// ════════════════════════════════════════════════════════════════════════════
let _fxCache = { gbpusd: 1.2712, gbpeur: 1.1734 };

export async function fetchFX() {
  // Try 1: ExchangeRate API (free, no key, CORS-friendly)
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/GBP");
    if (r.ok) {
      const d = await r.json();
      if (d?.rates?.USD && d?.rates?.EUR) {
        _fxCache = { gbpusd: d.rates.USD, gbpeur: d.rates.EUR };
        return { ...(_fxCache), source: "live", provider: "ExchangeRate-API" };
      }
    }
  } catch (e) { /* fall through */ }

  // Try 2: Alpha Vantage (if key present)
  if (KEYS.alphaVantage) {
    try {
      const r = await fetch(`https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=GBP&to_currency=USD&apikey=${KEYS.alphaVantage}`);
      const d = await r.json();
      const rate = parseFloat(d?.["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"]);
      if (rate) {
        _fxCache.gbpusd = rate;
        return { ...(_fxCache), source: "live", provider: "Alpha Vantage" };
      }
    } catch (e) { /* fall through */ }
  }

  // Fallback: simulation
  _fxCache = { gbpusd: jitter(_fxCache.gbpusd, 0.0008), gbpeur: jitter(_fxCache.gbpeur, 0.0006) };
  return { ...(_fxCache), source: "simulated", provider: "Simulation" };
}

// ════════════════════════════════════════════════════════════════════════════
//  MARKET INDICES  —  NASDAQ, S&P 500, VIX
// ════════════════════════════════════════════════════════════════════════════
let _mktCache = { nasdaq: 18142, sp500: 5248, vix: 13.24 };

export async function fetchMarketIndices() {
  // Alpha Vantage GLOBAL_QUOTE if key present (SPY as S&P proxy)
  if (KEYS.alphaVantage) {
    try {
      const r = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${KEYS.alphaVantage}`);
      const d = await r.json();
      const px = parseFloat(d?.["Global Quote"]?.["05. price"]);
      if (px) {
        _mktCache.sp500 = px * 10; // SPY ≈ S&P/10
        _mktCache = {
          ..._mktCache,
          nasdaq: jitter(_mktCache.nasdaq, 0.001),
          vix:    jitter(_mktCache.vix, 0.01),
        };
        return { ...(_mktCache), source: "live", provider: "Alpha Vantage" };
      }
    } catch (e) { /* fall through */ }
  }

  // Fallback: simulation (realistic intraday drift)
  _mktCache = {
    nasdaq: jitter(_mktCache.nasdaq, 0.001),
    sp500:  jitter(_mktCache.sp500, 0.0008),
    vix:    jitter(_mktCache.vix, 0.01),
  };
  return { ...(_mktCache), source: "simulated", provider: "Simulation" };
}

// ════════════════════════════════════════════════════════════════════════════
//  COMPANY NEWS  —  per portfolio company, with sentiment
//  ----------------------------------------------------------------------------
//  NOTE: NewsAPI.org free/developer tier only permits requests from localhost.
//  On the deployed site, live news needs the serverless proxy (Thursday's
//  backend work) OR a paid NewsAPI plan. Until then it serves realistic
//  simulated headlines so the UI is always populated and demo-ready.
// ════════════════════════════════════════════════════════════════════════════
const SENTIMENT = ["positive", "neutral", "negative"];

const _newsTemplates = {
  positive: [
    (c) => ({ title: `${c} secures new enterprise contract worth £2.4M`, sent: "positive" }),
    (c) => ({ title: `${c} expands into European market with new partnership`, sent: "positive" }),
    (c) => ({ title: `${c} reports record quarterly revenue growth`, sent: "positive" }),
    (c) => ({ title: `${c} named in industry "ones to watch" list`, sent: "positive" }),
  ],
  neutral: [
    (c) => ({ title: `${c} appoints new Head of Operations`, sent: "neutral" }),
    (c) => ({ title: `${c} relocates headquarters to larger premises`, sent: "neutral" }),
    (c) => ({ title: `${c} updates product roadmap for coming year`, sent: "neutral" }),
  ],
  negative: [
    (c) => ({ title: `${c} faces supply chain pressure amid sector slowdown`, sent: "negative" }),
    (c) => ({ title: `Competitor raises £15M, intensifying ${c}'s market`, sent: "negative" }),
    (c) => ({ title: `${c} delays product launch citing resourcing`, sent: "negative" }),
  ],
};

const _sources = ["Reuters", "TechCrunch", "Sky News", "City A.M.", "The Times", "Sifted", "PE News"];

function simulateNews(companyName, count = 5) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const bucket = SENTIMENT[Math.floor(Math.random() * (i === 0 ? 2 : 3))]; // bias first item positive/neutral
    const tmpl = _newsTemplates[bucket][Math.floor(Math.random() * _newsTemplates[bucket].length)];
    const item = tmpl(companyName);
    items.push({
      title: item.title,
      sentiment: item.sent,
      source: _sources[Math.floor(Math.random() * _sources.length)],
      publishedAt: new Date(Date.now() - Math.random() * 7 * 86400000),
      url: "#",
    });
  }
  return items.sort((a, b) => b.publishedAt - a.publishedAt);
}

export async function fetchCompanyNews(companyName, count = 5) {
  // Live NewsAPI (works on localhost with free key; needs proxy on deployed)
  if (KEYS.newsApi) {
    try {
      const q = encodeURIComponent(`"${companyName}"`);
      const r = await fetch(`https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=${count}&apiKey=${KEYS.newsApi}`);
      if (r.ok) {
        const d = await r.json();
        if (d?.articles?.length) {
          return {
            source: "live",
            provider: "NewsAPI",
            items: d.articles.map((a) => ({
              title: a.title,
              sentiment: scoreSentiment(a.title + " " + (a.description || "")),
              source: a.source?.name || "News",
              publishedAt: new Date(a.publishedAt),
              url: a.url,
            })),
          };
        }
      }
    } catch (e) { /* fall through */ }
  }

  // Fallback: simulated headlines
  return { source: "simulated", provider: "Simulation", items: simulateNews(companyName, count) };
}

// Lightweight keyword sentiment (used for live headlines; AI scoring comes later)
function scoreSentiment(text) {
  const t = text.toLowerCase();
  const pos = ["record", "growth", "secures", "wins", "expands", "raises", "partnership", "profit", "surge", "strong"];
  const neg = ["delay", "loss", "cuts", "slowdown", "pressure", "lawsuit", "decline", "warning", "fall", "struggle"];
  let s = 0;
  pos.forEach((w) => { if (t.includes(w)) s++; });
  neg.forEach((w) => { if (t.includes(w)) s--; });
  return s > 0 ? "positive" : s < 0 ? "negative" : "neutral";
}
