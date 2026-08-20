// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Counterparties
//  ----------------------------------------------------------------------------
//  Every company in the portfolio used to invoice the same eight customers:
//  Acme Corporation, Beta Holdings, TechVentures Ltd. A marine services business
//  in Abu Dhabi, a food manufacturer in Singapore and a UK payments company all
//  billing Acme is the single most obvious tell that a demo is a mock-up, and it
//  was visible on the receivables table of all nine Finance drill-downs.
//
//  So each company gets its own book, drawn from counterparties that belong in
//  its sector and its geography. The draw is seeded on the company id, so the
//  same company always shows the same customers in the same order — a partner
//  who opens Northstar Health twice sees one AR ledger, not two.
//
//  The names are invented. That is the point: nothing here should resolve to a
//  real business, and the sector and country are what make them read as real.
// ════════════════════════════════════════════════════════════════════════════

import { companyById } from "./companies.js";

/**
 * Counterparties by sector, then by region.
 *
 * Sector decides what kind of organisation buys from this company; region
 * decides what it is plausibly called. A HealthTech company in the UK sells to
 * trusts and clinical groups; a logistics company sells to retailers and
 * manufacturers.
 */
const BOOKS = {
  "B2B SaaS": {
    UK: ["Calder Financial Group", "Whitmore Retail", "Penrith Media", "Barrowfield Insurance",
         "Ludgate Property", "Tarn & Rowe", "Sefton Utilities", "Carrick Advisory"],
    UAE: ["Al Rayan Holdings", "Gulf Horizon Retail", "Emirates Ridge Logistics", "Sahara Petrochem",
          "Dune Capital Partners", "Falcon Point Media", "Marasi Property Group", "Zenith Gulf Trading"],
    default: ["Ashcombe Capital Group", "Halden Retail", "Corvus Media", "Ashgrove Insurance",
              "Latimer Property", "Rowan & Field", "Brackley Utilities", "Norwood Advisory"],
  },
  "B2B Software": {
    APAC: ["Harborline Insurance", "Kallang Manufacturing", "Vantage Health Network", "Orient Freight",
           "Caldera Energy", "Sentinel Assurance", "Northbay Media", "Aurum Wealth"],
    default: ["Harborline Insurance", "Vantage Health Network", "Caldera Energy", "Sentinel Assurance",
              "Northbay Media", "Aurum Wealth", "Kestrel Industrial", "Lyndhurst Group"],
  },
  FinTech: {
    UK: ["Ashby Building Society", "Northgate Payments", "Verity Lending", "Coleridge Wealth",
         "Bramford Credit Union", "Halstead Motor Finance", "Peregrine Bank", "Tilbury Mutual"],
    default: ["Northgate Payments", "Verity Lending", "Coleridge Wealth", "Peregrine Bank",
              "Halstead Motor Finance", "Tilbury Mutual", "Ashby Building Society", "Bramford Credit Union"],
  },
  Logistics: {
    UK: ["Hartwell Grocers", "Ridgeway Building Supplies", "Colwyn Pharmaceuticals", "Bexley Home Retail",
         "Marchmont Autoparts", "Stanmore Chilled Foods", "Kilbride Steel", "Fenwick Apparel"],
    default: ["Hartwell Grocers", "Ridgeway Building Supplies", "Colwyn Pharmaceuticals",
              "Bexley Home Retail", "Stanmore Chilled Foods", "Kilbride Steel", "Fenwick Apparel",
              "Drumlin Beverages"],
  },
  HealthTech: {
    UK: ["Ravensbourne Health Trust", "Ashwood Clinical Group", "Southfield Care Homes",
         "Priory Vale Diagnostics", "Larkfield GP Federation", "Menteith Hospice",
         "Westbrook Occupational Health", "Caldwell Pharmacy Group"],
    default: ["Ashwood Clinical Group", "Southfield Care Homes", "Priory Vale Diagnostics",
              "Larkfield Health Federation", "Westbrook Occupational Health", "Caldwell Pharmacy Group",
              "Menteith Hospice", "Ravensfield Medical Centre"],
  },
  Manufacturing: {
    UK: ["Draycott Automotive", "Halewood Aerospace Components", "Trentham Rail Systems",
         "Bewley Plant Hire", "Ferrers Engineering", "Kingsmoor Energy Plant", "Ormskirk Marine",
         "Padstow Defence Systems"],
    default: ["Draycott Automotive", "Halewood Aerospace Components", "Trentham Rail Systems",
              "Ferrers Engineering", "Kingsmoor Energy Plant", "Ormskirk Marine", "Bewley Plant Hire",
              "Padstow Defence Systems"],
  },
  Consumer: {
    APAC: ["Tanjong Grocers", "Selatan Convenience", "Puri Hotel Group", "Bandar Wholesale",
           "Cempaka Food Services", "Marina Bay Catering", "Lintang Retail", "Kemuning Distributors"],
    default: ["Tanjong Grocers", "Selatan Convenience", "Puri Hotel Group", "Bandar Wholesale",
              "Cempaka Food Services", "Lintang Retail", "Kemuning Distributors", "Marina Bay Catering"],
  },
  "Energy Services": {
    UAE: ["Sirdal Ridge Offshore", "Gulf Drilling Consortium", "Jebel Marine Terminal",
          "Khor Fakkan Port Authority", "Emirates Subsea Services", "Sirius Energy Gulf",
          "Al Dhafra Field Operations", "Mina Shipping Lines"],
    default: ["Gulf Drilling Consortium", "Jebel Marine Terminal", "Khor Fakkan Port Authority",
              "Emirates Subsea Services", "Sirius Energy Gulf", "Al Dhafra Field Operations",
              "Mina Shipping Lines", "Northern Offshore Marine"],
  },
};

/** Last-resort book, if a sector is added to the registry and not to this file. */
const FALLBACK = [
  "Ashcombe Capital Group", "Halden Retail", "Corvus Media", "Ashgrove Insurance",
  "Latimer Property", "Rowan & Field", "Brackley Utilities", "Norwood Advisory",
];

/** Region key from the registry's free-text geography. */
export function regionOf(geo = "") {
  if (/UAE|Dubai|Abu Dhabi|Saudi|Qatar/i.test(geo)) return "UAE";
  if (/Singapore|Indonesia|Malaysia|Jakarta|APAC|Hong Kong/i.test(geo)) return "APAC";
  if (/UK|United Kingdom|London|Manchester|Edinburgh/i.test(geo)) return "UK";
  return "default";
}

// ── Seeded shuffle ──────────────────────────────────────────────────────────

function seedFrom(key) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates, driven by a seeded generator so the order is reproducible. */
function shuffled(list, rng) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The customer book for one company.
 *
 * @param {string} id     company id from the registry
 * @param {number} count  how many names are needed
 * @returns {string[]}
 */
export function customerBook(id, count = 8) {
  const co = companyById(id);
  const sector = co?.sector ?? "B2B SaaS";
  const region = regionOf(co?.geo);
  const book = BOOKS[sector];
  const pool = book ? (book[region] ?? book.default ?? FALLBACK) : FALLBACK;

  const rng = makeRng(seedFrom(`alba:customers:${id}`));
  const order = shuffled(pool, rng);

  // If a caller wants more names than the sector book holds, top up from the
  // fallback rather than repeating one — a duplicated counterparty on an
  // aged-debt table is the kind of thing a CFO spots in three seconds.
  const out = order.slice(0, count);
  for (let i = 0; out.length < count; i++) {
    const extra = FALLBACK[i % FALLBACK.length];
    if (!out.includes(extra)) out.push(extra);
    else if (i > FALLBACK.length * 2) break;
  }
  return out;
}

/**
 * Per-company receivables shape.
 *
 * The AR ledger used to give every company the same five overdue balances at
 * the same five ages — 47, 38, 52, 33, 41 days — which put an identical
 * "52 days" alert on all nine companies. Both the split and the ages are now
 * drawn per company, within bands that keep the aged-debt profile sensible: one
 * account materially overdue, the rest spread across the 30–70 day range.
 *
 * @param {string} id
 * @param {number} n how many debtor lines
 */
export function debtorProfile(id, n = 5) {
  const rng = makeRng(seedFrom(`alba:debtors:${id}`));

  // Shares, drawn then normalised so they always sum to exactly 1.
  const raw = Array.from({ length: n }, (_, i) => 0.34 - i * 0.055 + (rng() - 0.5) * 0.05);
  const total = raw.reduce((t, v) => t + v, 0);
  const split = raw.map((v) => v / total);

  // Ages: the largest balance is the oldest more often than not, which is what
  // makes a receivables problem a receivables problem.
  const days = Array.from({ length: n }, (_, i) => {
    const base = 68 - i * 7;
    return Math.round(base + (rng() - 0.5) * 16);
  }).map((d) => Math.max(28, Math.min(96, d)));

  return { split, days };
}
