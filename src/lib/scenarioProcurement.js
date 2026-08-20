// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Scenario 5: cross-portfolio cost and procurement
//  ----------------------------------------------------------------------------
//  The only scenario that is impossible without the whole portfolio, which
//  makes it the strongest argument for a platform over a spreadsheet. Khaleej
//  alone carries three cloud contracts and two insurance policies; across nine
//  companies the same supplier appears under five different trading names and
//  nobody has ever seen the total.
//
//  Four steps, each inspectable, because "we found a million pounds of savings"
//  is a claim a CFO takes apart before believing:
//
//    1. Normalise vendor names that differ company to company
//    2. Classify spend into procurement categories
//    3. Aggregate across the portfolio
//    4. Apply named, quotable negotiation assumptions
//
//  The discipline that matters is what gets counted. Spend whose supplier
//  identity is only a candidate match is held OUT of the headline figure until
//  a person confirms it. Counting it would be the easy route to a bigger number
//  and the fast route to losing the room.
// ════════════════════════════════════════════════════════════════════════════

import { COMPANIES, companyById, financeOf } from "./companies.js";
import { makeInsight, evidence, CONFIDENCE } from "./insight.js";
import { SOURCES } from "./kpiDefinitions.js";
import { fmtMoney, convert } from "./fx.js";

const CCY = "GBP"; // cross-portfolio spend is only comparable restated

/**
 * Consolidation assumptions by category.
 *
 * `rate` is the discount assumed available on addressable spend when the
 * portfolio negotiates as one buyer. These are the first numbers a buyer will
 * challenge, so they live here as named parameters rather than inside a sum.
 */
export const CATEGORIES = {
  "Cloud & hosting":       { rate: 0.10, basis: "Committed-use discount at portfolio volume" },
  "Cybersecurity":         { rate: 0.12, basis: "Licence rationalisation and single-tenancy consolidation" },
  "Insurance":             { rate: 0.09, basis: "Portfolio-level placement rather than individual renewal" },
  "Software & SaaS":       { rate: 0.12, basis: "Enterprise agreement replacing per-company subscriptions" },
  "HR systems":            { rate: 0.15, basis: "Migration to one platform at portfolio headcount" },
  "Professional services": { rate: 0.07, basis: "Panel appointment with an agreed rate card" },
  "Telecoms":              { rate: 0.08, basis: "Aggregated connectivity and mobile estate" },
  "Freight & logistics":   { rate: 0.06, basis: "Consolidated lanes and volume tender" },
};

export const PARAMS = {
  minCompaniesForAction: 3,  // below this the coordination cost exceeds the saving
  rangeSensitivity: 0.15,
  implementationMonths: 9,   // to realise a full year of the saving across the portfolio
};

/** Categories billed per employee rather than as a share of revenue. */
const PER_EMPLOYEE = new Set(["HR systems", "Software & SaaS", "Cybersecurity"]);

/**
 * Suppliers used across the portfolio, with the name each company's ledger
 * actually carries. The variants are the entire point: the same supplier
 * appears several ways, which is why cross-company spend is invisible without
 * normalisation.
 *
 * `annualSpendPer` is per employee for per-employee categories, otherwise
 * basis points of annual revenue.
 */
const VENDORS = [
  { canonical: "Northwind Cloud", category: "Cloud & hosting", annualSpendPer: 62,
    contracts: [
      { company: "meridian",   ledgerName: "Northwind Cloud Services",           renewal: "2027-03-31" },
      { company: "payflo",     ledgerName: "NORTHWIND CLOUD SVCS (UK) LTD",      renewal: "2026-11-30" },
      { company: "straits",    ledgerName: "Northwind Cloud Svcs Pte",           renewal: "2026-12-31" },
      { company: "zafira",     ledgerName: "Northwind Cloud Services FZ-LLC",    renewal: "2027-02-28" },
      { company: "khaleej",    ledgerName: "Northwind Cloud",                    renewal: "2026-10-31" },
    ] },
  { canonical: "Aperture Compute", category: "Cloud & hosting", annualSpendPer: 41,
    contracts: [
      { company: "swiftlogix", ledgerName: "Aperture Compute Ltd",               renewal: "2027-01-31" },
      { company: "forgetech",  ledgerName: "Aperture Compute (UK)",              renewal: "2026-12-15" },
      { company: "khaleej",    ledgerName: "APERTURE COMPUTE MIDDLE EAST",       renewal: "2027-04-30" },
    ] },
  { canonical: "Sentinel Security", category: "Cybersecurity", annualSpendPer: 0.34,
    contracts: [
      { company: "meridian",   ledgerName: "Sentinel Security Ltd",              renewal: "2026-09-30" },
      { company: "payflo",     ledgerName: "Sentinel Security",                  renewal: "2026-11-30" },
      { company: "careos",     ledgerName: "Sentinel Sec. Ltd",                  renewal: "2027-01-31" },
      { company: "straits",    ledgerName: "Sentinel Security APAC Pte Ltd",     renewal: "2027-03-31" },
      { company: "zafira",     ledgerName: "Sentinel Security",                  renewal: "2026-12-31" },
    ] },
  { canonical: "Calder Underwriting", category: "Insurance", annualSpendPer: 78,
    contracts: [
      { company: "forgetech",  ledgerName: "Calder Underwriting plc",            renewal: "2026-10-01" },
      { company: "swiftlogix", ledgerName: "Calder Underwriting",                renewal: "2026-10-01" },
      { company: "khaleej",    ledgerName: "Calder Underwriting (Gulf) Ltd",     renewal: "2027-01-01" },
      { company: "nusantara",  ledgerName: "CALDER UNDERWRITING ASIA",           renewal: "2026-11-01" },
    ] },
  { canonical: "Meridian Marine Mutual", category: "Insurance", annualSpendPer: 54,
    contracts: [
      { company: "khaleej",    ledgerName: "Meridian Marine Mutual Assoc.",      renewal: "2027-02-01" },
      { company: "swiftlogix", ledgerName: "Meridian Marine Mutual",             renewal: "2026-12-01" },
    ] },
  { canonical: "Lattice Workspace", category: "Software & SaaS", annualSpendPer: 0.41,
    contracts: [
      { company: "meridian",   ledgerName: "Lattice Workspace Inc",              renewal: "2026-09-30" },
      { company: "payflo",     ledgerName: "Lattice Workspace",                  renewal: "2026-09-30" },
      { company: "careos",     ledgerName: "Lattice Workspace Inc.",             renewal: "2027-02-28" },
      { company: "forgetech",  ledgerName: "LATTICE WORKSPACE INC",              renewal: "2026-11-30" },
      { company: "straits",    ledgerName: "Lattice Workspace Asia",             renewal: "2027-01-31" },
      { company: "zafira",     ledgerName: "Lattice Workspace",                  renewal: "2026-10-31" },
    ] },
  { canonical: "Rowan People", category: "HR systems", annualSpendPer: 0.19,
    contracts: [
      { company: "swiftlogix", ledgerName: "Rowan People Ltd",                   renewal: "2027-03-31" },
      { company: "forgetech",  ledgerName: "Rowan People",                       renewal: "2026-12-31" },
      { company: "nusantara",  ledgerName: "Rowan People (SEA) Pte",             renewal: "2027-01-31" },
      { company: "khaleej",    ledgerName: "Rowan HR",                           renewal: "2026-11-30" },
    ] },
  { canonical: "Thorne & Vale", category: "Professional services", annualSpendPer: 96,
    contracts: [
      { company: "payflo",     ledgerName: "Thorne & Vale LLP",                  renewal: "2027-03-31" },
      { company: "forgetech",  ledgerName: "Thorne and Vale LLP",                renewal: "2027-03-31" },
      { company: "zafira",     ledgerName: "Thorne & Vale (Middle East)",        renewal: "2026-12-31" },
      { company: "straits",    ledgerName: "Thorne & Vale LLP",                  renewal: "2027-03-31" },
    ] },
  { canonical: "Halcyon Telecom", category: "Telecoms", annualSpendPer: 29,
    contracts: [
      { company: "meridian",   ledgerName: "Halcyon Telecom UK",                 renewal: "2026-10-31" },
      { company: "careos",     ledgerName: "Halcyon Telecom",                    renewal: "2026-10-31" },
      { company: "nusantara",  ledgerName: "Halcyon Telecom SG",                 renewal: "2027-02-28" },
    ] },
  { canonical: "Cormorant Freight", category: "Freight & logistics", annualSpendPer: 210,
    contracts: [
      { company: "swiftlogix", ledgerName: "Cormorant Freight Services Ltd",     renewal: "2026-12-31" },
      { company: "forgetech",  ledgerName: "Cormorant Freight",                  renewal: "2027-01-31" },
      { company: "nusantara",  ledgerName: "CORMORANT FREIGHT (ASIA) PTE LTD",   renewal: "2026-11-30" },
    ] },
];

// ── Name normalisation ──────────────────────────────────────────────────────

const NOISE = new Set([
  "ltd", "limited", "llp", "plc", "inc", "incorporated", "llc", "pte", "pty",
  "gmbh", "bv", "sa", "ag", "co", "company", "corp", "corporation", "holdings",
  "group", "services", "service", "svcs", "svc", "and", "the", "fz", "fzllc",
  "uk", "sg", "asia", "apac", "sea", "gulf", "me", "assoc", "association",
]);

/** Strip legal form, punctuation and geography down to the brand tokens. */
export function normaliseVendorName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[&]/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !NOISE.has(t))
    .join(" ")
    .trim();
}

/**
 * How confident the match is, and therefore whether a person has to look.
 *
 * `exact` and `normalised` are safe to aggregate automatically. `review` shares
 * the brand token but differs beyond it — plausibly a different legal entity,
 * a different contract, or a genuinely different supplier.
 */
export function matchQuality(reference, candidate) {
  if (reference === candidate) return "exact";
  const a = normaliseVendorName(reference);
  const b = normaliseVendorName(candidate);
  if (a === b) return "normalised";
  const at = new Set(a.split(" ")), bt = new Set(b.split(" "));
  const shared = [...at].filter((t) => bt.has(t)).length;
  if (shared === 0) return "different";
  return shared >= Math.max(at.size, bt.size) ? "normalised" : "review";
}

// ── Spend ───────────────────────────────────────────────────────────────────

/**
 * Annual spend for one contract, in the reporting currency.
 *
 * Derived from the company's own size — headcount for per-seat categories,
 * revenue for the rest — so a company's vendor spend moves when its figures do
 * rather than being a second set of numbers to keep in step.
 */
function contractSpend(vendor, companyId) {
  const co = companyById(companyId);
  const f = financeOf(companyId);
  if (!co || !f) return 0;
  const annualRevenueGbp = convert(f.revenueK * 12, co.currency, CCY);
  return PER_EMPLOYEE.has(vendor.category)
    ? Math.round(co.headcount * vendor.annualSpendPer)
    : Math.round((annualRevenueGbp * vendor.annualSpendPer) / 10000);
}

export function buildVendorMatrix() {
  return VENDORS.map((v) => {
    const contracts = v.contracts.map((c) => {
      const co = companyById(c.company);
      return {
        ...c,
        companyName: co?.name ?? c.company,
        annualSpend: contractSpend(v, c.company),
        normalisedTo: normaliseVendorName(c.ledgerName),
      };
    });

    // Grade every variant against the most common spelling in the ledger.
    const counts = new Map();
    for (const c of contracts) counts.set(c.normalisedTo, (counts.get(c.normalisedTo) ?? 0) + 1);
    const reference = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
    const referenceName = contracts.find((c) => c.normalisedTo === reference).ledgerName;

    const graded = contracts.map((c) => ({ ...c, quality: matchQuality(referenceName, c.ledgerName) }));
    const needsReview = graded.filter((g) => g.quality === "review" || g.quality === "different");

    const totalSpend = graded.reduce((t, g) => t + g.annualSpend, 0);
    const confirmedSpend = graded.filter((g) => !needsReview.includes(g)).reduce((t, g) => t + g.annualSpend, 0);

    return {
      canonical: v.canonical,
      category: v.category,
      companies: graded.length,
      contracts: graded,
      ledgerVariants: [...new Set(graded.map((g) => g.ledgerName))],
      referenceName,
      totalSpend,
      confirmedSpend,
      pendingSpend: totalSpend - confirmedSpend,
      autoMatched: graded.length - needsReview.length,
      needsReview,
      earliestRenewal: graded.map((g) => g.renewal).sort()[0],
      addressable: graded.length >= PARAMS.minCompaniesForAction,
    };
  }).sort((a, b) => b.totalSpend - a.totalSpend);
}

export function buildProcurement() {
  const vendors = buildVendorMatrix();
  const money = (v) => fmtMoney(v, CCY, { k: true });

  const totalSpend = vendors.reduce((t, v) => t + v.totalSpend, 0);
  const addressable = vendors.filter((v) => v.addressable);
  const belowThreshold = vendors.filter((v) => !v.addressable);

  const confirmedSpend = addressable.reduce((t, v) => t + v.confirmedSpend, 0);
  const pendingSpend = addressable.reduce((t, v) => t + v.pendingSpend, 0);

  const reviewQueue = addressable.flatMap((v) =>
    v.needsReview.map((g) => ({
      supplier: v.canonical, category: v.category,
      company: g.companyName, ledgerName: g.ledgerName,
      annualSpend: g.annualSpend, matchedAgainst: v.referenceName,
      reason: "Same brand token, different trading name — confirm this is one supplier",
    })),
  ).sort((a, b) => b.annualSpend - a.annualSpend);

  const byCategory = Object.keys(CATEGORIES).map((category) => {
    const inCategory = addressable.filter((v) => v.category === category);
    if (!inCategory.length) return null;
    const spend = inCategory.reduce((t, v) => t + v.confirmedSpend, 0);
    const pending = inCategory.reduce((t, v) => t + v.pendingSpend, 0);
    const companies = new Set(inCategory.flatMap((v) => v.contracts.map((c) => c.company)));
    const { rate, basis } = CATEGORIES[category];
    return {
      category, spend, pendingSpend: pending,
      companies: companies.size, vendors: inCategory.length,
      rate, basis,
      saving: Math.round(spend * rate),
      savingIfConfirmed: Math.round(pending * rate),
      earliestRenewal: inCategory.map((v) => v.earliestRenewal).sort()[0],
    };
  }).filter(Boolean).sort((a, b) => b.saving - a.saving);

  const saving = byCategory.reduce((t, c) => t + c.saving, 0);
  const savingIfConfirmed = byCategory.reduce((t, c) => t + c.savingIfConfirmed, 0);
  const low = Math.round(saving * (1 - PARAMS.rangeSensitivity));
  const high = Math.round(saving * (1 + PARAMS.rangeSensitivity));

  // Renewals inside twelve months are the only ones actionable this year: a
  // contract cannot be renegotiated on a date that has passed.
  const nextRenewals = addressable
    .map((v) => ({ supplier: v.canonical, category: v.category, renewal: v.earliestRenewal,
                   spend: v.confirmedSpend, companies: v.companies }))
    .sort((a, b) => a.renewal.localeCompare(b.renewal))
    .slice(0, 6);

  const spread = vendors.filter((v) => v.ledgerVariants.length > 1);
  const worstSpread = spread.slice().sort((a, b) => b.ledgerVariants.length - a.ledgerVariants.length)[0];

  const insight = makeInsight({
    id: "procurement-portfolio",
    type: "opportunity",
    companyId: "portfolio",
    companyName: "Caledonia Alba portfolio",
    headline: `${money(saving)} a year available on ${money(confirmedSpend)} of confirmed common supplier spend`,
    whatHappened:
      `${vendors.length} suppliers are used by more than one portfolio company, carrying ${money(totalSpend)} of ` +
      `annual spend across ${COMPANIES.length} companies. ${spread.length} of them appear under more than one ` +
      `name in the ledgers — ${worstSpread.canonical} under ${worstSpread.ledgerVariants.length} — so no single ` +
      `company has ever seen the portfolio total.`,
    whyItMatters:
      `${addressable.length} suppliers are used by ${PARAMS.minCompaniesForAction} or more companies, which is ` +
      `where negotiating as one buyer is worth the coordination. On confirmed spend alone the saving is ` +
      `${money(saving)} a year, ${money(low)} to ${money(high)}. A further ${money(savingIfConfirmed)} sits behind ` +
      `${reviewQueue.length} supplier records a person still has to confirm, and is deliberately excluded from ` +
      `the headline.`,
    evidence: [
      evidence("Common supplier spend", money(totalSpend), SOURCES.accounting, "2026-05",
        { definition: `Annual spend with suppliers used by more than one company, restated into ${CCY}` }),
      evidence("Addressable spend", `${money(confirmedSpend)} across ${addressable.length} suppliers`, SOURCES.accounting, "2026-05",
        { definition: `Confirmed matches only, suppliers used by ${PARAMS.minCompaniesForAction}+ companies` }),
      evidence("Held pending human confirmation", `${money(pendingSpend)} across ${reviewQueue.length} records`, SOURCES.alba, "2026-05",
        { queue: reviewQueue.slice(0, 5) }),
      evidence("Suppliers appearing under multiple ledger names", `${spread.length} of ${vendors.length}`, SOURCES.accounting, "2026-05",
        { worst: { supplier: worstSpread.canonical, variants: worstSpread.ledgerVariants } }),
      evidence("Next renewal", `${nextRenewals[0].supplier} on ${nextRenewals[0].renewal}`, SOURCES.accounting, "2026-05",
        { upcoming: nextRenewals }),
      evidence("Estimated annual saving", `${money(saving)} (${money(low)}–${money(high)})`, SOURCES.alba, "2026-05",
        { rates: byCategory.map((c) => ({ category: c.category, rate: c.rate, basis: c.basis })) }),
    ],
    impact: {
      measure: "Annual procurement saving across the portfolio",
      value: saving, currency: CCY, direction: "upside",
      horizon: `Realised over ${PARAMS.implementationMonths} months as contracts reach renewal`,
    },
    confidence: CONFIDENCE.MEDIUM,
    methodology:
      "Vendor names are normalised by stripping legal form, punctuation and geography to brand tokens, then " +
      "graded against the most common spelling. Exact and normalised matches aggregate automatically; anything " +
      "sharing only part of the brand is queued for a person and its spend is excluded from the headline figure. " +
      "Spend per contract is derived from each company's own headcount or revenue and restated into " +
      `${CCY} at pinned rates. Category discount rates are named assumptions, listed against every figure they ` +
      "produce, and the range is the headline plus or minus " +
      `${(PARAMS.rangeSensitivity * 100).toFixed(0)}%.`,
    actions: [
      { action: `Confirm the ${reviewQueue.length} queued supplier records to release ${money(savingIfConfirmed)} of further saving`,
        owner: "Portfolio Operations", due: "19 Jun 2026",
        rationale: `Largest is ${reviewQueue[0]?.company} — ${reviewQueue[0]?.ledgerName} at ${money(reviewQueue[0]?.annualSpend ?? 0)}.` },
      { action: `Open a portfolio tender for ${byCategory[0].category} ahead of the ${byCategory[0].earliestRenewal} renewal`,
        owner: "Portfolio Operations", due: "30 Jun 2026",
        rationale: `${money(byCategory[0].saving)} a year, the largest single category, across ${byCategory[0].companies} companies.` },
      { action: `Consolidate ${worstSpread.canonical} onto one master agreement`,
        owner: "Portfolio Operations", due: "31 Jul 2026",
        rationale: `${worstSpread.ledgerVariants.length} ledger names, ${worstSpread.companies} companies, ${money(worstSpread.totalSpend)} a year.` },
      { action: "Adopt one supplier naming standard across portfolio company ledgers",
        owner: "Chief Financial Officer, portfolio", due: "30 Sep 2026",
        rationale: "The normalisation step exists because the ledgers disagree. Fixing the cause removes the review queue." },
    ],
    drillDown: { vendors, byCategory, reviewQueue, nextRenewals },
  });

  return {
    currency: CCY, vendors, addressable, belowThreshold, byCategory, reviewQueue, nextRenewals,
    totals: {
      totalSpend, confirmedSpend, pendingSpend,
      saving, savingIfConfirmed, low, high,
      suppliers: vendors.length, addressableSuppliers: addressable.length,
      companies: COMPANIES.length,
    },
    insight,
  };
}
